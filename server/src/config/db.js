const { Sequelize } = require('sequelize');
require('dotenv').config();

/**
 * Conexión a MySQL leída SOLO desde variables de entorno.
 *
 * Producción (Render + Aiven):  MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD,
 *                               MYSQL_DATABASE, MYSQL_SSL=true (y opcional MYSQL_CA_CERT)
 * Local (XAMPP): también acepta los nombres antiguos DB_HOST, DB_USER, ... para no
 * romper instalaciones existentes.
 */
const env = (nombre, antiguo) => process.env[nombre] ?? process.env[antiguo];

const config = {
    host: env('MYSQL_HOST', 'DB_HOST'),
    port: parseInt(env('MYSQL_PORT', 'DB_PORT') || '3306', 10),
    user: env('MYSQL_USER', 'DB_USER'),
    password: env('MYSQL_PASSWORD', 'DB_PASSWORD') ?? '',
    database: env('MYSQL_DATABASE', 'DB_NAME'),
};

const faltantes = ['host', 'user', 'database'].filter(k => !config[k]);
if (faltantes.length) {
    const nombres = { host: 'MYSQL_HOST', user: 'MYSQL_USER', database: 'MYSQL_DATABASE' };
    throw new Error(`Faltan variables de entorno de la base de datos: ${faltantes.map(k => nombres[k]).join(', ')}. Revisa server/.env.example`);
}

// Aiven (y la mayoría de MySQL en la nube) exige conexión cifrada.
// Con MYSQL_CA_CERT (contenido del ca.pem de Aiven) se verifica el certificado del servidor;
// sin él la conexión igual va cifrada, pero sin verificar quién responde.
const usarSSL = String(process.env.MYSQL_SSL).toLowerCase() === 'true';
const ssl = usarSSL
    ? (process.env.MYSQL_CA_CERT
        ? { ca: process.env.MYSQL_CA_CERT.replace(/\\n/g, '\n'), rejectUnauthorized: true }
        : { rejectUnauthorized: false })
    : undefined;

const sequelize = new Sequelize(config.database, config.user, config.password, {
    host: config.host,
    port: config.port,
    dialect: 'mysql',
    logging: false,
    timezone: '+00:00', // las fechas se guardan en UTC; la zona del negocio se aplica en las consultas
    dialectOptions: ssl ? { ssl } : {},
    // El plan gratuito de Aiven limita las conexiones simultáneas: un pool pequeño basta.
    pool: { max: parseInt(process.env.MYSQL_POOL_MAX || '5', 10), min: 0, acquire: 30000, idle: 10000 },
    define: {
        timestamps: true,
        underscored: false,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    },
});

module.exports = sequelize;
