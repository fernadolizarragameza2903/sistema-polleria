const { Usuario, Rol } = require('../models');
const { Op } = require('sequelize');

const getAll = async (req, res) => {
    try {
        const usuarios = await Usuario.findAll({
            attributes: { exclude: ['password'] },
            include: [{ model: Rol, as: 'rol' }],
            order: [['nombre', 'ASC']],
        });
        res.json({ ok: true, usuarios });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

const create = async (req, res) => {
    try {
        const usuario = await Usuario.create(req.body);
        res.status(201).json({ ok: true, usuario: { ...usuario.toJSON(), password: undefined } });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

const update = async (req, res) => {
    try {
        const u = await Usuario.findByPk(req.params.id);
        if (!u) return res.status(404).json({ ok: false, msg: 'Usuario no encontrado' });
        const data = { ...req.body };
        if (data.password === '') delete data.password;
        await u.update(data);
        res.json({ ok: true, msg: 'Usuario actualizado' });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

const remove = async (req, res) => {
    try {
        const u = await Usuario.findByPk(req.params.id);
        if (!u) return res.status(404).json({ ok: false, msg: 'Usuario no encontrado' });
        await u.update({ activo: 0 });
        res.json({ ok: true, msg: 'Usuario desactivado' });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

module.exports = { getAll, create, update, remove };
