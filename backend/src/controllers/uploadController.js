const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

class UploadController {
  constructor() {
    this.initializeStorage();
  }

  initializeStorage() {
    this.storage = multer.diskStorage({
      destination: async (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'uploads');
        try {
          await fs.access(uploadDir);
        } catch (error) {
          await fs.mkdir(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uuid = uuidv4();
        const ext = path.extname(file.originalname);
        cb(null, `${uuid}${ext}`);
      }
    });

    this.upload = multer({
      storage: this.storage,
      limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024, // 50MB default
        files: 1
      },
      fileFilter: this.fileFilter
    });
  }

  fileFilter(req, file, cb) {
    // Only allow PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }

  // Single file upload middleware
  single(fieldName) {
    return this.upload.single(fieldName);
  }

  // Multiple files upload middleware
  array(fieldName, maxCount = 5) {
    return this.upload.array(fieldName, maxCount);
  }

  // Handle upload errors
  handleUploadError(error, req, res, next) {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large' });
      }
      if (error.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ error: 'Too many files' });
      }
      if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ error: 'Unexpected file field' });
      }
    }
    
    if (error.message === 'Only PDF files are allowed') {
      return res.status(400).json({ error: 'Only PDF files are allowed' });
    }

    next(error);
  }

  // Clean up uploaded files
  async cleanup(filePaths) {
    if (!Array.isArray(filePaths)) {
      filePaths = [filePaths];
    }

    const cleanupPromises = filePaths.map(async (filePath) => {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        console.error('Error cleaning up file:', filePath, error);
      }
    });

    await Promise.all(cleanupPromises);
  }
}

module.exports = new UploadController();