/**
 * Utilidades de fecha en la zona horaria del NEGOCIO.
 *
 * Sequelize guarda `created_at` en UTC (timezone por defecto '+00:00').
 * Una pollería en Lima (UTC-5) que vende de 12:00 a 23:00 cruza la medianoche UTC
 * a las 19:00 hora local, así que agrupar por DATE(created_at) parte la cena
 * (el pico de ventas) y la asigna al día siguiente. Todo cálculo por "día" debe
 * hacerse en hora local del negocio.
 *
 * Perú no usa horario de verano, por lo que un offset fijo es suficiente y no
 * requiere cargar las tablas de zonas horarias de MySQL.
 */
const TZ_NEGOCIO = process.env.TZ_NEGOCIO || '-05:00';
const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

const offsetMinutos = (() => {
    const [, signo, hh, mm] = TZ_NEGOCIO.match(/^([+-])(\d{2}):(\d{2})$/);
    return (signo === '-' ? -1 : 1) * (parseInt(hh) * 60 + parseInt(mm));
})();

const esFechaValida = (ymd) => typeof ymd === 'string' && FORMATO_FECHA.test(ymd);

/** 'YYYY-MM-DD' del instante dado, visto en la zona del negocio. */
const fechaLocal = (instante = new Date()) =>
    new Date(instante.getTime() + offsetMinutos * 60000).toISOString().slice(0, 10);

/** Hora 'HH:mm' del instante dado, en la zona del negocio. */
const horaLocal = (instante = new Date()) =>
    new Date(instante.getTime() + offsetMinutos * 60000).toISOString().slice(11, 16);

/** Suma (o resta) días a una fecha 'YYYY-MM-DD' sin depender de la zona del servidor. */
const sumarDias = (ymd, n) => {
    const d = new Date(`${ymd}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
};

/** Instantes UTC que delimitan el rango [desde 00:00, hasta 23:59:59.999] en hora local. */
const rangoUTC = (desde, hasta) => ({
    inicio: new Date(`${desde}T00:00:00.000${TZ_NEGOCIO}`),
    fin: new Date(`${hasta}T23:59:59.999${TZ_NEGOCIO}`),
});

/** Lista de fechas 'YYYY-MM-DD' entre desde y hasta (inclusive). */
const enumerarDias = (desde, hasta) => {
    const dias = [];
    for (let d = desde; d <= hasta; d = sumarDias(d, 1)) dias.push(d);
    return dias;
};

/**
 * Normaliza los parámetros ?desde&hasta de un request.
 * Si faltan o son inválidos usa los valores por defecto (en hora local).
 */
const resolverRango = ({ desde, hasta }, { desdePorDefecto, hastaPorDefecto } = {}) => {
    const hoy = fechaLocal();
    const d = esFechaValida(desde) ? desde : (desdePorDefecto || hoy);
    const h = esFechaValida(hasta) ? hasta : (hastaPorDefecto || hoy);
    return d <= h ? { desde: d, hasta: h } : { desde: h, hasta: d };
};

module.exports = {
    TZ_NEGOCIO,
    esFechaValida,
    fechaLocal,
    horaLocal,
    sumarDias,
    rangoUTC,
    enumerarDias,
    resolverRango,
};
