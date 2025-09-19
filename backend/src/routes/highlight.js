const express = require('express');
const highlightController = require('../controllers/highlightController');
const auth = require('../middlewares/auth');
const { validateHighlight } = require('../middlewares/validation');

const router = express.Router();

// Highlight routes
router.post('/', auth, validateHighlight, highlightController.create);
router.get('/', auth, highlightController.getAll);
router.get('/stats', auth, highlightController.getStats);
router.get('/pdf/:pdfUuid', auth, highlightController.getByPDF);
router.get('/:uuid', auth, highlightController.getById);
router.patch('/:uuid', auth, highlightController.update);
router.delete('/:uuid', auth, highlightController.delete);
router.post('/bulk-delete', auth, highlightController.bulkDelete);

module.exports = router;