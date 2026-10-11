const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Pedido = sequelize.define('Pedido', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    numero_pedido: { type: DataTypes.STRING(20) },
    cliente_id: { type: DataTypes.INTEGER },
    usuario_id: { type: DataTypes.INTEGER, allowNull: false },
    repartidor_id: { type: DataTypes.INTEGER },
    venta_id: { type: DataTypes.INTEGER },
    direccion_entrega: { type: DataTypes.TEXT },
    referencia: { type: DataTypes.TEXT },
    costo_delivery: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    estado: { type: DataTypes.ENUM('pendiente', 'preparando', 'en_camino', 'entregado', 'cancelado'), defaultValue: 'pendiente' },
    notas: { type: DataTypes.TEXT },
    tiempo_estimado: { type: DataTypes.INTEGER, defaultValue: 30 },
}, { tableName: 'pedidos', timestamps: true });

module.exports = Pedido;
