const { Venta, DetalleVenta, Producto, Compra, DetalleCompra, Cliente, sequelize } = require('../models');
const { Op } = require('sequelize');

const getResumenGeneral = async (req, res) => {
    try {
        const { desde, hasta } = req.query;
        const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
        const fin = new Date(); fin.setHours(23, 59, 59, 999);
        const f1 = desde ? new Date(desde) : hoy;
        const f2 = hasta ? new Date(hasta + 'T23:59:59') : fin;

        const [totalVentas, ventasPorDia, topProductos, ventasPorMetodo] = await Promise.all([
            Venta.findAll({
                where: { created_at: { [Op.between]: [f1, f2] }, estado: 'completada' },
                attributes: [[sequelize.fn('SUM', sequelize.col('total')), 'total_sum'], [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
                raw: true,
            }),
            Venta.findAll({
                where: { created_at: { [Op.between]: [f1, f2] }, estado: 'completada' },
                attributes: [[sequelize.fn('DATE', sequelize.col('created_at')), 'dia'], [sequelize.fn('SUM', sequelize.col('total')), 'total'], [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
                group: [sequelize.fn('DATE', sequelize.col('created_at'))],
                order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'ASC']],
                raw: true,
            }),
            DetalleVenta.findAll({
                include: [{ model: Producto, as: 'producto', attributes: ['nombre'] }, { model: Venta, attributes: [], where: { created_at: { [Op.between]: [f1, f2] }, estado: 'completada' } }],
                attributes: ['producto_id', [sequelize.fn('SUM', sequelize.col('DetalleVenta.cantidad')), 'total_cantidad'], [sequelize.fn('SUM', sequelize.col('DetalleVenta.subtotal')), 'total_ventas']],
                group: ['producto_id', 'producto.nombre'],
                order: [[sequelize.fn('SUM', sequelize.col('DetalleVenta.cantidad')), 'DESC']],
                limit: 10,
                raw: true,
                nest: true,
            }),
            Venta.findAll({
                where: { created_at: { [Op.between]: [f1, f2] }, estado: 'completada' },
                attributes: ['metodo_pago', [sequelize.fn('SUM', sequelize.col('total')), 'total'], [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
                group: ['metodo_pago'],
                raw: true,
            }),
        ]);

        const totalClientes = await Cliente.count({ where: { activo: 1 } });

        res.json({ ok: true, data: { totalVentas: totalVentas[0], ventasPorDia, topProductos, ventasPorMetodo, totalClientes } });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

const getRentabilidad = async (req, res) => {
    try {
        const { desde, hasta } = req.query;
        const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
        const fin = new Date(); fin.setHours(23, 59, 59, 999);
        const f1 = desde ? new Date(desde) : new Date(new Date().setDate(1));
        const f2 = hasta ? new Date(hasta + 'T23:59:59') : fin;

        const [ventasRes, comprasRes, margenProductos] = await Promise.all([
            Venta.findAll({
                where: { created_at: { [Op.between]: [f1, f2] }, estado: 'completada' },
                attributes: [
                    [sequelize.fn('SUM', sequelize.col('total')), 'total'],
                    [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                ],
                raw: true,
            }),
            Compra.findAll({
                where: { fecha_compra: { [Op.between]: [f1.toISOString().split('T')[0], f2.toISOString().split('T')[0]] } },
                attributes: [
                    [sequelize.fn('SUM', sequelize.col('total')), 'total'],
                    [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                ],
                raw: true,
            }),
            DetalleVenta.findAll({
                include: [
                    { model: Producto, as: 'producto', attributes: ['nombre', 'precio_compra'] },
                    { model: Venta, attributes: [], where: { created_at: { [Op.between]: [f1, f2] }, estado: 'completada' } },
                ],
                attributes: [
                    'producto_id',
                    [sequelize.fn('SUM', sequelize.col('DetalleVenta.cantidad')), 'cantidad_vendida'],
                    [sequelize.fn('SUM', sequelize.col('DetalleVenta.subtotal')), 'ingreso_venta'],
                ],
                group: ['producto_id', 'producto.nombre', 'producto.precio_compra'],
                order: [[sequelize.fn('SUM', sequelize.col('DetalleVenta.subtotal')), 'DESC']],
                limit: 10,
                nest: true,
            }),
        ]);

        const totalVentas = parseFloat(ventasRes[0]?.total || 0);
        const totalCompras = parseFloat(comprasRes[0]?.total || 0);
        const margenBruto = totalVentas - totalCompras;
        const margenPct = totalVentas > 0 ? ((margenBruto / totalVentas) * 100).toFixed(1) : 0;

        const productosMargen = margenProductos.map(p => {
            const cantVendida = parseFloat(p.get('cantidad_vendida') || 0);
            const ingresoVenta = parseFloat(p.get('ingreso_venta') || 0);
            const costoUnit = parseFloat(p.producto?.precio_compra || 0);
            const costoTotal = costoUnit * cantVendida;
            const margen = ingresoVenta - costoTotal;
            return {
                nombre: p.producto?.nombre,
                cantidad_vendida: cantVendida,
                ingreso_venta: ingresoVenta,
                costo_total: costoTotal,
                margen,
                margen_pct: ingresoVenta > 0 ? ((margen / ingresoVenta) * 100).toFixed(1) : 0,
            };
        });

        res.json({
            ok: true,
            data: { ventas: { total: totalVentas, count: ventasRes[0]?.count || 0 }, compras: { total: totalCompras, count: comprasRes[0]?.count || 0 }, margen_bruto: margenBruto, margen_pct: parseFloat(margenPct), productosMargen },
        });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

const getTopClientes = async (req, res) => {
    try {
        const { desde, hasta, limite = 20 } = req.query;
        const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
        const fin = new Date(); fin.setHours(23, 59, 59, 999);
        const f1 = desde ? new Date(desde) : new Date(new Date().setDate(1));
        const f2 = hasta ? new Date(hasta + 'T23:59:59') : fin;

        const clientesTop = await Venta.findAll({
            where: {
                created_at: { [Op.between]: [f1, f2] },
                estado: 'completada',
                cliente_id: { [Op.not]: null }
            },
            include: [{ model: Cliente, as: 'cliente', attributes: ['nombre', 'telefono', 'email'] }],
            attributes: [
                'cliente_id',
                [sequelize.fn('COUNT', sequelize.col('Venta.id')), 'total_pedidos'],
                [sequelize.fn('SUM', sequelize.col('total')), 'total_comprado']
            ],
            group: ['cliente_id', 'cliente.id'],
            order: [[sequelize.fn('SUM', sequelize.col('total')), 'DESC']],
            limit: parseInt(limite),
            raw: true,
            nest: true,
        });

        res.json({ ok: true, data: clientesTop });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

module.exports = { getResumenGeneral, getRentabilidad, getTopClientes };
