const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const InventarioMovimiento = sequelize.define('InventarioMovimiento', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    producto_id: { type: DataTypes.INTEGER, allowNull: false },
    tipo: { type: DataTypes.ENUM('entrada', 'salida', 'ajuste'), allowNull: false },
    cantidad: { type: DataTypes.DECIMAL(10, 3), allowNull: false },
    stock_anterior: { type: DataTypes.DECIMAL(10, 3) },
    stock_nuevo: { type: DataTypes.DECIMAL(10, 3) },
    motivo: { type: DataTypes.STRING(200) },
    referencia_id: { type: DataTypes.INTEGER },
    referencia_tipo: { type: DataTypes.STRING(50) },
    usuario_id: { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: 'inventario_movimientos', timestamps: true, updatedAt: false });

module.exports = InventarioMovimiento;
