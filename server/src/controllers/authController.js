const jwt = require('jsonwebtoken');
const { Usuario, Rol } = require('../models');
const audit = require('../helpers/audit');

// POST /api/auth/login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ ok: false, msg: 'Email y contraseña requeridos' });

        const usuario = await Usuario.findOne({
            where: { email, activo: 1 },
            include: [{ model: Rol, as: 'rol' }],
        });

        if (!usuario) {
            await audit({ usuario_id: null, accion: 'LOGIN_FALLIDO', modulo: 'auth', descripcion: `Intento de login fallido para: ${email}`, ip: req.ip, resultado: 'error' });
            return res.status(401).json({ ok: false, msg: 'Credenciales incorrectas' });
        }

        const valid = await usuario.verificarPassword(password);
        if (!valid) {
            await audit({ usuario_id: usuario.id, accion: 'LOGIN_FALLIDO', modulo: 'auth', descripcion: 'Contraseña incorrecta', ip: req.ip, resultado: 'error' });
            return res.status(401).json({ ok: false, msg: 'Credenciales incorrectas' });
        }

        const token = jwt.sign(
            { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol.nombre },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES || '24h' }
        );

        res.json({
            ok: true,
            token,
            usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol.nombre, avatar: usuario.avatar },
        });

        await audit({ usuario_id: usuario.id, accion: 'LOGIN_EXITOSO', modulo: 'auth', descripcion: 'Inicio de sesión', ip: req.ip });

    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, msg: 'Error del servidor' });
    }
};

// GET /api/auth/me
const me = async (req, res) => {
    try {
        const usuario = await Usuario.findByPk(req.user.id, {
            attributes: { exclude: ['password'] },
            include: [{ model: Rol, as: 'rol' }],
        });
        res.json({ ok: true, usuario });
    } catch (err) {
        res.status(500).json({ ok: false, msg: 'Error del servidor' });
    }
};

module.exports = { login, me };
