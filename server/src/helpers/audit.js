// Utilidad para registrar acciones en el audit log
const { AuditLog } = require('../models');

/**
 * Registra una acción en el audit log.
 * @param {object} options
 * @param {number} options.usuario_id
 * @param {string} options.accion  — e.g. 'VENTA_CREAR', 'LOGIN', 'PRODUCTO_ELIMINAR'
 * @param {string} options.modulo  — e.g. 'ventas', 'productos', 'auth'
 * @param {string} [options.descripcion]
 * @param {string} [options.ip]
 * @param {'ok'|'error'} [options.resultado]
 * @param {object} [options.datos]
 */
const audit = async ({ usuario_id, accion, modulo, descripcion, ip, resultado = 'ok', datos }) => {
    try {
        await AuditLog.create({ usuario_id, accion, modulo, descripcion, ip, resultado, datos });
    } catch (_) {
        // El fallo de auditoría no debe interrumpir la operación principal
    }
};

module.exports = audit;
