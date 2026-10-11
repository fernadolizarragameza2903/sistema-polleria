const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Venta = sequelize.define('Venta', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    numero_comprobante: { type: DataTypes.STRING(20) },
    tipo_comprobante: { type: DataTypes.ENUM('boleta', 'factura', 'nota', 'ticket'), defaultValue: 'ticket' },
    tipo_venta: { type: DataTypes.ENUM('local', 'llevar', 'delivery'), defaultValue: 'local' },
    cliente_id: { type: DataTypes.INTEGER },
    usuario_id: { type: DataTypes.INTEGER, allowNull: false },
    caja_id: { type: DataTypes.INTEGER },
    subtotal: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    igv: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    descuento: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    total: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    metodo_pago: { type: DataTypes.ENUM('efectivo', 'tarjeta', 'yape', 'plin', 'transferencia', 'mixto'), defaultValue: 'efectivo' },
    monto_recibido: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    vuelto: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    estado: { type: DataTypes.ENUM('pendiente', 'completada', 'anulada'), defaultValue: 'completada' },
    observaciones: { type: DataTypes.TEXT },
}, { tableName: 'ventas', timestamps: true });

module.exports = Venta;
