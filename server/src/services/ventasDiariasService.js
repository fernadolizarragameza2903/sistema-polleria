const { Op } = require('sequelize');
const { Venta, sequelize } = require('../models');
const { TZ_NEGOCIO, fechaLocal, horaLocal, rangoUTC, enumerarDias } = require('../helpers/fechasNegocio');

/**
 * Serie de ventas diarias lista para graficar tendencias sin distorsión.
 *
 * Corrige tres sesgos del agrupado ingenuo por DATE(created_at):
 *  1. Zona horaria: agrupa por día LOCAL del negocio, no por día UTC.
 *  2. Días sin ventas: rellena con 0 para que el eje X sea continuo.
 *  3. Ventana parcial: marca el día en curso con `parcial: true` (y no devuelve
 *     días futuros) para que el frontend no lo compare contra días cerrados.
 *
 * @param {object} opciones
 * @param {string} opciones.desde  'YYYY-MM-DD' en hora local
 * @param {string} opciones.hasta  'YYYY-MM-DD' en hora local
 * @returns {Promise<{ serie: object[], resumen: object }>}
 */
async function obtenerVentasDiarias({ desde, hasta }) {
    const hoy = fechaLocal();
    // No tiene sentido pedir días que aún no existen: recortamos a hoy.
    const hastaEfectivo = hasta > hoy ? hoy : hasta;
    if (desde > hastaEfectivo) return { serie: [], resumen: resumirSerie([]) };

    const { inicio, fin } = rangoUTC(desde, hastaEfectivo);

    // DATE(CONVERT_TZ(created_at, '+00:00', '-05:00')) -> día calendario en Lima.
    // La sesión de Sequelize está en '+00:00', así que created_at se lee en UTC.
    const diaLocal = sequelize.fn('DATE', sequelize.fn('CONVERT_TZ', sequelize.col('created_at'), '+00:00', TZ_NEGOCIO));

    const filas = await Venta.findAll({
        where: { created_at: { [Op.between]: [inicio, fin] }, estado: 'completada' },
        attributes: [
            [diaLocal, 'dia'],
            [sequelize.fn('SUM', sequelize.col('total')), 'total'],
            [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
            [sequelize.fn('MAX', sequelize.col('created_at')), 'ultima_venta'],
        ],
        group: ['dia'],
        raw: true,
    });

    const porDia = new Map(filas.map(f => [normalizarDia(f.dia), f]));

    const serie = enumerarDias(desde, hastaEfectivo).map(dia => {
        const fila = porDia.get(dia);
        const total = parseFloat(fila?.total || 0);
        const count = parseInt(fila?.count || 0);
        const parcial = dia === hoy;
        return {
            dia,
            total,
            count,
            ticket_promedio: count > 0 ? +(total / count).toFixed(2) : 0,
            ultima_venta: fila?.ultima_venta ? horaLocal(new Date(fila.ultima_venta)) : null,
            parcial,
            // Hora de corte: hasta dónde llegan los datos del día en curso.
            corte: parcial ? horaLocal() : null,
        };
    });

    return { serie, resumen: resumirSerie(serie) };
}

/** Métricas de referencia calculadas SOLO con días cerrados. */
function resumirSerie(serie) {
    const cerrados = serie.filter(d => !d.parcial);
    const total = cerrados.reduce((s, d) => s + d.total, 0);
    const transacciones = cerrados.reduce((s, d) => s + d.count, 0);
    return {
        tz: TZ_NEGOCIO,
        dias_cerrados: cerrados.length,
        incluye_dia_parcial: serie.some(d => d.parcial),
        promedio_diario: cerrados.length ? +(total / cerrados.length).toFixed(2) : 0,
        ticket_promedio: transacciones ? +(total / transacciones).toFixed(2) : 0,
    };
}

/** mysql2 puede devolver DATE como string o como Date según la configuración. */
function normalizarDia(valor) {
    return valor instanceof Date ? valor.toISOString().slice(0, 10) : String(valor).slice(0, 10);
}

module.exports = { obtenerVentasDiarias };
