const { Configuracion } = require('../models');

const getAll = async (req, res) => {
    try {
        const config = await Configuracion.findAll();
        const obj = {};
        config.forEach(c => { obj[c.clave] = c.valor; });
        res.json({ ok: true, configuracion: obj });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

const update = async (req, res) => {
    try {
        const { configuracion } = req.body;
        for (const [clave, valor] of Object.entries(configuracion)) {
            await Configuracion.upsert({ clave, valor });
        }
        res.json({ ok: true, msg: 'Configuración actualizada' });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

module.exports = { getAll, update };
