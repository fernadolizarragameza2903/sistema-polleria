/**
 * Helpers de fecha en hora LOCAL del navegador.
 *
 * Evitan dos trampas comunes de JavaScript:
 *  - `date.toISOString()` devuelve la fecha en UTC: en Lima, desde las 19:00
 *    ya es "mañana" y se pide al backend un día que no corresponde.
 *  - `new Date('2026-10-11')` se interpreta como medianoche UTC, que en Lima
 *    es el día ANTERIOR a las 19:00; el gráfico etiqueta cada punto con un día
 *    de desfase (el lunes aparece como "domingo").
 */

const dosDigitos = (n) => String(n).padStart(2, '0');

/** 'YYYY-MM-DD' de la fecha dada, en hora local. */
export const fechaLocalISO = (fecha = new Date()) =>
    `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;

/** 'YYYY-MM-DD' desplazado n días respecto de hoy (n negativo = pasado). */
export const fechaLocalRelativa = (n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return fechaLocalISO(d);
};

/** Convierte 'YYYY-MM-DD' en un Date a medianoche LOCAL (sin desfase UTC). */
export const parseFechaLocal = (ymd) => {
    const [y, m, d] = String(ymd).slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d);
};
