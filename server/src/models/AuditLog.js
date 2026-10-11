const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AuditLog = sequelize.define('AuditLog', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    usuario_id: { type: DataTypes.INTEGER, allowNull: true },
    accion: { type: DataTypes.STRING(100), allowNull: false },  // ej: 'LOGIN', 'VENTA_CREAR', 'PRODUCTO_EDITAR'
    modulo: { type: DataTypes.STRING(50), allowNull: false },    // ej: 'ventas', 'productos'
    descripcion: { type: DataTypes.TEXT, allowNull: true },
    ip: { type: DataTypes.STRING(50), allowNull: true },
    resultado: { type: DataTypes.ENUM('ok', 'error'), defaultValue: 'ok' },
    datos: { type: DataTypes.JSON, allowNull: true },            // payload relevante
}, { tableName: 'audit_log', timestamps: true, updatedAt: false });

module.exports = AuditLog;
