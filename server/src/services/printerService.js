const ThermalPrinter = require('node-thermal-printer').printer;
const PrinterTypes = require('node-thermal-printer').types;
const { Configuracion } = require('../models');

/**
 * 
 * @param {object} venta Objeto completo de la venta, con .cliente y .detalles[] (con .producto)
 * @param {object} opciones { reImpresion: boolean }
 * @returns {Promise<{ ok: boolean, msg: string }>}
 */
const imprimirTicket = async (venta, opciones = {}) => {
    try {
        // 1. Obtener la configuración global de la DB
        const configAll = await Configuracion.findAll();
        const cfg = configAll.reduce((acc, curr) => ({ ...acc, [curr.clave]: curr.valor }), {});

        if (cfg.printer_enabled !== 'true') {
            return { ok: false, msg: 'La impresión directa por backend está deshabilitada.' };
        }

        const printerPath = cfg.printer_path;
        if (!printerPath) {
            return { ok: false, msg: 'No se ha configurado la ruta de la impresora.' };
        }

        // 2. Configurar la impresora
        let printer = new ThermalPrinter({
            type: cfg.printer_width === '80' ? PrinterTypes.EPSON : PrinterTypes.EPSON,  // ESC/POS funciona usualmente para ambas
            interface: printerPath,
            characterSet: 'SLOVENIA',
            removeSpecialCharacters: false,
            lineCharacter: "=",
            width: cfg.printer_width === '80' ? 48 : 32 // caracteres por línea aproximado
        });

        // 3. Evaluar conexión
        let isConnected = await printer.isPrinterConnected();
        if (!isConnected) {
            return { ok: false, msg: `No se puede comunicar con la impresora en la ruta: ${printerPath}. Verifica si está encendida y compartida correctamente.` };
        }

        const moneda = cfg.moneda_simbolo || 'S/.';
        const is80 = cfg.printer_width === '80';

        // 4. Armar el Ticket
        printer.alignCenter();
        if (cfg.empresa_nombre) {
            printer.bold(true);
            printer.println(cfg.empresa_nombre);
            printer.bold(false);
        }
        if (cfg.empresa_ruc) printer.println(`RUC: ${cfg.empresa_ruc}`);
        if (cfg.empresa_direccion) printer.println(cfg.empresa_direccion);
        if (cfg.empresa_telefono) printer.println(`Tel: ${cfg.empresa_telefono}`);

        printer.drawLine();

        printer.bold(true);
        if (opciones.reImpresion) {
            printer.println('RE-IMPRESION DE TICKET');
        } else {
            printer.println('TICKET DE VENTA');
        }
        printer.bold(false);

        printer.println(venta.numero_comprobante);
        printer.println(new Date(venta.created_at).toLocaleString('es-PE'));

        printer.alignLeft();
        printer.println(`Tipo: ${venta.tipo_venta.toUpperCase()}`);
        if (venta.cliente) {
            printer.println(`Cliente: ${venta.cliente.nombre}`);
            if (venta.cliente.documento_numero) printer.println(`Doc: ${venta.cliente.documento_numero}`);
        }

        printer.drawLine();
        printer.bold(true);
        printer.println('PRODUCTOS');
        printer.bold(false);

        venta.detalles.forEach(d => {
            let desc = d.producto ? d.producto.nombre : `Prod #${d.producto_id}`;
            let lineaTotal = `${d.cantidad} x ${parseFloat(d.precio_unitario).toFixed(2)}`;
            let subtotal = `${moneda} ${parseFloat(d.subtotal).toFixed(2)}`;

            printer.println(desc);
            printer.leftRight(lineaTotal, subtotal);
        });

        printer.drawLine();
        printer.bold(true);
        printer.println(`Subtotal: ${moneda} ${parseFloat(venta.subtotal).toFixed(2)}`);
        if (venta.descuento > 0) printer.println(`Dscto.: -${moneda} ${parseFloat(venta.descuento).toFixed(2)}`);
        printer.println(`TOTAL: ${moneda} ${parseFloat(venta.total).toFixed(2)}`);
        printer.bold(false);

        printer.drawLine();
        printer.println(`Pago con: ${venta.metodo_pago.toUpperCase()}`);
        if (venta.metodo_pago === 'efectivo') {
            printer.println(`Recibido: ${moneda} ${parseFloat(venta.monto_recibido || venta.total).toFixed(2)}`);
            printer.println(`Vuelto: ${moneda} ${parseFloat(venta.vuelto || 0).toFixed(2)}`);
        }

        printer.alignCenter();
        printer.newLine();
        printer.println('¡Gracias por su compra!');
        printer.newLine();
        printer.newLine();
        printer.newLine();
        printer.beep();
        printer.cut();

        // 5. Ejecutar Impresión
        await printer.execute();
        printer.clear();

        return { ok: true, msg: 'Ticket enviado a la impresora' };

    } catch (error) {
        console.error('Error PrinterService:', error);
        return { ok: false, msg: `Fallo al generar la impresión: ${error.message}` };
    }
};

module.exports = { imprimirTicket };
