const { Proveedor } = require('../models');
const { Op } = require('sequelize');

const getAll = async (req, res) => {
    try {
        const { search } = req.query;
        const where = { activo: 1 };
        if (search) where.nombre = { [Op.like]: `%${search}%` };
        const proveedores = await Proveedor.findAll({ where, order: [['nombre', 'ASC']] });
        res.json({ ok: true, proveedores });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

const getOne = async (req, res) => {
    try {
        const p = await Proveedor.findByPk(req.params.id);
        if (!p) return res.status(404).json({ ok: false, msg: 'Proveedor no encontrado' });
        res.json({ ok: true, proveedor: p });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

const create = async (req, res) => {
    try {
        const proveedor = await Proveedor.create(req.body);
        res.status(201).json({ ok: true, proveedor });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

const update = async (req, res) => {
    try {
        const p = await Proveedor.findByPk(req.params.id);
        if (!p) return res.status(404).json({ ok: false, msg: 'Proveedor no encontrado' });
        await p.update(req.body);
        res.json({ ok: true, proveedor: p });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

const remove = async (req, res) => {
    try {
        const p = await Proveedor.findByPk(req.params.id);
        if (!p) return res.status(404).json({ ok: false, msg: 'Proveedor no encontrado' });
        await p.update({ activo: 0 });
        res.json({ ok: true, msg: 'Proveedor eliminado' });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

module.exports = { getAll, getOne, create, update, remove };
