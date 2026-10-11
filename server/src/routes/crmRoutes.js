const router = require('express').Router();
const c = require('../controllers/crmController');
const auth = require('../middlewares/auth');

router.get('/interacciones/:clienteId', auth, c.getInteraccionesByCliente);
router.post('/interacciones', auth, c.createInteraccion);
router.delete('/interacciones/:id', auth, c.removeInteraccion);
router.post('/actualizar-segmentos', auth, c.actualizarSegmentos);
router.post('/campana-email', auth, c.enviarCampanaEmail);

module.exports = router;
