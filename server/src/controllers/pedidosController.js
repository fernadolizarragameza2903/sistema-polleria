const { Pedido, Cliente, Usuario, Venta, sequelize } = require('../models');
const { Op } = require('sequelize');

const getAll = async (req, res) => {
    try {
        const { estado } = req.query;
        const where = {};
        if (estado) where.estado = estado;
        const pedidos = await Pedido.findAll({
            where,
            include: [
                { model: Cliente, as: 'cliente', attributes: ['id', 'nombre', 'telefono'] },
                { model: Usuario, as: 'usuario', attributes: ['id', 'nombre'] },
                { model: Usuario, as: 'repartidor', attributes: ['id', 'nombre'] },
            ],
            order: [['created_at', 'DESC']],
        });
        res.json({ ok: true, pedidos });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

const create = async (req, res) => {
    try {
        const count = await Pedido.count();
        const numero_pedido = `PED-${String(count + 1).padStart(5, '0')}`;
        const pedido = await Pedido.create({ ...req.body, usuario_id: req.user.id, numero_pedido });
        res.status(201).json({ ok: true, pedido });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

const updateEstado = async (req, res) => {
    try {
        const pedido = await Pedido.findByPk(req.params.id);
        if (!pedido) return res.status(404).json({ ok: false, msg: 'Pedido no encontrado' });
        await pedido.update({ estado: req.body.estado, repartidor_id: req.body.repartidor_id });
        res.json({ ok: true, pedido });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

module.exports = { getAll, create, updateEstado };
