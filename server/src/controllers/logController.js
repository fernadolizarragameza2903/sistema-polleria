const { AuditLog, Usuario } = require('../models');

const getAllLogs = async (req, res) => {
    try {
        const logs = await AuditLog.findAll({
            include: [{ model: Usuario, as: 'usuario', attributes: ['id', 'nombre', 'email', 'rol_id'] }],
            order: [['created_at', 'DESC']],
            limit: 500 // Límitar a los últimos 500 eventos para esta vista
        });
        res.json({ ok: true, logs });
    } catch (err) {
        console.error('Error al obtener logs:', err);
        res.status(500).json({ ok: false, msg: 'Error al obtener registros de auditoría' });
    }
};

module.exports = { getAllLogs };
