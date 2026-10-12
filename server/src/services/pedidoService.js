const { Pedido, Venta, DetalleVenta, Caja } = require('../models');
const { restituirStock, otorgarPuntos } = require('./stockService');

/**
 * Ciclo de vida de un pedido delivery y su venta asociada:
 *
 *   pendiente -> preparando -> en_camino -> entregado   (venta: pendiente -> completada)
 *        \___________\______________\____-> cancelado   (venta: -> anulada + stock devuelto)
 *
 * La venta de un delivery nace en estado 'pendiente': el dinero todavía no
 * está en caja (lo trae el repartidor). Recién al marcar 'entregado' pasa a
 * 'completada' y suma en caja, reportes y puntos del cliente.
 */
const ESTADOS_ACTIVOS = ['pendiente', 'preparando', 'en_camino'];
const ESTADOS_FINALES = ['entregado', 'cancelado'];
const ESTADOS = [...ESTADOS_ACTIVOS, ...ESTADOS_FINALES];
const CANALES = ['whatsapp', 'llamada', 'presencial', 'web'];

const texto = (v, max) => {
    const s = String(v ?? '').trim();
    return s ? s.slice(0, max) : null;
};

/**
 * Limpia y valida los datos de delivery que llegan del POS.
 * El teléfono es obligatorio (con él se identifica el pedido); el nombre es opcional.
 * La ubicación exacta no se registra: el cliente la envía al celular de la empresa
 * que usa el repartidor.
 * @returns {{ datos?: object, error?: string }}
 */
function normalizarDatosPedido(entrada = {}) {
    const datos = {
        canal: CANALES.includes(entrada.canal) ? entrada.canal : 'llamada',
        contacto_nombre: texto(entrada.contacto_nombre, 120),
        contacto_telefono: texto(entrada.contacto_telefono, 20)?.replace(/[^\d+]/g, '') || null,
        direccion_entrega: texto(entrada.direccion_entrega, 500),
        referencia: texto(entrada.referencia, 500),
        notas: texto(entrada.notas, 1000),
        costo_delivery: Math.max(0, parseFloat(entrada.costo_delivery) || 0),
        tiempo_estimado: Math.min(Math.max(parseInt(entrada.tiempo_estimado) || 30, 5), 240),
    };

    if (!datos.contacto_telefono || datos.contacto_telefono.replace(/\D/g, '').length < 6) {
        return { error: 'Ingresa el número de teléfono de quien hace el pedido' };
    }
    return { datos };
}

/** Crea el pedido ligado a una venta, dentro de la transacción de la venta. */
async function crearPedidoDeVenta({ venta, datos, usuario_id, transaction }) {
    const pedido = await Pedido.create({
        ...datos,
        cliente_id: venta.cliente_id || null,
        venta_id: venta.id,
        usuario_id,
        estado: 'pendiente',
    }, { transaction });

    // Numeración por id: sin colisiones aunque haya pedidos simultáneos.
    await pedido.update({ numero_pedido: `PED-${String(pedido.id).padStart(6, '0')}` }, { transaction });
    return pedido;
}

/**
 * Cambia el estado de un pedido y aplica los efectos en la venta asociada.
 * @throws {Error} con `status` 400/404 para errores de negocio
 */
async function cambiarEstado({ pedidoId, nuevoEstado, usuario_id, transaction }) {
    if (!ESTADOS.includes(nuevoEstado)) throw errorNegocio(400, 'Estado de pedido no válido');

    const pedido = await Pedido.findByPk(pedidoId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!pedido) throw errorNegocio(404, 'Pedido no encontrado');
    if (pedido.estado === nuevoEstado) return pedido;
    if (ESTADOS_FINALES.includes(pedido.estado)) {
        throw errorNegocio(400, `El pedido ya está ${pedido.estado} y no puede cambiar de estado`);
    }

    const venta = pedido.venta_id
        ? await Venta.findByPk(pedido.venta_id, { include: [{ model: DetalleVenta, as: 'detalles' }], transaction })
        : null;

    if (nuevoEstado === 'entregado' && venta?.estado === 'pendiente') {
        // El dinero entra a la caja abierta en este momento (la que recibe al repartidor).
        const cajaAbierta = await Caja.findOne({ where: { estado: 'abierta' }, transaction });
        await venta.update({ estado: 'completada', caja_id: cajaAbierta?.id ?? venta.caja_id }, { transaction });
        await otorgarPuntos({ venta, transaction });
    }

    if (nuevoEstado === 'cancelado' && venta && venta.estado !== 'anulada') {
        await restituirStock({ venta, usuario_id, motivo: `Pedido cancelado ${pedido.numero_pedido}`, transaction });
        await venta.update({ estado: 'anulada' }, { transaction });
    }

    await pedido.update({
        estado: nuevoEstado,
        fecha_entrega: nuevoEstado === 'entregado' ? new Date() : pedido.fecha_entrega,
    }, { transaction });
    return pedido;
}

function errorNegocio(status, mensaje) {
    const err = new Error(mensaje);
    err.status = status;
    return err;
}

module.exports = {
    ESTADOS, ESTADOS_ACTIVOS, ESTADOS_FINALES,
    normalizarDatosPedido, crearPedidoDeVenta, cambiarEstado,
};
