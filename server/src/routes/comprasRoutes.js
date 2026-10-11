const router = require('express').Router();
const c = require('../controllers/comprasController');
const auth = require('../middlewares/auth');
router.get('/', auth, c.getAll);
router.post('/', auth, c.create);
module.exports = router;
