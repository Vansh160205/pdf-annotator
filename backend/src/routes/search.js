const express = require('express');
const searchController = require('../controllers/searchController');
const auth = require('../middlewares/auth');

const router = express.Router();

// Search routes
router.get('/search', auth, searchController.search);
router.get('/suggestions', auth, searchController.getSuggestions);
router.post('/index-pdf/:uuid', auth, searchController.indexPdf);

module.exports = router;