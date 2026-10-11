const { Cliente } = require('../models');
const { Op } = require('sequelize');

const getAll = async (req, res) => {
    try {
        const { search } = req.query;
        const where = { activo: 1 };
        if (search) where[Op.or] = [{ nombre: { [Op.like]: `%${search}%` } }, { documento_numero: { [Op.like]: `%${search}%` } }, { telefono: { [Op.like]: `%${search}%` } }];
        const clientes = await Cliente.findAll({ where, order: [['nombre', 'ASC']] });
        res.json({ ok: true, clientes });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

const getOne = async (req, res) => {
    try {
        const c = await Cliente.findByPk(req.params.id);
        if (!c) return res.status(404).json({ ok: false, msg: 'Cliente no encontrado' });
        res.json({ ok: true, cliente: c });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

const create = async (req, res) => {
    try {
        const cliente = await Cliente.create(req.body);
        res.status(201).json({ ok: true, cliente });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

const update = async (req, res) => {
    try {
        const c = await Cliente.findByPk(req.params.id);
        if (!c) return res.status(404).json({ ok: false, msg: 'Cliente no encontrado' });
        await c.update(req.body);
        res.json({ ok: true, cliente: c });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

const remove = async (req, res) => {
    try {
        const c = await Cliente.findByPk(req.params.id);
        if (!c) return res.status(404).json({ ok: false, msg: 'Cliente no encontrado' });
        await c.update({ activo: 0 });
        res.json({ ok: true, msg: 'Cliente eliminado' });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

module.exports = { getAll, getOne, create, update, remove };
