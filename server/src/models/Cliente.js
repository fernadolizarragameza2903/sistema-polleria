const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Cliente = sequelize.define('Cliente', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(150), allowNull: false },
    documento_tipo: { type: DataTypes.ENUM('DNI', 'RUC', 'CE', 'Pasaporte'), defaultValue: 'DNI' },
    documento_numero: { type: DataTypes.STRING(20) },
    telefono: { type: DataTypes.STRING(20) },
    email: { type: DataTypes.STRING(100) },
    direccion: { type: DataTypes.TEXT },
    puntos: { type: DataTypes.INTEGER, defaultValue: 0 },
    tipo: { type: DataTypes.ENUM('regular', 'frecuente', 'corporativo'), defaultValue: 'regular' },
    fecha_nacimiento: { type: DataTypes.DATEONLY, allowNull: true },
    segmento: { type: DataTypes.ENUM('nuevo', 'frecuente', 'vip', 'inactivo'), defaultValue: 'nuevo' },
    activo: { type: DataTypes.TINYINT(1), defaultValue: 1 },
}, { tableName: 'clientes', timestamps: true });

module.exports = Cliente;
