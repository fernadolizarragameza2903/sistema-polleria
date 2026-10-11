require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const sequelize = require('./config/db');
require('./models'); // loaded to setup associations

const app = express();

// Middlewares
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
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

const PORT = process.env.PORT || 3001;

sequelize.authenticate()
    .then(() => {
        console.log('✅ Conexión a BD exitosa');
        app.listen(PORT, () => console.log(`🐔 Servidor corriendo en http://localhost:${PORT}`));
    })
    .catch(err => {
        console.error('❌ Error de conexión a BD:', err.message);
        process.exit(1);
    });
