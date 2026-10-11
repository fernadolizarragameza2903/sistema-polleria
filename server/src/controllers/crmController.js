const { CrmInteraccion, Cliente, Usuario, Venta, sequelize } = require('../models');
const { Op } = require('sequelize');
const nodemailer = require('nodemailer');
const { Configuracion } = require('../models');

// Obtener todas las interacciones de un cliente
const getInteraccionesByCliente = async (req, res) => {
    try {
        const interacciones = await CrmInteraccion.findAll({
            where: { cliente_id: req.params.clienteId },
            include: [{ model: Usuario, as: 'usuario', attributes: ['id', 'nombre'] }],
            order: [['fecha', 'DESC']]
        });
        res.json({ ok: true, interacciones });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

// Crear nueva interacción
const createInteraccion = async (req, res) => {
    try {
        const interaccion = await CrmInteraccion.create({
            cliente_id: req.body.cliente_id,
            usuario_id: req.user.id,
            tipo: req.body.tipo,
            observacion: req.body.observacion,
            fecha: new Date()
        });

        const interaccionConUser = await CrmInteraccion.findByPk(interaccion.id, {
            include: [{ model: Usuario, as: 'usuario', attributes: ['id', 'nombre'] }]
        });

        res.status(201).json({ ok: true, interaccion: interaccionConUser });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

// Eliminar interacción
const removeInteraccion = async (req, res) => {
    try {
        const interaccion = await CrmInteraccion.findByPk(req.params.id);
        if (!interaccion) return res.status(404).json({ ok: false, msg: 'No encontrada' });
        await interaccion.destroy();
        res.json({ ok: true, msg: 'Interacción eliminada' });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

// Actualizar segmentos masivamente en base al historial de ventas
const actualizarSegmentos = async (req, res) => {
    try {
        const haceUnMes = new Date();
        haceUnMes.setMonth(haceUnMes.getMonth() - 1);

        const clientes = await Cliente.findAll({
            include: [{ model: Venta, as: 'ventas' }]
        });

        let actualizados = 0;

        for (const c of clientes) {
            let nuevoSegmento = 'nuevo';
            const cantidadVentas = c.ventas ? c.ventas.length : 0;

            if (cantidadVentas === 0) {
                nuevoSegmento = 'nuevo';
            } else {
                const ultimaVenta = c.ventas.reduce((latest, v) => new Date(v.created_at) > new Date(latest.created_at) ? v : latest, c.ventas[0]);

                if (new Date(ultimaVenta.created_at) < haceUnMes) {
                    nuevoSegmento = 'inactivo';
                } else if (cantidadVentas >= 5) {
                    nuevoSegmento = 'vip';
                } else if (cantidadVentas >= 2) {
                    nuevoSegmento = 'frecuente';
                }
            }

            if (c.segmento !== nuevoSegmento) {
                await c.update({ segmento: nuevoSegmento });
                actualizados++;
            }
        }

        res.json({ ok: true, msg: `Se actualizaron los segmentos de ${actualizados} clientes`, actualizados });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

// Enviar campaña por email
const enviarCampanaEmail = async (req, res) => {
    const { titulo, mensaje, segmento } = req.body;

    if (!titulo || !mensaje || !segmento) {
        return res.status(400).json({ ok: false, msg: 'Faltan parámetros' });
    }

    try {
        const whereClause = { activo: 1, email: { [Op.not]: null, [Op.ne]: '' } };
        if (segmento !== 'todos') {
            whereClause.segmento = segmento;
        }

        const clientes = await Cliente.findAll({ where: whereClause });
        if (clientes.length === 0) {
            return res.json({ ok: false, msg: 'No se encontraron clientes con email en este segmento' });
        }

        const configAll = await Configuracion.findAll();
        const cfg = configAll.reduce((acc, curr) => ({ ...acc, [curr.clave]: curr.valor }), {});

        if (!cfg.smtp_host || !cfg.smtp_user || !cfg.smtp_pass) {
            return res.status(400).json({ ok: false, msg: 'Credenciales SMTP no configuradas' });
        }

        const transporter = nodemailer.createTransport({
            host: cfg.smtp_host,
            port: parseInt(cfg.smtp_port) || 465,
            secure: cfg.smtp_secure === 'true',
            auth: { user: cfg.smtp_user, pass: cfg.smtp_pass },
            tls: { rejectUnauthorized: false }
        });

        const emails = clientes.map(c => c.email);

        const htmlPlantilla = `
            <div style="font-family: Helvetica, Arial, sans-serif; padding: 20px; border: 1px solid #ddd; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #e91e8c;">${cfg.empresa_nombre || 'Sistema Pollería'}</h2>
                <p style="font-size: 16px;">Hola,</p>
                <div style="font-size: 15px; color: #333; line-height: 1.5; margin: 20px 0;">
                    ${mensaje.replace(/\n/g, '<br/>')}
                </div>
                <hr style="border-top: 1px solid #eee;" />
                <p style="font-size: 12px; color: #999;">Esto es una comunicación administrativa. Por favor no respondas a este correo.</p>
            </div>
        `;

        await transporter.sendMail({
            from: `"${cfg.empresa_nombre || 'Pollería'}" <${cfg.smtp_user}>`,
            bcc: emails, // Oculto a todos los clientes
            subject: titulo,
            html: htmlPlantilla
        });

        // Registrar en bitácora para cada cliente
        const interaccionesPromises = clientes.map(c => CrmInteraccion.create({
            cliente_id: c.id,
            usuario_id: req.user.id,
            tipo: 'email',
            observacion: `Campaña enviada: ${titulo}`,
            fecha: new Date()
        }));
        await Promise.all(interaccionesPromises);

        res.json({ ok: true, msg: `Campaña enviada a ${clientes.length} clientes` });
    } catch (err) {
        console.error('Error enviando campaña:', err);
        res.status(500).json({ ok: false, msg: err.message });
    }
};

module.exports = { getInteraccionesByCliente, createInteraccion, removeInteraccion, actualizarSegmentos, enviarCampanaEmail };
