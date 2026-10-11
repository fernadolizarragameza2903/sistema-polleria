const { Promocion, Producto, Categoria } = require('../models');

const getAll = async (req, res) => {
    try {
        const promociones = await Promocion.findAll({
            include: [
                { model: Producto, as: 'producto', attributes: ['id', 'nombre'] },
                { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] }
            ],
            order: [['created_at', 'DESC']]
        });
        res.json({ ok: true, promociones });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

const create = async (req, res) => {
    try {
        const promo = await Promocion.create(req.body);
        res.status(201).json({ ok: true, promo });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

const update = async (req, res) => {
    try {
        const promo = await Promocion.findByPk(req.params.id);
        if (!promo) return res.status(404).json({ ok: false, msg: 'No encontrada' });
        await promo.update(req.body);
        res.json({ ok: true, promo });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

const remove = async (req, res) => {
    try {
        const promo = await Promocion.findByPk(req.params.id);
        if (!promo) return res.status(404).json({ ok: false, msg: 'No encontrada' });
        await promo.destroy();
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

// Endpoint especial para el POS: obtener las promociones activas actuales
const getActivas = async (req, res) => {
    try {
        // Obtenemos solo las activas
        const activas = await Promocion.findAll({
            where: { activo: 1 },
            include: [
                { model: Producto, as: 'producto', attributes: ['id', 'nombre'] },
                { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] }
            ]
        });

        const hoyDate = new Date();
        const diaSemana = hoyDate.getDay().toString(); // 0 (Domingo) - 6 (Sábado)

        // Filtramos por fecha y día de la semana
        const vigentes = activas.filter(p => {
            // Verificar días de la semana
            if (p.dias_semana && !p.dias_semana.includes(diaSemana)) return false;

            // Verificar rango de fechas
            const inicio = p.fecha_inicio ? new Date(p.fecha_inicio + 'T00:00:00') : null;
            const fin = p.fecha_fin ? new Date(p.fecha_fin + 'T23:59:59') : null;

            if (inicio && hoyDate < inicio) return false;
            if (fin && hoyDate > fin) return false;

            return true;
        });

        res.json({ ok: true, promociones: vigentes });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

module.exports = { getAll, create, update, remove, getActivas };
