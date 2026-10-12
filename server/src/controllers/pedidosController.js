const { Pedido, Cliente, Usuario, Venta, DetalleVenta, Producto, sequelize } = require('../models');
const { Op } = require('sequelize');
const audit = require('../helpers/audit');
const { rangoUTC, esFechaValida } = require('../helpers/fechasNegocio');
const { ESTADOS, ESTADOS_ACTIVOS, cambiarEstado } = require('../services/pedidoService');

const LIMITE_POR_DEFECTO = 25;

/** WHERE común para listado y conteos (todo menos el estado). */
function filtrosPedidos({ desde, hasta, q }) {
    const where = {};
    if (esFechaValida(desde) || esFechaValida(hasta)) {
        const { inicio, fin } = rangoUTC(esFechaValida(desde) ? desde : '2000-01-01', esFechaValida(hasta) ? hasta : '2999-12-31');
        where.created_at = { [Op.between]: [inicio, fin] };
    }
    const termino = String(q || '').trim();
    if (termino) {
        where[Op.or] = [
            { numero_pedido: { [Op.like]: `%${termino}%` } },
            { contacto_nombre: { [Op.like]: `%${termino}%` } },
            { contacto_telefono: { [Op.like]: `%${termino}%` } },
            { direccion_entrega: { [Op.like]: `%${termino}%` } },
            { '$cliente.nombre$': { [Op.like]: `%${termino}%` } },
            { '$cliente.telefono$': { [Op.like]: `%${termino}%` } },
        ];
    }
    return where;
}

/**
 * GET /api/pedidos?estado=activos|pendiente|...&desde&hasta&q&page&limit
 * Devuelve la página pedida + conteo por estado con los mismos filtros.
 */
const getAll = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit) || LIMITE_POR_DEFECTO, 1), 100);
        const base = filtrosPedidos(req.query);

        const where = { ...base };
        if (req.query.estado === 'activos') where.estado = { [Op.in]: ESTADOS_ACTIVOS };
        else if (ESTADOS.includes(req.query.estado)) where.estado = req.query.estado;

        const clienteInclude = { model: Cliente, as: 'cliente', attributes: ['id', 'nombre', 'telefono'] };

        const [{ rows, count }, conteos] = await Promise.all([
            Pedido.findAndCountAll({
                where,
                include: [
                    clienteInclude,
                    { model: Usuario, as: 'repartidor', attributes: ['id', 'nombre'] },
                    { model: Venta, as: 'venta', attributes: ['id', 'numero_comprobante', 'total', 'metodo_pago', 'monto_recibido', 'vuelto', 'estado'] },
                ],
                // Activos: el más antiguo primero (se atiende en orden de llegada).
                order: req.query.estado === 'activos' ? [['created_at', 'ASC']] : [['created_at', 'DESC']],
                limit, offset: (page - 1) * limit,
            }),
            Pedido.findAll({
                where: base,
                include: [{ ...clienteInclude, attributes: [] }],
                attributes: ['estado', [sequelize.fn('COUNT', sequelize.col('Pedido.id')), 'cantidad']],
                group: ['estado'],
                raw: true,
            }),
        ]);

        res.json({
            ok: true,
            pedidos: rows,
            conteos: Object.fromEntries(conteos.map(c => [c.estado, parseInt(c.cantidad)])),
            paginacion: { page, limit, total: count, paginas: Math.max(Math.ceil(count / limit), 1) },
        });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

/** GET /api/pedidos/:id — pedido con los productos de su venta. */
const getOne = async (req, res) => {
    try {
        const pedido = await Pedido.findByPk(req.params.id, {
            include: [
                { model: Cliente, as: 'cliente', attributes: ['id', 'nombre', 'telefono', 'direccion'] },
                { model: Usuario, as: 'repartidor', attributes: ['id', 'nombre'] },
                { model: Usuario, as: 'usuario', attributes: ['id', 'nombre'] },
                {
                    model: Venta, as: 'venta',
                    include: [{ model: DetalleVenta, as: 'detalles', include: [{ model: Producto, as: 'producto', attributes: ['id', 'nombre'] }] }],
                },
            ],
        });
        if (!pedido) return res.status(404).json({ ok: false, msg: 'Pedido no encontrado' });
        res.json({ ok: true, pedido });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

/**
 * PUT /api/pedidos/:id/estado  { estado?, repartidor_id? }
 * El cambio de estado se propaga a la venta (cobro, anulación y stock).
 */
const updateEstado = async (req, res) => {
    const { estado } = req.body;
    const t = await sequelize.transaction();
    try {
        let pedido = await Pedido.findByPk(req.params.id, { transaction: t });
        if (!pedido) { await t.rollback(); return res.status(404).json({ ok: false, msg: 'Pedido no encontrado' }); }

        if ('repartidor_id' in req.body) {
            await pedido.update({ repartidor_id: req.body.repartidor_id || null }, { transaction: t });
        }
        if (estado) {
            pedido = await cambiarEstado({ pedidoId: pedido.id, nuevoEstado: estado, usuario_id: req.user.id, transaction: t });
        }
        await t.commit();
        res.json({ ok: true, pedido });

        if (estado) {
            await audit({ usuario_id: req.user.id, accion: 'PEDIDO_ESTADO', modulo: 'pedidos', descripcion: `Pedido ${pedido.numero_pedido} -> ${estado}`, ip: req.ip, datos: { pedido_id: pedido.id, estado } });
        }
    } catch (err) {
        await t.rollback();
        res.status(err.status || 500).json({ ok: false, msg: err.message });
    }
};

module.exports = { getAll, getOne, updateEstado };
