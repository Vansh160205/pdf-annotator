const express = require('express');
const drawingController = require('../controllers/drawingController');
const auth = require('../middlewares/auth');

const router = express.Router();

// Drawing routes
router.post('/', auth, drawingController.create);
router.get('/pdf/:pdfUuid', auth, drawingController.getByPDF);
router.get('/pdf/:pdfUuid/page/:pageNumber', auth, drawingController.getByPage);
router.get('/', auth, drawingController.getAll);
router.patch('/:uuid', auth, drawingController.update);
router.delete('/:uuid', auth, drawingController.delete);
router.delete('/pdf/:pdfUuid', auth, drawingController.deleteByPDF);

module.exports = router;