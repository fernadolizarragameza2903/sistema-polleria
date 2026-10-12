const { Venta, DetalleVenta, Producto, Cliente, Usuario, Caja, Pedido, sequelize } = require('../models');
const audit = require('../helpers/audit');
const { imprimirTicket } = require('../services/printerService');
const { descontarStock, restituirStock, otorgarPuntos } = require('../services/stockService');
const { normalizarDatosPedido, crearPedidoDeVenta } = require('../services/pedidoService');
const { rangoUTC, esFechaValida } = require('../helpers/fechasNegocio');

const { Op } = require('sequelize');

const LIMITE_POR_DEFECTO = 25;
const LIMITE_MAXIMO = 100;

// Columnas que necesita la tabla del historial (sin TEXT ni detalle de productos).
const COLUMNAS_LISTADO = ['id', 'numero_comprobante', 'tipo_venta', 'cliente_id', 'total', 'metodo_pago', 'estado', 'created_at'];

/** Construye el WHERE del historial a partir de los filtros del query string. */
function filtrosHistorial({ desde, hasta, tipo_venta, metodo_pago, estado, cliente_id, q }) {
    const where = {};
    if (esFechaValida(desde) || esFechaValida(hasta)) {
        const { inicio, fin } = rangoUTC(esFechaValida(desde) ? desde : '2000-01-01', esFechaValida(hasta) ? hasta : '2999-12-31');
        where.created_at = { [Op.between]: [inicio, fin] };
    }
    if (tipo_venta) where.tipo_venta = tipo_venta;
    if (metodo_pago) where.metodo_pago = metodo_pago;
    if (estado) where.estado = estado;
    if (cliente_id) where.cliente_id = cliente_id;

    const termino = String(q || '').trim();
    if (termino) {
        // Busca por comprobante o por nombre (cliente registrado o nombre dado en el delivery).
        where[Op.or] = [
            { numero_comprobante: { [Op.like]: `%${termino}%` } },
            { '$cliente.nombre$': { [Op.like]: `%${termino}%` } },
            { '$Pedido.contacto_nombre$': { [Op.like]: `%${termino}%` } },
        ];
    }
    return where;
}

/**
 * GET /api/ventas?page=1&limit=25&desde&hasta&estado&tipo_venta&metodo_pago&cliente_id&q
 * Historial paginado en el servidor. El detalle de productos se pide aparte (GET /ventas/:id).
 */
const getAll = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit) || LIMITE_POR_DEFECTO, 1), LIMITE_MAXIMO);
        const where = filtrosHistorial(req.query);

        // Joins 1-a-1 (belongsTo / hasOne): no multiplican filas, así el COUNT es exacto.
        const include = [
            { model: Cliente, as: 'cliente', attributes: ['id', 'nombre'] },
            { model: Usuario, as: 'usuario', attributes: ['id', 'nombre'] },
            { model: Pedido, attributes: ['id', 'numero_pedido', 'estado', 'canal', 'contacto_nombre', 'contacto_telefono'] },
        ];

        const [{ rows, count }, totales] = await Promise.all([
            Venta.findAndCountAll({
                where, include,
                attributes: COLUMNAS_LISTADO,
                order: [['created_at', 'DESC'], ['id', 'DESC']],
                limit, offset: (page - 1) * limit,
            }),
            Venta.findOne({
                where,
                include: include.map(i => ({ ...i, attributes: [] })),
                attributes: [
                    [sequelize.literal("SUM(CASE WHEN `Venta`.`estado` = 'completada' THEN `Venta`.`total` ELSE 0 END)"), 'total'],
                ],
                raw: true,
            }),
        ]);

        res.json({
            ok: true,
            ventas: rows,
            paginacion: { page, limit, total: count, paginas: Math.max(Math.ceil(count / limit), 1) },
            resumen: { monto_completadas: parseFloat(totales?.total || 0) },
        });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

/** GET /api/ventas/:id — venta con su detalle y, si es delivery, su pedido. */
const getOne = async (req, res) => {
    try {
        const venta = await Venta.findByPk(req.params.id, {
            include: [
                { model: Cliente, as: 'cliente', attributes: ['id', 'nombre', 'documento_numero', 'telefono'] },
                { model: Usuario, as: 'usuario', attributes: ['id', 'nombre'] },
                { model: DetalleVenta, as: 'detalles', include: [{ model: Producto, as: 'producto', attributes: ['id', 'nombre'] }] },
                { model: Pedido },
            ],
        });
        if (!venta) return res.status(404).json({ ok: false, msg: 'Venta no encontrada' });
        res.json({ ok: true, venta });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

const create = async (req, res) => {
    const { tipo_comprobante, tipo_venta, cliente_id, subtotal, igv, descuento, total, metodo_pago, observaciones, detalles } = req.body;
    const esDelivery = tipo_venta === 'delivery';

    // Validaciones antes de abrir la transacción
    if (!Array.isArray(detalles) || detalles.length === 0) {
        return res.status(400).json({ ok: false, msg: 'La venta no tiene productos' });
    }
    let datosPedido = null;
    if (esDelivery) {
        const { datos, error } = normalizarDatosPedido(req.body.pedido);
        if (error) return res.status(400).json({ ok: false, msg: error });
        datosPedido = datos;
    }

    // Pago: en efectivo se registra con cuánto paga; con otros medios, el monto exacto.
    const totalNum = parseFloat(total) || 0;
    const esEfectivo = metodo_pago === 'efectivo';
    let monto_recibido = esEfectivo ? parseFloat(req.body.monto_recibido) || 0 : totalNum;
    if (esEfectivo && esDelivery && monto_recibido === 0) monto_recibido = totalNum; // "paga exacto"
    if (esEfectivo && monto_recibido < totalNum) {
        return res.status(400).json({ ok: false, msg: `El monto recibido (S/. ${monto_recibido.toFixed(2)}) no cubre el total (S/. ${totalNum.toFixed(2)})` });
    }
    const vuelto = esEfectivo ? +(monto_recibido - totalNum).toFixed(2) : 0;

    const t = await sequelize.transaction();
    try {
        // La caja la decide el servidor: siempre la que está abierta.
        const caja = await Caja.findOne({ where: { estado: 'abierta' }, transaction: t });
        if (!caja) {
            await t.rollback();
            return res.status(400).json({ ok: false, msg: 'Debes abrir la caja antes de registrar ventas' });
        }

        // Generar número de comprobante
        const count = await Venta.count({ transaction: t });
        const numero = `T-${String(count + 1).padStart(6, '0')}`;

        const venta = await Venta.create({
            numero_comprobante: numero,
            tipo_comprobante, tipo_venta, cliente_id: cliente_id || null, caja_id: caja.id,
            usuario_id: req.user.id,
            subtotal, igv, descuento, total: totalNum, metodo_pago, monto_recibido, vuelto, observaciones,
            // Un delivery queda pendiente hasta que el repartidor lo entrega y cobra.
            estado: esDelivery ? 'pendiente' : 'completada',
        }, { transaction: t });

        await DetalleVenta.bulkCreate(detalles.map(d => ({
            venta_id: venta.id,
            producto_id: d.producto_id,
            cantidad: d.cantidad,
            precio_unitario: d.precio_unitario,
            descuento: d.descuento || 0,
            subtotal: d.subtotal,
        })), { transaction: t });

        await descontarStock({ detalles, venta, usuario_id: req.user.id, transaction: t });

        let pedido = null;
        if (esDelivery) pedido = await crearPedidoDeVenta({ venta, datos: datosPedido, usuario_id: req.user.id, transaction: t });
        else await otorgarPuntos({ venta, transaction: t });

        await t.commit();
        res.status(201).json({ ok: true, venta: venta.toJSON(), pedido });

        await audit({ usuario_id: req.user.id, accion: 'VENTA_CREAR', modulo: 'ventas', descripcion: `Venta registrada: ${numero} por S/. ${totalNum.toFixed(2)}${pedido ? ` (delivery ${pedido.numero_pedido})` : ''}`, ip: req.ip, datos: { venta_id: venta.id, total: totalNum } });
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
            include: [{ model: DetalleVenta, as: 'detalles' }, { model: Pedido }],
            transaction: t,
        });
        if (!venta) { await t.rollback(); return res.status(404).json({ ok: false, msg: 'Venta no encontrada' }); }
        if (venta.estado === 'anulada') { await t.rollback(); return res.status(400).json({ ok: false, msg: 'La venta ya está anulada' }); }

        await restituirStock({ venta, usuario_id: req.user.id, transaction: t });
        await venta.update({ estado: 'anulada' }, { transaction: t });
        // Si era un delivery en curso, el pedido también se cancela.
        if (venta.Pedido && venta.Pedido.estado !== 'entregado') {
            await venta.Pedido.update({ estado: 'cancelado' }, { transaction: t });
        }
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

module.exports = { getAll, getOne, create, anular, getResumenDia, imprimirDirecto };
