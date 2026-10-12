/** Etiquetas y helpers compartidos por POS, Pedidos e Historial de ventas. */

export const CANALES = [
    { value: 'whatsapp', label: 'WhatsApp', emoji: '💬' },
    { value: 'llamada', label: 'Llamada', emoji: '📞' },
    { value: 'presencial', label: 'Presencial', emoji: '🏪' },
    { value: 'web', label: 'Web', emoji: '🌐' },
];

export const canalInfo = (canal) => CANALES.find(c => c.value === canal) || CANALES[1];

/** Nombre a mostrar: cliente registrado, nombre dado por teléfono o "Sin nombre". */
export const nombreContacto = (pedido) =>
    pedido?.cliente?.nombre && pedido.cliente.nombre !== 'Cliente General'
        ? pedido.cliente.nombre
        : pedido?.contacto_nombre || 'Sin nombre';

export const telefonoContacto = (pedido) => pedido?.contacto_telefono || pedido?.cliente?.telefono || '';

/** Link de WhatsApp para escribirle al cliente (asume Perú si no trae código de país). */
export const linkWhatsApp = (telefono) => {
    const digitos = String(telefono || '').replace(/\D/g, '');
    if (!digitos) return null;
    return `https://wa.me/${digitos.length === 9 ? `51${digitos}` : digitos}`;
};

export const METODOS_PAGO = {
    efectivo: 'Efectivo', yape: 'Yape', plin: 'Plin', tarjeta: 'Tarjeta', transferencia: 'Transferencia', mixto: 'Mixto',
};
