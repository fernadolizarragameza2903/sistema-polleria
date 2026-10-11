const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const CajaEgreso = sequelize.define('CajaEgreso', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    caja_id: { type: DataTypes.INTEGER, allowNull: false },
    concepto: { type: DataTypes.STRING(200), allowNull: false },
    monto: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    usuario_id: { type: DataTypes.INTEGER },
}, { tableName: 'caja_egresos', timestamps: true, createdAt: 'created_at', updatedAt: false });

module.exports = CajaEgreso;
