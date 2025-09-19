const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const PDF = require('../models/PDF');
const Highlight = require('../models/Highlight');

class PDFController {
  // Upload PDF file
  async upload(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No PDF file uploaded' });
      }

      const pdfUuid = uuidv4();
      
      const pdf = new PDF({
        uuid: pdfUuid,
        filename: req.file.filename,
        originalName: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size,
        userId: req.user._id
      });

      await pdf.save();

      res.status(201).json({
        message: 'PDF uploaded successfully',
        pdf: {
          uuid: pdf.uuid,
          filename: pdf.originalName,
          fileSize: pdf.fileSize,
          uploadDate: pdf.createdAt
        }
      });
    } catch (error) {
      // Clean up uploaded file if database save fails
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.error('Error deleting file:', unlinkError);
        }
      }
      next(error);
    }
  }

  // Get list of user's PDFs
  async list(req, res, next) {
    try {
      const { page = 1, limit = 10, search = '' } = req.query;
      const skip = (page - 1) * limit;

      let query = { userId: req.user._id };
      
      if (search) {
        query.originalName = { $regex: search, $options: 'i' };
      }

      const [pdfs, total] = await Promise.all([
        PDF.find(query)
          .select('uuid originalName fileSize createdAt')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        PDF.countDocuments(query)
      ]);

      res.json({
        pdfs,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get PDF file by UUID
  async getFile(req, res, next) {
    try {
      const { uuid } = req.params;
      
      const pdf = await PDF.findOne({
        uuid: uuid,
        userId: req.user._id
      });

      if (!pdf) {
        return res.status(404).json({ error: 'PDF not found' });
      }

      // Resolve the file path properly
      const resolvedPath = path.resolve(pdf.filePath);

      // Check if file exists
      try {
        await fs.access(resolvedPath);
      } catch (error) {
        return res.status(404).json({ error: 'PDF file not found on server' });
      }

      // Get file stats
      const stats = await fs.stat(resolvedPath);

      // Set proper headers for PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(pdf.originalName)}"`);
      res.setHeader('Content-Length', stats.size);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      
      res.sendFile(resolvedPath, (err) => {
        if (err && !res.headersSent) {
          res.status(500).json({ error: 'Error sending file' });
        }
      });
      
    } catch (error) {
      next(error);
    }
  }

  // Get PDF metadata
  async getMetadata(req, res, next) {
    try {
      const pdf = await PDF.findOne({
        uuid: req.params.uuid,
        userId: req.user._id
      }).select('uuid originalName fileSize createdAt pageCount');

      if (!pdf) {
        return res.status(404).json({ error: 'PDF not found' });
      }

      res.json({ pdf });
    } catch (error) {
      next(error);
    }
  }

  // Delete PDF
  async delete(req, res, next) {
    try {
      const pdf = await PDF.findOne({
        uuid: req.params.uuid,
        userId: req.user._id
      });

      if (!pdf) {
        return res.status(404).json({ error: 'PDF not found' });
      }

      // Delete associated highlights
      await Highlight.deleteMany({ pdfUuid: pdf.uuid, userId: req.user._id });

      // Delete file from filesystem
      try {
        await fs.unlink(pdf.filePath);
      } catch (error) {
        // Continue with database deletion even if file deletion fails
      }

      // Delete PDF record
      await PDF.deleteOne({ _id: pdf._id });

      res.json({ message: 'PDF deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  // Update PDF name
  async rename(req, res, next) {
    try {
      const { name } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Name is required' });
      }

      const pdf = await PDF.findOneAndUpdate(
        { uuid: req.params.uuid, userId: req.user._id },
        { originalName: name.trim() },
        { new: true }
      );

      if (!pdf) {
        return res.status(404).json({ error: 'PDF not found' });
      }

      res.json({
        message: 'PDF renamed successfully',
        pdf: {
          uuid: pdf.uuid,
          filename: pdf.originalName,
          fileSize: pdf.fileSize,
          uploadDate: pdf.createdAt
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get PDF statistics
  async getStats(req, res, next) {
    try {
      const [totalPdfs, totalSize, recentPdfs] = await Promise.all([
        PDF.countDocuments({ userId: req.user._id }),
        PDF.aggregate([
          { $match: { userId: req.user._id } },
          { $group: { _id: null, totalSize: { $sum: '$fileSize' } } }
        ]),
        PDF.find({ userId: req.user._id })
          .sort({ createdAt: -1 })
          .limit(5)
          .select('uuid originalName createdAt')
      ]);

      res.json({
        stats: {
          totalPdfs,
          totalSize: totalSize[0]?.totalSize || 0,
          recentPdfs
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PDFController();