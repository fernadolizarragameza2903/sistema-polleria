const { Venta, DetalleVenta, Producto, Cliente, Usuario, Caja, InventarioMovimiento, sequelize } = require('../models');
const audit = require('../helpers/audit');
const { imprimirTicket } = require('../services/printerService');
const { enviarAlertaStock } = require('../services/emailService');

const { Op } = require('sequelize');

const getAll = async (req, res) => {
    try {
        const { desde, hasta, tipo_venta, metodo_pago, estado, cliente_id } = req.query;
        const where = {};
        if (desde && hasta) where.created_at = { [Op.between]: [new Date(desde), new Date(hasta + 'T23:59:59')] };
        if (tipo_venta) where.tipo_venta = tipo_venta;
        if (metodo_pago) where.metodo_pago = metodo_pago;
        if (estado) where.estado = estado;
        if (cliente_id) where.cliente_id = cliente_id;

        const ventas = await Venta.findAll({
            where,
            include: [
                { model: Cliente, as: 'cliente', attributes: ['id', 'nombre', 'documento_numero'] },
                { model: Usuario, as: 'usuario', attributes: ['id', 'nombre'] },
                { model: DetalleVenta, as: 'detalles', include: [{ model: Producto, as: 'producto', attributes: ['id', 'nombre'] }] },
            ],
            order: [['created_at', 'DESC']],
        });
        res.json({ ok: true, ventas });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

const create = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { tipo_comprobante, tipo_venta, cliente_id, caja_id, subtotal, igv, descuento, total, metodo_pago, monto_recibido, vuelto, observaciones, detalles } = req.body;

        // Generar número de comprobante
        const count = await Venta.count();
        const numero = `T-${String(count + 1).padStart(6, '0')}`;

        const venta = await Venta.create({
            numero_comprobante: numero,
            tipo_comprobante, tipo_venta, cliente_id, caja_id,
            usuario_id: req.user.id,
            subtotal, igv, descuento, total, metodo_pago, monto_recibido, vuelto, observaciones,
        }, { transaction: t });

        for (const d of detalles) {
            await DetalleVenta.create({
                venta_id: venta.id,
                producto_id: d.producto_id,
                cantidad: d.cantidad,
                precio_unitario: d.precio_unitario,
                descuento: d.descuento || 0,
                subtotal: d.subtotal,
            }, { transaction: t });

            // Descontar stock
            const prod = await Producto.findByPk(d.producto_id, { transaction: t });
            if (prod) {
                const stockAnterior = prod.stock;
                const stockNuevo = stockAnterior - d.cantidad;
                await prod.update({ stock: stockNuevo }, { transaction: t });

                // Alerta asíncrona si cae al umbral mínimo
                if (stockAnterior > prod.stock_minimo && stockNuevo <= prod.stock_minimo) {
                    enviarAlertaStock(prod, stockNuevo);
                }
                await InventarioMovimiento.create({
                    producto_id: d.producto_id,
                    tipo: 'salida',
                    cantidad: d.cantidad,
                    stock_anterior: stockAnterior,
                    stock_nuevo: stockNuevo,
                    motivo: `Venta ${numero}`,
                    referencia_id: venta.id,
                    referencia_tipo: 'venta',
                    usuario_id: req.user.id,
                }, { transaction: t });
            }
        }

        // Otorgar puntos de fidelidad si hay cliente (1 punto por cada 10 de total)
        if (cliente_id) {
            const clienteObj = await Cliente.findByPk(cliente_id, { transaction: t });
            if (clienteObj) {
                const puntosGanados = Math.floor(parseFloat(total) / 10);
                if (puntosGanados > 0) {
                    await clienteObj.increment('puntos', { by: puntosGanados, transaction: t });
                }
            }
        }

        await t.commit();
        res.status(201).json({ ok: true, venta: { ...venta.toJSON(), numero_comprobante: numero } });

        await audit({ usuario_id: req.user.id, accion: 'VENTA_CREAR', modulo: 'ventas', descripcion: `Venta registrada: ${numero} por S/. ${total}`, ip: req.ip, datos: { venta_id: venta.id, total } });
    } catch (err) {
        await t.rollback();
        await audit({ usuario_id: req.user.id, accion: 'VENTA_CREAR', modulo: 'ventas', descripcion: `Error al crear venta: ${err.message}`, ip: req.ip, resultado: 'error' });
        res.status(500).json({ ok: false, msg: err.message });

    }
};

const anular = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const venta = await Venta.findByPk(req.params.id, {
            include: [{ model: DetalleVenta, as: 'detalles' }],
            transaction: t,
        });
        if (!venta) { await t.rollback(); return res.status(404).json({ ok: false, msg: 'Venta no encontrada' }); }
        if (venta.estado !== 'completada') { await t.rollback(); return res.status(400).json({ ok: false, msg: 'Solo se pueden anular ventas completadas' }); }

        // Restituir stock de cada producto
        for (const d of venta.detalles) {
            const prod = await Producto.findByPk(d.producto_id, { transaction: t });
            if (prod) {
                const stockAnterior = parseFloat(prod.stock);
                const stockNuevo = stockAnterior + parseFloat(d.cantidad);
                await prod.update({ stock: stockNuevo }, { transaction: t });
                await InventarioMovimiento.create({
                    producto_id: d.producto_id,
                    tipo: 'entrada',
                    cantidad: d.cantidad,
                    stock_anterior: stockAnterior,
                    stock_nuevo: stockNuevo,
                    motivo: `Anulación venta ${venta.numero_comprobante}`,
                    referencia_id: venta.id,
                    referencia_tipo: 'anulacion_venta',
                    usuario_id: req.user.id,
                }, { transaction: t });
            }
        }

        await venta.update({ estado: 'anulada' }, { transaction: t });
        await t.commit();
        res.json({ ok: true, msg: 'Venta anulada y stock restituido correctamente' });

        await audit({ usuario_id: req.user.id, accion: 'VENTA_ANULAR', modulo: 'ventas', descripcion: `Venta anulada: ${venta.numero_comprobante}`, ip: req.ip, datos: { venta_id: venta.id } });
    } catch (err) {
        await t.rollback();
        await audit({ usuario_id: req.user.id, accion: 'VENTA_ANULAR', modulo: 'ventas', descripcion: `Error al anular venta: ${err.message}`, ip: req.ip, resultado: 'error' });
        res.status(500).json({ ok: false, msg: err.message });

    }
};

const getResumenDia = async (req, res) => {
    try {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const fin = new Date();
        fin.setHours(23, 59, 59, 999);

        const [total, porMetodo, porTipo] = await Promise.all([
            Venta.findAll({
                where: { created_at: { [Op.between]: [hoy, fin] }, estado: 'completada' },
                attributes: [[sequelize.fn('SUM', sequelize.col('total')), 'total_dia'], [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad']],
                raw: true,
            }),
            Venta.findAll({
                where: { created_at: { [Op.between]: [hoy, fin] }, estado: 'completada' },
                attributes: ['metodo_pago', [sequelize.fn('SUM', sequelize.col('total')), 'total'], [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad']],
                group: ['metodo_pago'],
                raw: true,
            }),
            Venta.findAll({
                where: { created_at: { [Op.between]: [hoy, fin] }, estado: 'completada' },
                attributes: ['tipo_venta', [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad']],
                group: ['tipo_venta'],
                raw: true,
            }),
        ]);

        res.json({ ok: true, resumen: { total: total[0], porMetodo, porTipo } });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

const imprimirDirecto = async (req, res) => {
    try {
        const venta = await Venta.findByPk(req.params.id, {
            include: [
                { model: Cliente, as: 'cliente', attributes: ['nombre', 'documento_numero'] },
                { model: DetalleVenta, as: 'detalles', include: [{ model: Producto, as: 'producto', attributes: ['nombre'] }] },
            ]
        });

        if (!venta) return res.status(404).json({ ok: false, msg: 'Venta no encontrada' });

        // Llamar servicio de impresión térmica
        const { ok, msg } = await imprimirTicket(venta, { reImpresion: req.query.reimpresion === 'true' });

        if (!ok) {
            return res.status(500).json({ ok: false, msg });
        }

        res.json({ ok: true, msg: 'Ticket envíado a la impresora correctamente' });
    } catch (err) {
        console.error('Error al imprimir venta:', err);
        res.status(500).json({ ok: false, msg: 'Error interno en el servicio de impresión' });
    }
};

module.exports = { getAll, create, anular, getResumenDia, imprimirDirecto };
