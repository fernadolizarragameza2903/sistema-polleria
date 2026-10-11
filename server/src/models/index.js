// Archivo índice que registra todas las asociaciones entre modelos Sequelize
const sequelize = require('../config/db');

const Rol = require('./Rol');
const Usuario = require('./Usuario');
const Categoria = require('./Categoria');
const Producto = require('./Producto');
const Cliente = require('./Cliente');
const Proveedor = require('./Proveedor');
const Caja = require('./Caja');
const Venta = require('./Venta');
const DetalleVenta = require('./DetalleVenta');
const Pedido = require('./Pedido');
const Compra = require('./Compra');
const DetalleCompra = require('./DetalleCompra');
const InventarioMovimiento = require('./InventarioMovimiento');
const Configuracion = require('./Configuracion');
const CajaEgreso = require('./CajaEgreso');
const AuditLog = require('./AuditLog');
const Promocion = require('./Promocion');
const CrmInteraccion = require('./CrmInteraccion');

// ===========================================
// ASOCIACIONES
// ===========================================

// Roles <-> Usuarios
Rol.hasMany(Usuario, { foreignKey: 'rol_id' });
Usuario.belongsTo(Rol, { foreignKey: 'rol_id', as: 'rol' });

// Categorias <-> Productos
Categoria.hasMany(Producto, { foreignKey: 'categoria_id' });
Producto.belongsTo(Categoria, { foreignKey: 'categoria_id', as: 'categoria' });

// Usuarios <-> Caja
Usuario.hasMany(Caja, { foreignKey: 'usuario_id' });
Caja.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

// Usuarios/Clientes <-> Ventas
Usuario.hasMany(Venta, { foreignKey: 'usuario_id' });
Venta.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
Cliente.hasMany(Venta, { foreignKey: 'cliente_id' });
Venta.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });
Caja.hasMany(Venta, { foreignKey: 'caja_id' });
Venta.belongsTo(Caja, { foreignKey: 'caja_id', as: 'caja' });

// Ventas <-> DetalleVentas
Venta.hasMany(DetalleVenta, { foreignKey: 'venta_id', as: 'detalles' });
DetalleVenta.belongsTo(Venta, { foreignKey: 'venta_id' });
Producto.hasMany(DetalleVenta, { foreignKey: 'producto_id' });
DetalleVenta.belongsTo(Producto, { foreignKey: 'producto_id', as: 'producto' });

// Pedidos
Usuario.hasMany(Pedido, { foreignKey: 'usuario_id' });
Pedido.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
Usuario.hasMany(Pedido, { foreignKey: 'repartidor_id', as: 'pedidosRepartidor' });
Pedido.belongsTo(Usuario, { foreignKey: 'repartidor_id', as: 'repartidor' });
Cliente.hasMany(Pedido, { foreignKey: 'cliente_id' });
Pedido.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });
Venta.hasOne(Pedido, { foreignKey: 'venta_id' });
Pedido.belongsTo(Venta, { foreignKey: 'venta_id', as: 'venta' });

// Compras
Proveedor.hasMany(Compra, { foreignKey: 'proveedor_id' });
Compra.belongsTo(Proveedor, { foreignKey: 'proveedor_id', as: 'proveedor' });
Usuario.hasMany(Compra, { foreignKey: 'usuario_id' });
Compra.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
Compra.hasMany(DetalleCompra, { foreignKey: 'compra_id', as: 'detalles' });
DetalleCompra.belongsTo(Compra, { foreignKey: 'compra_id' });
Producto.hasMany(DetalleCompra, { foreignKey: 'producto_id' });
DetalleCompra.belongsTo(Producto, { foreignKey: 'producto_id', as: 'producto' });

// Inventario
Producto.hasMany(InventarioMovimiento, { foreignKey: 'producto_id' });
InventarioMovimiento.belongsTo(Producto, { foreignKey: 'producto_id', as: 'producto' });
Usuario.hasMany(InventarioMovimiento, { foreignKey: 'usuario_id' });
InventarioMovimiento.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

// CajaEgresos
Caja.hasMany(CajaEgreso, { foreignKey: 'caja_id', as: 'egresos' });
CajaEgreso.belongsTo(Caja, { foreignKey: 'caja_id' });
Usuario.hasMany(CajaEgreso, { foreignKey: 'usuario_id' });
CajaEgreso.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

// AuditLog
Usuario.hasMany(AuditLog, { foreignKey: 'usuario_id' });
AuditLog.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

// Promocion
Producto.hasMany(Promocion, { foreignKey: 'producto_id' });
Promocion.belongsTo(Producto, { foreignKey: 'producto_id', as: 'producto' });
Categoria.hasMany(Promocion, { foreignKey: 'categoria_id' });
Promocion.belongsTo(Categoria, { foreignKey: 'categoria_id', as: 'categoria' });

// CRM Interacciones
Cliente.hasMany(CrmInteraccion, { foreignKey: 'cliente_id', as: 'interacciones_crm' });
CrmInteraccion.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });
Usuario.hasMany(CrmInteraccion, { foreignKey: 'usuario_id' });
CrmInteraccion.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

module.exports = {
    sequelize,
    Rol, Usuario, Categoria, Producto, Cliente, Proveedor,
    Caja, CajaEgreso, Venta, DetalleVenta, Pedido, Compra, DetalleCompra,
    InventarioMovimiento, Configuracion, AuditLog, Promocion, CrmInteraccion
};
