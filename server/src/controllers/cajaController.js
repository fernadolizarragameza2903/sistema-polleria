const { Caja, CajaEgreso, Venta, sequelize } = require('../models');
const { Op } = require('sequelize');

const getCajaActiva = async (req, res) => {
    try {
        const caja = await Caja.findOne({ where: { estado: 'abierta' }, order: [['fecha_apertura', 'DESC']] });
        if (!caja) return res.json({ ok: true, caja: null });

        // Calcular total ventas en tiempo real
        const result = await Venta.findAll({
            where: { caja_id: caja.id, estado: 'completada' },
            attributes: [
                [sequelize.fn('SUM', sequelize.col('total')), 'total'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad'],
            ],
            raw: true,
        });

        const cajaData = caja.toJSON();
        cajaData.total_ventas = parseFloat(result[0]?.total || 0);
        cajaData.cantidad_ventas = parseInt(result[0]?.cantidad || 0);

        res.json({ ok: true, caja: cajaData });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

const abrir = async (req, res) => {
    try {
        const cajaActiva = await Caja.findOne({ where: { estado: 'abierta' } });
        if (cajaActiva) return res.status(400).json({ ok: false, msg: 'Ya hay una caja abierta' });
        const caja = await Caja.create({ usuario_id: req.user.id, saldo_inicial: req.body.saldo_inicial || 0 });
        res.status(201).json({ ok: true, caja });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

const cerrar = async (req, res) => {
    try {
        const caja = await Caja.findByPk(req.params.id);
        if (!caja) return res.status(404).json({ ok: false, msg: 'Caja no encontrada' });
        if (caja.estado === 'cerrada') return res.status(400).json({ ok: false, msg: 'Caja ya está cerrada' });

        // Calcular total ventas
        const result = await Venta.findAll({
            where: { caja_id: caja.id, estado: 'completada' },
            attributes: [[sequelize.fn('SUM', sequelize.col('total')), 'total'], [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad']],
            raw: true,
        });

        const total_ventas = parseFloat(result[0].total || 0);
        const saldo_final = parseFloat(caja.saldo_inicial) + total_ventas;

        await caja.update({ estado: 'cerrada', saldo_final, total_ventas, fecha_cierre: new Date(), observaciones: req.body.observaciones });
        res.json({ ok: true, caja });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

const getHistorial = async (req, res) => {
    try {
        const cajas = await Caja.findAll({ order: [['fecha_apertura', 'DESC']], limit: 30 });
        res.json({ ok: true, cajas });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

const egresarDeCaja = async (req, res) => {
    try {
        const { concepto, monto } = req.body;
        if (!concepto || !monto || parseFloat(monto) <= 0)
            return res.status(400).json({ ok: false, msg: 'Concepto y monto son requeridos' });

        const cajaActiva = await Caja.findOne({ where: { estado: 'abierta' } });
        if (!cajaActiva) return res.status(400).json({ ok: false, msg: 'No hay caja abierta' });

        // Calcular saldo disponible en tiempo real
        const [ventasTotales, egresosTotales] = await Promise.all([
            Venta.findAll({
                where: { caja_id: cajaActiva.id, estado: 'completada' },
                attributes: [[sequelize.fn('SUM', sequelize.col('total')), 'total']],
                raw: true,
            }),
            CajaEgreso.findAll({
                where: { caja_id: cajaActiva.id },
                attributes: [[sequelize.fn('SUM', sequelize.col('monto')), 'total']],
                raw: true,
            }),
        ]);

        const saldoInicial = parseFloat(cajaActiva.saldo_inicial || 0);
        const totalVentas = parseFloat(ventasTotales[0]?.total || 0);
        const totalEgresos = parseFloat(egresosTotales[0]?.total || 0);
        const saldoDisponible = saldoInicial + totalVentas - totalEgresos;

        if (parseFloat(monto) > saldoDisponible) {
            return res.status(400).json({
                ok: false,
                msg: `Saldo insuficiente. Disponible: S/. ${saldoDisponible.toFixed(2)}`,
            });
        }

        const egreso = await CajaEgreso.create({
            caja_id: cajaActiva.id,
            concepto,
            monto: parseFloat(monto),
            usuario_id: req.user.id,
        });
        res.status(201).json({ ok: true, egreso, saldo_disponible: saldoDisponible - parseFloat(monto) });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

const getEgresos = async (req, res) => {
    try {
        const cajaActiva = await Caja.findOne({ where: { estado: 'abierta' } });
        if (!cajaActiva) return res.json({ ok: true, egresos: [] });
        const egresos = await CajaEgreso.findAll({
            where: { caja_id: cajaActiva.id },
            order: [['created_at', 'DESC']],
        });
        res.json({ ok: true, egresos });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

module.exports = { getCajaActiva, abrir, cerrar, getHistorial, egresarDeCaja, getEgresos };
