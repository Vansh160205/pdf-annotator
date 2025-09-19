const { v4: uuidv4 } = require('uuid');
const Drawing = require('../models/Drawing');
const PDF = require('../models/PDF');

class DrawingController {
  // Create a new drawing
  async create(req, res, next) {
    try {
      const drawingUuid = req.body.uuid || uuidv4();
      
      // Verify PDF belongs to user
      const pdf = await PDF.findOne({
        uuid: req.body.pdfUuid,
        userId: req.user._id
      });

      if (!pdf) {
        return res.status(404).json({ error: 'PDF not found' });
      }

      const drawing = new Drawing({
        uuid: drawingUuid,
        pdfUuid: req.body.pdfUuid,
        userId: req.user._id,
        pageNumber: req.body.pageNumber,
        type: req.body.type,
        data: req.body.data,
        style: req.body.style
      });

      await drawing.save();
      
      console.log('🎨 Drawing created:', {
        uuid: drawingUuid,
        type: drawing.type,
        page: drawing.pageNumber
      });

      res.status(201).json({
        message: 'Drawing created successfully',
        drawing: {
          uuid: drawing.uuid,
          pdfUuid: drawing.pdfUuid,
          pageNumber: drawing.pageNumber,
          type: drawing.type,
          data: drawing.data,
          style: drawing.style,
          createdAt: drawing.createdAt
        }
      });
    } catch (error) {
      console.error('Create drawing error:', error);
      next(error);
    }
  }

  // Get drawings for a specific PDF
  async getByPDF(req, res, next) {
    try {
      const { pdfUuid } = req.params;
      
      // Verify PDF belongs to user
      const pdf = await PDF.findOne({
        uuid: pdfUuid,
        userId: req.user._id
      });

      if (!pdf) {
        return res.status(404).json({ error: 'PDF not found' });
      }

      const drawings = await Drawing.find({
        pdfUuid: pdfUuid,
        userId: req.user._id
      }).sort({ createdAt: -1 });

      console.log(`🎨 Retrieved ${drawings.length} drawings for PDF ${pdfUuid}`);

      res.json({
        drawings: drawings.map(drawing => ({
          uuid: drawing.uuid,
          pdfUuid: drawing.pdfUuid,
          pageNumber: drawing.pageNumber,
          type: drawing.type,
          data: drawing.data,
          style: drawing.style,
          createdAt: drawing.createdAt
        }))
      });
    } catch (error) {
      console.error('Get drawings error:', error);
      next(error);
    }
  }

  // Get drawings for a specific page
  async getByPage(req, res, next) {
    try {
      const { pdfUuid, pageNumber } = req.params;
      
      const drawings = await Drawing.find({
        pdfUuid: pdfUuid,
        userId: req.user._id,
        pageNumber: parseInt(pageNumber)
      }).sort({ createdAt: -1 });

      res.json({
        drawings: drawings.map(drawing => ({
          uuid: drawing.uuid,
          pdfUuid: drawing.pdfUuid,
          pageNumber: drawing.pageNumber,
          type: drawing.type,
          data: drawing.data,
          style: drawing.style,
          createdAt: drawing.createdAt
        }))
      });
    } catch (error) {
      console.error('Get page drawings error:', error);
      next(error);
    }
  }

  // Update a drawing
  async update(req, res, next) {
    try {
      const { uuid } = req.params;
      
      const drawing = await Drawing.findOne({
        uuid: uuid,
        userId: req.user._id
      });

      if (!drawing) {
        return res.status(404).json({ error: 'Drawing not found' });
      }

      // Update fields
      if (req.body.data) drawing.data = req.body.data;
      if (req.body.style) drawing.style = { ...drawing.style, ...req.body.style };
      
      await drawing.save();

      res.json({
        message: 'Drawing updated successfully',
        drawing: {
          uuid: drawing.uuid,
          pdfUuid: drawing.pdfUuid,
          pageNumber: drawing.pageNumber,
          type: drawing.type,
          data: drawing.data,
          style: drawing.style,
          createdAt: drawing.createdAt
        }
      });
    } catch (error) {
      console.error('Update drawing error:', error);
      next(error);
    }
  }

  // Delete a drawing
  async delete(req, res, next) {
    try {
      const { uuid } = req.params;
      
      const drawing = await Drawing.findOne({
        uuid: uuid,
        userId: req.user._id
      });

      if (!drawing) {
        return res.status(404).json({ error: 'Drawing not found' });
      }

      await Drawing.deleteOne({ _id: drawing._id });
      
      console.log('🗑️ Drawing deleted:', uuid);

      res.json({ message: 'Drawing deleted successfully' });
    } catch (error) {
      console.error('Delete drawing error:', error);
      next(error);
    }
  }

  // Get all drawings for a user
  async getAll(req, res, next) {
    try {
      const { page = 1, limit = 50 } = req.query;
      const skip = (page - 1) * limit;

      const [drawings, total] = await Promise.all([
        Drawing.find({ userId: req.user._id })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .populate({
            path: 'pdfUuid',
            select: 'originalName',
            model: 'pdfs',
            match: { userId: req.user._id }
          }),
        Drawing.countDocuments({ userId: req.user._id })
      ]);

      res.json({
        drawings: drawings.map(drawing => ({
          uuid: drawing.uuid,
          pdfUuid: drawing.pdfUuid,
          pageNumber: drawing.pageNumber,
          type: drawing.type,
          data: drawing.data,
          style: drawing.style,
          createdAt: drawing.createdAt
        })),
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      });
    } catch (error) {
      console.error('Get all drawings error:', error);
      next(error);
    }
  }

  // Bulk delete drawings for a PDF
  async deleteByPDF(req, res, next) {
    try {
      const { pdfUuid } = req.params;
      
      const result = await Drawing.deleteMany({
        pdfUuid: pdfUuid,
        userId: req.user._id
      });

      console.log(`🗑️ Deleted ${result.deletedCount} drawings for PDF ${pdfUuid}`);

      res.json({ 
        message: 'Drawings deleted successfully',
        deletedCount: result.deletedCount
      });
    } catch (error) {
      console.error('Bulk delete drawings error:', error);
      next(error);
    }
  }
}

module.exports = new DrawingController();