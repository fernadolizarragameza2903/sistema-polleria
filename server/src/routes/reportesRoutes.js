const router = require('express').Router();
const c = require('../controllers/reportesController');
const auth = require('../middlewares/auth');
router.get('/resumen', auth, c.getResumenGeneral);
router.get('/rentabilidad', auth, c.getRentabilidad);
router.get('/clientes-top', auth, c.getTopClientes);
module.exports = router;
