const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Producto = sequelize.define('Producto', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(150), allowNull: false },
    descripcion: { type: DataTypes.TEXT },
    precio: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    precio_costo: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    stock: { type: DataTypes.INTEGER, defaultValue: 0 },
    stock_minimo: { type: DataTypes.INTEGER, defaultValue: 5 },
    unidad: { type: DataTypes.STRING(30), defaultValue: 'unidad' },
    imagen: { type: DataTypes.STRING(255) },
    categoria_id: { type: DataTypes.INTEGER },
    codigo: { type: DataTypes.STRING(50) },
    activo: { type: DataTypes.TINYINT(1), defaultValue: 1 },
    featured: { type: DataTypes.TINYINT(1), defaultValue: 0 },
}, { tableName: 'productos', timestamps: true });

module.exports = Producto;
