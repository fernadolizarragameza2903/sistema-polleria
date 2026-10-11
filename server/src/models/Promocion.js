const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Promocion = sequelize.define('Promocion', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    tipo: { type: DataTypes.ENUM('porcentaje', 'monto_fijo'), allowNull: false, defaultValue: 'porcentaje' },
    valor: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    aplicacion: { type: DataTypes.ENUM('general', 'producto', 'categoria'), allowNull: false, defaultValue: 'general' },
    producto_id: { type: DataTypes.INTEGER, allowNull: true },
    categoria_id: { type: DataTypes.INTEGER, allowNull: true },
    fecha_inicio: { type: DataTypes.DATEONLY, allowNull: true },
    fecha_fin: { type: DataTypes.DATEONLY, allowNull: true },
    dias_semana: { type: DataTypes.STRING(50), defaultValue: '0,1,2,3,4,5,6' },
    activo: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
    tableName: 'promociones',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Promocion;
