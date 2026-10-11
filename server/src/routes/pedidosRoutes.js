const router = require('express').Router();
const c = require('../controllers/pedidosController');
const auth = require('../middlewares/auth');
router.get('/', auth, c.getAll);
router.post('/', auth, c.create);
router.put('/:id/estado', auth, c.updateEstado);
module.exports = router;
