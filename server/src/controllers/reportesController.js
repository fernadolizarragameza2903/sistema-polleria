const { Venta, DetalleVenta, Producto, Compra, DetalleCompra, Cliente, sequelize } = require('../models');
const { Op } = require('sequelize');
const { obtenerVentasDiarias } = require('../services/ventasDiariasService');
const { resolverRango, rangoUTC, fechaLocal, sumarDias } = require('../helpers/fechasNegocio');

// Rango por defecto de rentabilidad y clientes top: desde el día 1 del mes en curso.
const inicioDeMes = () => `${fechaLocal().slice(0, 8)}01`;

const getResumenGeneral = async (req, res) => {
    try {
        // Fechas interpretadas en hora local del negocio (no UTC ni hora del servidor).
        const rango = resolverRango(req.query);
        const { inicio: f1, fin: f2 } = rangoUTC(rango.desde, rango.hasta);

        const [totalVentas, diarias, topProductos, ventasPorMetodo] = await Promise.all([
            Venta.findAll({
                where: { created_at: { [Op.between]: [f1, f2] }, estado: 'completada' },
                attributes: [[sequelize.fn('SUM', sequelize.col('total')), 'total_sum'], [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
                raw: true,
            }),
            obtenerVentasDiarias(rango),
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

        res.json({
            ok: true,
            data: {
                totalVentas: totalVentas[0],
                ventasPorDia: diarias.serie,
                resumenDiario: diarias.resumen,
                topProductos, ventasPorMetodo, totalClientes,
            },
        });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

const getRentabilidad = async (req, res) => {
    try {
        const rango = resolverRango(req.query, { desdePorDefecto: inicioDeMes() });
        const { inicio: f1, fin: f2 } = rangoUTC(rango.desde, rango.hasta);

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
                where: { fecha_compra: { [Op.between]: [rango.desde, rango.hasta] } },
                attributes: [
                    [sequelize.fn('SUM', sequelize.col('total')), 'total'],
                    [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                ],
                raw: true,
            }),
            DetalleVenta.findAll({
                include: [
                    { model: Producto, as: 'producto', attributes: ['nombre', 'precio_costo'] },
                    { model: Venta, attributes: [], where: { created_at: { [Op.between]: [f1, f2] }, estado: 'completada' } },
                ],
                attributes: [
                    'producto_id',
                    [sequelize.fn('SUM', sequelize.col('DetalleVenta.cantidad')), 'cantidad_vendida'],
                    [sequelize.fn('SUM', sequelize.col('DetalleVenta.subtotal')), 'ingreso_venta'],
                ],
                group: ['producto_id', 'producto.nombre', 'producto.precio_costo'],
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
            const costoUnit = parseFloat(p.producto?.precio_costo || 0);
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
        const { limite = 20 } = req.query;
        const rango = resolverRango(req.query, { desdePorDefecto: inicioDeMes() });
        const { inicio: f1, fin: f2 } = rangoUTC(rango.desde, rango.hasta);

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

/**
 * GET /api/reportes/ventas-diarias?dias=7  |  ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
 * Serie diaria en hora local con el día en curso marcado como parcial.
 * `dias` = días cerrados a mostrar antes de hoy (por defecto 7, máx. 366).
 */
const getVentasDiarias = async (req, res) => {
    try {
        const dias = Math.min(Math.max(parseInt(req.query.dias) || 7, 1), 366);
        const hoy = fechaLocal();
        const rango = resolverRango(req.query, { desdePorDefecto: sumarDias(hoy, -dias), hastaPorDefecto: hoy });
        const data = await obtenerVentasDiarias(rango);
        res.json({ ok: true, data });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

module.exports = { getResumenGeneral, getRentabilidad, getTopClientes, getVentasDiarias };
