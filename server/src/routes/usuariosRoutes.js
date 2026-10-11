const router = require('express').Router();
const c = require('../controllers/usuariosController');
const auth = require('../middlewares/auth');
const checkRole = require('../middlewares/checkRole');
router.get('/', auth, checkRole('administrador'), c.getAll);
router.post('/', auth, checkRole('administrador'), c.create);
router.put('/:id', auth, checkRole('administrador'), c.update);
router.delete('/:id', auth, checkRole('administrador'), c.remove);
module.exports = router;
