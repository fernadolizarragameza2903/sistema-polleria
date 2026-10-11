const { Producto, Categoria, InventarioMovimiento, sequelize } = require('../models');
const audit = require('../helpers/audit');
const { enviarAlertaStock } = require('../services/emailService');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');

const getAll = async (req, res) => {
    try {
        const { search, categoria_id, activo, featured } = req.query;
        const where = {};
        if (search) where.nombre = { [Op.like]: `%${search}%` };
        if (categoria_id) where.categoria_id = categoria_id;
        if (activo !== undefined) where.activo = activo;
        if (featured) where.featured = featured;
        const productos = await Producto.findAll({
            where,
            include: [{ model: Categoria, as: 'categoria' }],
            order: [['nombre', 'ASC']],
        });
        res.json({ ok: true, productos });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

const getOne = async (req, res) => {
    try {
        const p = await Producto.findByPk(req.params.id, { include: [{ model: Categoria, as: 'categoria' }] });
        if (!p) return res.status(404).json({ ok: false, msg: 'Producto no encontrado' });
        res.json({ ok: true, producto: p });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

const create = async (req, res) => {
    try {
        const data = { ...req.body };
        if (req.file) data.imagen = `/uploads/${req.file.filename}`;
        const producto = await Producto.create(data);
        res.status(201).json({ ok: true, producto });

        await audit({ usuario_id: req.user.id, accion: 'PRODUCTO_CREAR', modulo: 'productos', descripcion: `Producto creado: ${producto.nombre}`, ip: req.ip, datos: { producto_id: producto.id } });
    } catch (err) {
        await audit({ usuario_id: req.user.id, accion: 'PRODUCTO_CREAR', modulo: 'productos', descripcion: `Error: ${err.message}`, ip: req.ip, resultado: 'error' });
        res.status(500).json({ ok: false, msg: err.message });
    }
};

const update = async (req, res) => {
    try {
        const p = await Producto.findByPk(req.params.id);
        if (!p) return res.status(404).json({ ok: false, msg: 'Producto no encontrado' });
        const data = { ...req.body };
        if (req.file) data.imagen = `/uploads/${req.file.filename}`;
        await p.update(data);
        res.json({ ok: true, producto: p });

        await audit({ usuario_id: req.user.id, accion: 'PRODUCTO_EDITAR', modulo: 'productos', descripcion: `Producto editado: ${p.nombre}`, ip: req.ip, datos: { producto_id: p.id } });
    } catch (err) {
        await audit({ usuario_id: req.user.id, accion: 'PRODUCTO_EDITAR', modulo: 'productos', descripcion: `Error: ${err.message}`, ip: req.ip, resultado: 'error' });
        res.status(500).json({ ok: false, msg: err.message });
    }
};

const remove = async (req, res) => {
    try {
        const p = await Producto.findByPk(req.params.id);
        if (!p) return res.status(404).json({ ok: false, msg: 'Producto no encontrado' });
        await p.update({ activo: 0 });
        res.json({ ok: true, msg: 'Producto desactivado' });

        await audit({ usuario_id: req.user.id, accion: 'PRODUCTO_ELIMINAR', modulo: 'productos', descripcion: `Producto eliminado: ${p.nombre}`, ip: req.ip, datos: { producto_id: p.id } });
    } catch (err) {
        await audit({ usuario_id: req.user.id, accion: 'PRODUCTO_ELIMINAR', modulo: 'productos', descripcion: `Error: ${err.message}`, ip: req.ip, resultado: 'error' });
        res.status(500).json({ ok: false, msg: err.message });
    }
};

const getLowStock = async (req, res) => {
    try {
        const productos = await Producto.findAll({
            where: { activo: 1 },
            include: [{ model: Categoria, as: 'categoria' }],
        });
        const bajoStock = productos.filter(p => p.stock <= p.stock_minimo);
        res.json({ ok: true, productos: bajoStock });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

const ajustarStock = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { tipo, cantidad, motivo } = req.body; // tipo: 'entrada' | 'salida' | 'ajuste', cantidad positiva
        const p = await Producto.findByPk(req.params.id, { transaction: t });
        if (!p) return res.status(404).json({ ok: false, msg: 'Producto no encontrado' });
        const stockAnterior = parseFloat(p.stock);
        const diff = tipo === 'salida' ? -parseFloat(cantidad) : parseFloat(cantidad);
        const stockNuevo = Math.max(0, stockAnterior + diff);
        await p.update({ stock: stockNuevo }, { transaction: t });

        if (stockAnterior > p.stock_minimo && stockNuevo <= p.stock_minimo) {
            enviarAlertaStock(p, stockNuevo);
        }
        await InventarioMovimiento.create({
            producto_id: p.id,
            tipo: tipo || 'ajuste',
            cantidad: Math.abs(parseFloat(cantidad)),
            stock_anterior: stockAnterior,
            stock_nuevo: stockNuevo,
            motivo: motivo || 'Ajuste manual',
            referencia_tipo: 'ajuste_manual',
            usuario_id: req.user.id,
        }, { transaction: t });
        await t.commit();
        res.json({ ok: true, stock_anterior: stockAnterior, stock_nuevo: stockNuevo });
    } catch (err) {
        await t.rollback();
        res.status(500).json({ ok: false, msg: err.message });
    }
};

const getMovimientos = async (req, res) => {
    try {
        const movimientos = await InventarioMovimiento.findAll({
            where: req.params.id ? { producto_id: req.params.id } : {},
            include: [
                { model: Producto, as: 'producto', attributes: ['id', 'nombre'] },
            ],
            order: [['created_at', 'DESC']],
            limit: 100,
        });
        res.json({ ok: true, movimientos });
    } catch (err) {
        res.status(500).json({ ok: false, msg: err.message });
    }
};

module.exports = { getAll, getOne, create, update, remove, getLowStock, ajustarStock, getMovimientos };
