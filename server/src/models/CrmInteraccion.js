const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const CrmInteraccion = sequelize.define('CrmInteraccion', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    cliente_id: { type: DataTypes.INTEGER, allowNull: false },
    usuario_id: { type: DataTypes.INTEGER, allowNull: false },
    tipo: { type: DataTypes.ENUM('llamada', 'email', 'whatsapp', 'nota'), allowNull: false },
    observacion: { type: DataTypes.TEXT, allowNull: false },
    fecha: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
    tableName: 'crm_interacciones',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = CrmInteraccion;
