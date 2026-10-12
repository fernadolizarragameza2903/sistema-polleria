require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const sequelize = require('./config/db');
require('./models'); // loaded to setup associations

if (!process.env.JWT_SECRET) {
    console.error('❌ Falta la variable de entorno JWT_SECRET (revisa server/.env.example)');
    process.exit(1);
}

const app = express();

// Render pone un proxy delante: así req.ip (auditoría) es la IP real del cliente.
app.set('trust proxy', 1);

// CORS público por defecto ('*'). La autenticación va en el header Authorization
// (no en cookies), por eso no hace falta `credentials`. Para restringirlo, define
// CORS_ORIGIN con la URL del frontend (o varias separadas por coma).
// El navegador envía el origen sin "/" final: se normaliza para que coincida.
const origenes = (process.env.CORS_ORIGIN || '*').split(',').map(o => o.trim().replace(/\/+$/, '')).filter(Boolean);
app.use(cors({ origin: origenes.includes('*') ? '*' : origenes }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Directorio de uploads
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// Rutas API
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/productos', require('./routes/productosRoutes'));
app.use('/api/categorias', require('./routes/categoriasRoutes'));
app.use('/api/clientes', require('./routes/clientesRoutes'));
app.use('/api/proveedores', require('./routes/proveedoresRoutes'));
app.use('/api/ventas', require('./routes/ventasRoutes'));
app.use('/api/caja', require('./routes/cajaRoutes'));
app.use('/api/pedidos', require('./routes/pedidosRoutes'));
app.use('/api/compras', require('./routes/comprasRoutes'));
app.use('/api/reportes', require('./routes/reportesRoutes'));
app.use('/api/usuarios', require('./routes/usuariosRoutes'));
app.use('/api/configuracion', require('./routes/configuracionRoutes'));
app.use('/api/logs', require('./routes/logRoutes'));
app.use('/api/promociones', require('./routes/promocionesRoutes'));
app.use('/api/crm', require('./routes/crmRoutes'));

// Ruta de salud
app.get('/api/health', (req, res) => res.json({ ok: true, msg: 'Servidor de Pollería activo 🐔' }));

// Manejo de errores global
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ ok: false, msg: 'Error interno del servidor', error: err.message });
});

// Render asigna el puerto en PORT; en local se usa 3001.
const PORT = parseInt(process.env.PORT, 10) || 3001;

sequelize.authenticate()
    .then(() => {
        console.log('✅ Conexión a BD exitosa');
        app.listen(PORT, '0.0.0.0', () => console.log(`🐔 Servidor escuchando en el puerto ${PORT}`));
    })
    .catch(err => {
        console.error('❌ Error de conexión a BD:', err.message);
        process.exit(1);
    });
