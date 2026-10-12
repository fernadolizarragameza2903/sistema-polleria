const router = require('express').Router();
const c = require('../controllers/pedidosController');
const auth = require('../middlewares/auth');
// Los pedidos delivery se crean desde el POS (POST /api/ventas con tipo_venta = 'delivery').
router.get('/', auth, c.getAll);
router.get('/:id', auth, c.getOne);
router.put('/:id/estado', auth, c.updateEstado);
module.exports = router;
