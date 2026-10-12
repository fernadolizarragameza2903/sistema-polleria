const { Categoria, sequelize } = require('../models');

// Campos editables desde la API. `tipo` no: la categoría dinámica "Lo más pedido"
// se crea por migración y no se puede convertir ni duplicar desde el panel.
const CAMPOS_EDITABLES = ['nombre', 'descripcion', 'icono', 'color', 'orden', 'activo'];
const soloEditables = (body) => Object.fromEntries(Object.entries(body).filter(([k]) => CAMPOS_EDITABLES.includes(k)));

/**
 * GET /api/categorias            -> activas, ordenadas como en el POS
 * GET /api/categorias?todas=1    -> incluye inactivas (pantalla de administración)
 */
const getAll = async (req, res) => {
    try {
        const categorias = await Categoria.findAll({
            where: req.query.todas === '1' ? {} : { activo: 1 },
            attributes: {
                include: [[
                    sequelize.literal('(SELECT COUNT(*) FROM productos p WHERE p.categoria_id = `Categoria`.`id` AND p.activo = 1)'),
                    'total_productos',
                ]],
            },
            order: [['orden', 'ASC'], ['nombre', 'ASC']],
        });
        res.json({ ok: true, categorias });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

const create = async (req, res) => {
    try {
        const cat = await Categoria.create(soloEditables(req.body));
        res.status(201).json({ ok: true, categoria: cat });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

const update = async (req, res) => {
    try {
        const cat = await Categoria.findByPk(req.params.id);
        if (!cat) return res.status(404).json({ ok: false, msg: 'Categoría no encontrada' });
        await cat.update(soloEditables(req.body));
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
