const router = require('express').Router();
const c = require('../controllers/categoriasController');
const auth = require('../middlewares/auth');
router.get('/', auth, c.getAll);
router.post('/', auth, c.create);
router.put('/:id', auth, c.update);
router.delete('/:id', auth, c.remove);
module.exports = router;
