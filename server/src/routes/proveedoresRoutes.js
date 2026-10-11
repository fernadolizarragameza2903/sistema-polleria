const router = require('express').Router();
const c = require('../controllers/proveedoresController');
const auth = require('../middlewares/auth');
router.get('/', auth, c.getAll);
router.get('/:id', auth, c.getOne);
router.post('/', auth, c.create);
router.put('/:id', auth, c.update);
router.delete('/:id', auth, c.remove);
module.exports = router;
