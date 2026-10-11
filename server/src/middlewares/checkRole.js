const checkRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ ok: false, msg: 'No autenticado' });
        if (!roles.includes(req.user.rol)) {
            return res.status(403).json({ ok: false, msg: 'Acceso denegado: permisos insuficientes' });
        }
        next();
    };
};

module.exports = checkRole;
