const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Pedido = sequelize.define('Pedido', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    numero_pedido: { type: DataTypes.STRING(20) },
    canal: { type: DataTypes.ENUM('whatsapp', 'llamada', 'presencial', 'web'), defaultValue: 'llamada' },
    cliente_id: { type: DataTypes.INTEGER },
    // Datos de contacto cuando quien pide no es un cliente registrado (o no da su nombre)
    contacto_nombre: { type: DataTypes.STRING(120) },
    contacto_telefono: { type: DataTypes.STRING(20) },
    usuario_id: { type: DataTypes.INTEGER, allowNull: false },
    repartidor_id: { type: DataTypes.INTEGER },
    venta_id: { type: DataTypes.INTEGER },
    direccion_entrega: { type: DataTypes.TEXT },
    referencia: { type: DataTypes.TEXT },
    costo_delivery: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    estado: { type: DataTypes.ENUM('pendiente', 'preparando', 'en_camino', 'entregado', 'cancelado'), defaultValue: 'pendiente' },
    notas: { type: DataTypes.TEXT },
    tiempo_estimado: { type: DataTypes.INTEGER, defaultValue: 30 },
    fecha_entrega: { type: DataTypes.DATE },
}, { tableName: 'pedidos', timestamps: true });

module.exports = Pedido;
