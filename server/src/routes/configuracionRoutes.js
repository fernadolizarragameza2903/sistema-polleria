const router = require('express').Router();
const c = require('../controllers/configuracionController');
const auth = require('../middlewares/auth');
router.get('/', auth, c.getAll);
router.put('/', auth, c.update);
module.exports = router;
