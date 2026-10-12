const { Caja, CajaEgreso, Venta, Pedido, sequelize } = require('../models');
const { Op } = require('sequelize');
const { ESTADOS_ACTIVOS } = require('../services/pedidoService');

/**
 * Resumen de una caja.
 *
 * Solo el EFECTIVO queda físicamente en el cajón: Yape, Plin, tarjeta y
 * transferencia van a cuentas bancarias. Por eso el saldo esperado es:
 *
 *   efectivo_esperado = saldo_inicial + ventas en efectivo − egresos
 *
 * Los delivery aún no entregados se muestran aparte ("por cobrar").
 */
async function resumenCaja(caja, transaction) {
    const [porMetodo, egresos, pendientes] = await Promise.all([
        Venta.findAll({
            where: { caja_id: caja.id, estado: 'completada' },
            attributes: ['metodo_pago', [sequelize.fn('SUM', sequelize.col('total')), 'total'], [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad']],
            group: ['metodo_pago'],
            raw: true, transaction,
        }),
        CajaEgreso.findOne({
            where: { caja_id: caja.id },
            attributes: [[sequelize.fn('SUM', sequelize.col('monto')), 'total']],
            raw: true, transaction,
        }),
        Venta.findOne({
            where: { caja_id: caja.id, estado: 'pendiente' },
            attributes: [[sequelize.fn('SUM', sequelize.col('total')), 'total'], [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad']],
            raw: true, transaction,
        }),
    ]);

    const metodos = porMetodo.map(m => ({ metodo_pago: m.metodo_pago, total: parseFloat(m.total || 0), cantidad: parseInt(m.cantidad || 0) }));
    const totalVentas = metodos.reduce((s, m) => s + m.total, 0);
    const efectivo = metodos.find(m => m.metodo_pago === 'efectivo')?.total || 0;
    const totalEgresos = parseFloat(egresos?.total || 0);
    const saldoInicial = parseFloat(caja.saldo_inicial || 0);

    return {
        total_ventas: +totalVentas.toFixed(2),
        cantidad_ventas: metodos.reduce((s, m) => s + m.cantidad, 0),
        por_metodo: metodos,
        ventas_efectivo: +efectivo.toFixed(2),
        ventas_digitales: +(totalVentas - efectivo).toFixed(2),
        total_egresos: +totalEgresos.toFixed(2),
        efectivo_esperado: +(saldoInicial + efectivo - totalEgresos).toFixed(2),
        delivery_por_cobrar: { cantidad: parseInt(pendientes?.cantidad || 0), total: parseFloat(pendientes?.total || 0) },
    };
}

const getCajaActiva = async (req, res) => {
    try {
        const caja = await Caja.findOne({ where: { estado: 'abierta' }, order: [['fecha_apertura', 'DESC']] });
        if (!caja) return res.json({ ok: true, caja: null });
        res.json({ ok: true, caja: { ...caja.toJSON(), ...(await resumenCaja(caja)) } });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

const abrir = async (req, res) => {
    try {
        const cajaActiva = await Caja.findOne({ where: { estado: 'abierta' } });
        if (cajaActiva) return res.status(400).json({ ok: false, msg: 'Ya hay una caja abierta' });
        const saldo = parseFloat(req.body.saldo_inicial);
        if (Number.isNaN(saldo) || saldo < 0) return res.status(400).json({ ok: false, msg: 'Saldo inicial no válido' });
        const caja = await Caja.create({ usuario_id: req.user.id, saldo_inicial: saldo });
        res.status(201).json({ ok: true, caja });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

/**
 * PUT /api/caja/:id/cerrar  { monto_contado?, observaciones? }
 * No permite cerrar con delivery en curso: ese dinero aún no llegó a la caja.
 */
const cerrar = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const caja = await Caja.findByPk(req.params.id, { transaction: t, lock: t.LOCK.UPDATE });
        if (!caja) { await t.rollback(); return res.status(404).json({ ok: false, msg: 'Caja no encontrada' }); }
        if (caja.estado === 'cerrada') { await t.rollback(); return res.status(400).json({ ok: false, msg: 'Caja ya está cerrada' }); }

        const enCurso = await Pedido.count({
            where: { estado: { [Op.in]: ESTADOS_ACTIVOS } },
            include: [{ model: Venta, as: 'venta', attributes: [], where: { caja_id: caja.id } }],
            transaction: t,
        });
        if (enCurso > 0) {
            await t.rollback();
            return res.status(409).json({ ok: false, msg: `Hay ${enCurso} pedido(s) delivery en curso. Márcalos como entregados o cancelados antes de cerrar la caja.` });
        }

        const r = await resumenCaja(caja, t);
        const contado = req.body.monto_contado === undefined || req.body.monto_contado === '' ? null : parseFloat(req.body.monto_contado);

        await caja.update({
            estado: 'cerrada',
            fecha_cierre: new Date(),
            total_ventas: r.total_ventas,
            total_gastos: r.total_egresos,
            total_efectivo: r.ventas_efectivo,
            saldo_final: r.efectivo_esperado,
            monto_contado: Number.isNaN(contado) ? null : contado,
            diferencia: contado === null || Number.isNaN(contado) ? null : +(contado - r.efectivo_esperado).toFixed(2),
            observaciones: req.body.observaciones,
        }, { transaction: t });
        await t.commit();
        res.json({ ok: true, caja, resumen: r });
    } catch (err) {
        await t.rollback();
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

        // Un egreso sale del cajón: solo se puede retirar el efectivo disponible.
        const { efectivo_esperado } = await resumenCaja(cajaActiva);
        if (parseFloat(monto) > efectivo_esperado) {
            return res.status(400).json({
                ok: false,
                msg: `Efectivo insuficiente en caja. Disponible: S/. ${efectivo_esperado.toFixed(2)}`,
            });
        }

        const egreso = await CajaEgreso.create({
            caja_id: cajaActiva.id,
            concepto,
            monto: parseFloat(monto),
            usuario_id: req.user.id,
        });
        res.status(201).json({ ok: true, egreso, saldo_disponible: +(efectivo_esperado - parseFloat(monto)).toFixed(2) });
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
