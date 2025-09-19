const express = require('express');
const cloudStorageController = require('../controllers/cloudStorageController');
const auth = require('../middlewares/auth');

const router = express.Router();

// Get Google Drive authorization URL
router.get('/auth/url', auth, cloudStorageController.getAuthUrl);

// Add this route to your routes file
router.get('/user-pdfs', auth, cloudStorageController.getUserPDFs);

// Handle OAuth callback
router.get('/auth/callback', cloudStorageController.handleCallback);

// Upload PDF to cloud storage
router.post('/upload/:pdfUuid', auth, cloudStorageController.uploadPDF);

// Import PDF from cloud storage
router.post('/import', auth, cloudStorageController.importPDF);

// List cloud files
router.get('/files', auth, cloudStorageController.listFiles);

// Get cloud files for a specific PDF
router.get('/files/:pdfUuid', auth, cloudStorageController.getCloudFiles);

// Create shareable link
router.post('/share/:cloudFileUuid', auth, cloudStorageController.createShareableLink);

// Delete cloud file
router.delete('/files/:cloudFileUuid', auth, cloudStorageController.deleteCloudFile);

module.exports = router;