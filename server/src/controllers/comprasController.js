const { Compra, DetalleCompra, Producto, Proveedor, InventarioMovimiento, sequelize } = require('../models');

const getAll = async (req, res) => {
    try {
        const compras = await Compra.findAll({
            include: [
                { model: Proveedor, as: 'proveedor', attributes: ['id', 'nombre', 'ruc'] },
                { model: DetalleCompra, as: 'detalles', include: [{ model: Producto, as: 'producto', attributes: ['id', 'nombre'] }] },
            ],
            order: [['created_at', 'DESC']],
        });
        res.json({ ok: true, compras });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

const create = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { proveedor_id, numero_factura, subtotal, igv, total, estado, observaciones, fecha_compra, detalles } = req.body;
        const compra = await Compra.create({ proveedor_id, numero_factura, subtotal, igv, total, estado, observaciones, fecha_compra, usuario_id: req.user.id }, { transaction: t });

        for (const d of detalles) {
            await DetalleCompra.create({ compra_id: compra.id, producto_id: d.producto_id, cantidad: d.cantidad, precio_unitario: d.precio_unitario, subtotal: d.subtotal }, { transaction: t });
            const prod = await Producto.findByPk(d.producto_id, { transaction: t });
            if (prod) {
                const stockAnterior = prod.stock;
                const stockNuevo = stockAnterior + parseFloat(d.cantidad);
                await prod.update({ stock: stockNuevo }, { transaction: t });
                await InventarioMovimiento.create({ producto_id: d.producto_id, tipo: 'entrada', cantidad: d.cantidad, stock_anterior: stockAnterior, stock_nuevo: stockNuevo, motivo: `Compra ${compra.id}`, referencia_id: compra.id, referencia_tipo: 'compra', usuario_id: req.user.id }, { transaction: t });
            }
        }
        await t.commit();
        res.status(201).json({ ok: true, compra });
    } catch (err) {
        await t.rollback();
        res.status(500).json({ ok: false, msg: err.message });
    }
};

module.exports = { getAll, create };
