const { Categoria } = require('../models');

const getAll = async (req, res) => {
    try {
        const categorias = await Categoria.findAll({ where: { activo: 1 }, order: [['nombre', 'ASC']] });
        res.json({ ok: true, categorias });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

const create = async (req, res) => {
    try {
        const cat = await Categoria.create(req.body);
        res.status(201).json({ ok: true, categoria: cat });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

const update = async (req, res) => {
    try {
        const cat = await Categoria.findByPk(req.params.id);
        if (!cat) return res.status(404).json({ ok: false, msg: 'Categoría no encontrada' });
        await cat.update(req.body);
        res.json({ ok: true, categoria: cat });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

const remove = async (req, res) => {
    try {
        const cat = await Categoria.findByPk(req.params.id);
        if (!cat) return res.status(404).json({ ok: false, msg: 'Categoría no encontrada' });
        await cat.update({ activo: 0 });
        res.json({ ok: true, msg: 'Categoría eliminada' });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

module.exports = { getAll, create, update, remove };
