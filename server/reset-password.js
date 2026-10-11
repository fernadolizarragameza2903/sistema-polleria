const bcrypt = require('bcryptjs');
const sequelize = require('./src/config/db');

async function resetPassword() {
    try {
        await sequelize.authenticate();
        const hash = await bcrypt.hash('admin123', 10);
        await sequelize.query(`UPDATE usuarios SET password = '${hash}' WHERE email IN ('admin@polleria.com', 'cajero@polleria.com')`);
        console.log('✅ Contraseñas actualizadas correctamente');
        console.log('Hash:', hash);
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

resetPassword();
