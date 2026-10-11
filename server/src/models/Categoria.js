const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Categoria = sequelize.define('Categoria', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(80), allowNull: false },
    descripcion: { type: DataTypes.STRING(200) },
    icono: { type: DataTypes.STRING(50), defaultValue: 'Package' },
    color: { type: DataTypes.STRING(20), defaultValue: '#e91e8c' },
    activo: { type: DataTypes.TINYINT(1), defaultValue: 1 },
}, { tableName: 'categorias', timestamps: true });

module.exports = Categoria;
