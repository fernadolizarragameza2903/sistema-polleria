const router = require('express').Router();
const c = require('../controllers/productosController');
const auth = require('../middlewares/auth');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

router.get('/', auth, c.getAll);
router.get('/bajo-stock', auth, c.getLowStock);
router.get('/movimientos', auth, c.getMovimientos);
router.get('/:id', auth, c.getOne);
router.post('/', auth, upload.single('imagen'), c.create);
router.put('/:id', auth, upload.single('imagen'), c.update);
router.put('/:id/ajustar-stock', auth, c.ajustarStock);
router.delete('/:id', auth, c.remove);
module.exports = router;
