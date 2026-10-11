const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Compra = sequelize.define('Compra', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    numero_factura: { type: DataTypes.STRING(50) },
    proveedor_id: { type: DataTypes.INTEGER, allowNull: false },
    usuario_id: { type: DataTypes.INTEGER, allowNull: false },
    subtotal: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    igv: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    total: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    estado: { type: DataTypes.ENUM('pendiente', 'recibida', 'cancelada'), defaultValue: 'recibida' },
    observaciones: { type: DataTypes.TEXT },
    fecha_compra: { type: DataTypes.DATEONLY },
}, { tableName: 'compras', timestamps: true });

module.exports = Compra;
