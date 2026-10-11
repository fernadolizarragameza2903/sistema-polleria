const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/db');

const Usuario = sequelize.define('Usuario', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    email: { type: DataTypes.STRING(100), allowNull: false, unique: true, validate: { isEmail: true } },
    password: { type: DataTypes.STRING(255), allowNull: false },
    rol_id: { type: DataTypes.INTEGER, defaultValue: 2 },
    activo: { type: DataTypes.TINYINT(1), defaultValue: 1 },
    avatar: { type: DataTypes.STRING(255) },
}, {
    tableName: 'usuarios',
    timestamps: true,
    hooks: {
        beforeCreate: async (user) => {
            if (user.password) {
                user.password = await bcrypt.hash(user.password, 10);
            }
        },
        beforeUpdate: async (user) => {
            if (user.changed('password')) {
                user.password = await bcrypt.hash(user.password, 10);
            }
        },
    },
});

Usuario.prototype.verificarPassword = function (password) {
    return bcrypt.compare(password, this.password);
};

module.exports = Usuario;
