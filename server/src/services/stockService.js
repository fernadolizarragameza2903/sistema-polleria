const { Producto, InventarioMovimiento, Cliente } = require('../models');
const { enviarAlertaStock } = require('./emailService');

/**
 * Descuenta stock por cada línea de una venta y deja el movimiento en el kardex.
 * Debe llamarse dentro de la transacción de la venta.
 */
async function descontarStock({ detalles, venta, usuario_id, transaction }) {
    for (const d of detalles) {
        const prod = await Producto.findByPk(d.producto_id, { transaction, lock: transaction.LOCK.UPDATE });
        if (!prod) continue;

        const stockAnterior = prod.stock;
        const stockNuevo = stockAnterior - d.cantidad;
        await prod.update({ stock: stockNuevo }, { transaction });

        // Alerta asíncrona si cruza el umbral mínimo
        if (stockAnterior > prod.stock_minimo && stockNuevo <= prod.stock_minimo) {
            enviarAlertaStock(prod, stockNuevo);
        }

        await InventarioMovimiento.create({
            producto_id: d.producto_id,
            tipo: 'salida',
            cantidad: d.cantidad,
            stock_anterior: stockAnterior,
            stock_nuevo: stockNuevo,
            motivo: `Venta ${venta.numero_comprobante}`,
            referencia_id: venta.id,
            referencia_tipo: 'venta',
            usuario_id,
        }, { transaction });
    }
}

/**
 * Devuelve al stock lo vendido (anulación de venta o pedido cancelado).
 * `venta.detalles` debe venir cargado.
 */
async function restituirStock({ venta, usuario_id, motivo, transaction }) {
    for (const d of venta.detalles || []) {
        const prod = await Producto.findByPk(d.producto_id, { transaction, lock: transaction.LOCK.UPDATE });
        if (!prod) continue;

        const stockAnterior = parseFloat(prod.stock);
        const stockNuevo = stockAnterior + parseFloat(d.cantidad);
        await prod.update({ stock: stockNuevo }, { transaction });
        await InventarioMovimiento.create({
            producto_id: d.producto_id,
            tipo: 'entrada',
            cantidad: d.cantidad,
            stock_anterior: stockAnterior,
            stock_nuevo: stockNuevo,
            motivo: motivo || `Anulación venta ${venta.numero_comprobante}`,
            referencia_id: venta.id,
            referencia_tipo: 'anulacion_venta',
            usuario_id,
        }, { transaction });
    }
}

/** Puntos de fidelidad: 1 punto por cada 10 soles. Solo al completar la venta. */
async function otorgarPuntos({ venta, transaction }) {
    if (!venta.cliente_id) return;
    const puntos = Math.floor(parseFloat(venta.total) / 10);
    if (puntos <= 0) return;
    await Cliente.increment('puntos', { by: puntos, where: { id: venta.cliente_id }, transaction });
}

module.exports = { descontarStock, restituirStock, otorgarPuntos };
