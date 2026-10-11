const nodemailer = require('nodemailer');
const { Configuracion } = require('../models');

/**
 * Envía un correo de alerta de stock crítico al administrador
 * @param {object} producto Instancia del producto proveniente de la BD
 * @param {number} nuevoStock El stock que acaba de quedar luego de la resta
 */
const enviarAlertaStock = async (producto, nuevoStock) => {
    try {
        const configAll = await Configuracion.findAll();
        const cfg = configAll.reduce((acc, curr) => ({ ...acc, [curr.clave]: curr.valor }), {});

        if (!cfg.smtp_host || !cfg.smtp_user || !cfg.smtp_pass || !cfg.email_notificaciones) {
            console.log('Faltan credenciales SMTP u origen/destinatario. Alerta de email omitida.');
            return false;
        }

        const transporter = nodemailer.createTransport({
            host: cfg.smtp_host,
            port: parseInt(cfg.smtp_port) || 465,
            secure: cfg.smtp_secure === 'true',
            auth: { user: cfg.smtp_user, pass: cfg.smtp_pass },
            tls: { rejectUnauthorized: false } // Para desarrollo
        });

        const htmlPlantilla = `
            <div style="font-family: Helvetica, Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                <h2 style="color: #e91e8c; text-align: center; border-bottom: 2px solid #e91e8c; padding-bottom: 10px;">⚠️ Alerta de Stock Crítico</h2>
                <p style="font-size: 14px; color: #333;">Hola Administrador,</p>
                <p style="font-size: 14px; color: #333;">El producto <strong>${producto.nombre}</strong> ha alcanzado o superado su límite inferior de stock.</p>
                
                <div style="background: #fff5f9; padding: 20px; border-left: 4px solid #e91e8c; margin: 20px 0; border-radius: 4px;">
                    <ul style="list-style: none; padding: 0; margin: 0; font-size: 15px;">
                        <li style="margin-bottom: 8px;">🏷️ <strong>Producto:</strong> ${producto.nombre}</li>
                        <li style="margin-bottom: 8px;">📉 <strong>Stock Restante:</strong> <span style="color: red; font-size: 18px; font-weight: 900;">${nuevoStock}</span> uds.</li>
                        <li>🔔 <strong>Alerta programada en:</strong> ${producto.stock_minimo || 0} uds.</li>
                    </ul>
                </div>
                
                <p style="font-size: 14px; color: #333;">Te sugerimos reabastecer el almacén lo antes posible.</p>
                
                <hr style="border-top: 1px solid #eee; margin: 30px 0;" />
                <p style="font-size: 11px; color: #999; text-align: center;">Generado por Sistema de Alertas de Pollería.<br>No respondas a este mensaje automatizado.</p>
            </div>
        `;

        await transporter.sendMail({
            from: `"Alerta Sistema" <${cfg.smtp_user}>`,
            to: cfg.email_notificaciones,
            subject: `⚠️ URGENTE: Stock bajo para ${producto.nombre}`,
            html: htmlPlantilla
        });

        console.log(`[EmailService] Alerta de stock (${producto.nombre}) enviada a ${cfg.email_notificaciones}`);
        return true;
    } catch (err) {
        console.error('[EmailService] Error enviando correo:', err.message);
        return false;
    }
};

module.exports = { enviarAlertaStock };
