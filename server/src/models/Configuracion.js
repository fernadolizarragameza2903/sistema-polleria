const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Configuracion = sequelize.define('Configuracion', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    clave: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    valor: { type: DataTypes.TEXT },
    tipo: { type: DataTypes.STRING(50), defaultValue: 'text' },
    descripcion: { type: DataTypes.STRING(200) },
}, { tableName: 'configuracion', timestamps: false, updatedAt: 'updated_at' });

module.exports = Configuracion;
