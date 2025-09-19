const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const pdfController = require('../controllers/pdfController');
const auth = require('../middlewares/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uuid = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${uuid}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// PDF routes
router.post('/upload', auth, upload.single('pdf'), pdfController.upload);
router.get('/list', auth, pdfController.list);
router.get('/stats', auth, pdfController.getStats);
router.get('/:uuid', auth, pdfController.getFile);
router.get('/:uuid/metadata', auth, pdfController.getMetadata);
router.delete('/:uuid', auth, pdfController.delete);
router.patch('/:uuid/rename', auth, pdfController.rename);

module.exports = router;