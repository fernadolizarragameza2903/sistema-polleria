const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Caja = sequelize.define('Caja', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    usuario_id: { type: DataTypes.INTEGER, allowNull: false },
    saldo_inicial: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    saldo_final: { type: DataTypes.DECIMAL(10, 2) },
    total_ventas: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    total_gastos: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    estado: { type: DataTypes.ENUM('abierta', 'cerrada'), defaultValue: 'abierta' },
    observaciones: { type: DataTypes.TEXT },
    fecha_apertura: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    fecha_cierre: { type: DataTypes.DATE },
}, { tableName: 'caja', timestamps: false });

module.exports = Caja;
