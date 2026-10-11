const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Proveedor = sequelize.define('Proveedor', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(150), allowNull: false },
    ruc: { type: DataTypes.STRING(20) },
    contacto: { type: DataTypes.STRING(100) },
    telefono: { type: DataTypes.STRING(20) },
    email: { type: DataTypes.STRING(100) },
    direccion: { type: DataTypes.TEXT },
    productos_suministra: { type: DataTypes.TEXT },
    activo: { type: DataTypes.TINYINT(1), defaultValue: 1 },
}, { tableName: 'proveedores', timestamps: true });

module.exports = Proveedor;
