const router = require('express').Router();
const c = require('../controllers/ventasController');
const auth = require('../middlewares/auth');
router.get('/', auth, c.getAll);
router.get('/resumen-dia', auth, c.getResumenDia);
router.post('/', auth, c.create);
router.put('/:id/anular', auth, c.anular);
router.post('/:id/imprimir', auth, c.imprimirDirecto);
module.exports = router;
