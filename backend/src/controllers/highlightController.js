const { v4: uuidv4 } = require('uuid');
const Highlight = require('../models/Highlight');
const PDF = require('../models/PDF');
const searchController = require('./searchController');


class HighlightController {
  // Create new highlight
  async create(req, res, next) {
    try {
      const {
        pdfUuid,
        pageNumber,
        highlightedText,
        position,
        boundingBox,
        color = '#ffff00'
      } = req.body;

      // Verify PDF belongs to user
      const pdf = await PDF.findOne({ uuid: pdfUuid, userId: req.user._id });
      if (!pdf) {
        return res.status(404).json({ error: 'PDF not found' });
      }

      const highlight = new Highlight({
        uuid: uuidv4(),
        pdfUuid,
        userId: req.user._id,
        pageNumber,
        highlightedText,
        position,
        boundingBox,
        color
      });

      await highlight.save();

      await searchController.indexHighlight(highlight, req.user._id);


      res.status(201).json({
        message: 'Highlight created successfully',
        highlight
      });
    } catch (error) {
      console.error('Create highlight error:', error);
      next(error);
    }
  }

  // Get highlights for a specific PDF
  async getByPDF(req, res, next) {
    try {
      const { pdfUuid } = req.params;
      const { page } = req.query;

      // Verify PDF belongs to user
      const pdf = await PDF.findOne({ uuid: pdfUuid, userId: req.user._id });
      if (!pdf) {
        return res.status(404).json({ error: 'PDF not found' });
      }

      let query = { pdfUuid, userId: req.user._id };
      
      // Filter by page if specified
      if (page) {
        query.pageNumber = parseInt(page);
      }

      const highlights = await Highlight.find(query)
        .sort({ pageNumber: 1, createdAt: 1 });

      res.json({ highlights });
    } catch (error) {
      console.error('Get highlights error:', error);
      next(error);
    }
  }

  // Get single highlight
  async getById(req, res, next) {
    try {
      const highlight = await Highlight.findOne({
        uuid: req.params.uuid,
        userId: req.user._id
      });

      if (!highlight) {
        return res.status(404).json({ error: 'Highlight not found' });
      }

      res.json({ highlight });
    } catch (error) {
      console.error('Get highlight error:', error);
      next(error);
    }
  }

  // Update highlight
  async update(req, res, next) {
    try {
      const { color, highlightedText, position, boundingBox } = req.body;

      const updateData = {};
      if (color) updateData.color = color;
      if (highlightedText) updateData.highlightedText = highlightedText;
      if (position) updateData.position = position;
      if (boundingBox) updateData.boundingBox = boundingBox;

      const highlight = await Highlight.findOneAndUpdate(
        { uuid: req.params.uuid, userId: req.user._id },
        updateData,
        { new: true }
      );

      if (!highlight) {
        return res.status(404).json({ error: 'Highlight not found' });
      }

      res.json({
        message: 'Highlight updated successfully',
        highlight
      });
    } catch (error) {
      console.error('Update highlight error:', error);
      next(error);
    }
  }

  // Delete highlight
  async delete(req, res, next) {
    try {
      const highlight = await Highlight.findOneAndDelete({
        uuid: req.params.uuid,
        userId: req.user._id
      });

      await searchController.removeHighlightIndex(highlight.uuid, req.user._id);


      if (!highlight) {
        return res.status(404).json({ error: 'Highlight not found' });
      }

      res.json({ message: 'Highlight deleted successfully' });
    } catch (error) {
      console.error('Delete highlight error:', error);
      next(error);
    }
  }

  // Get all highlights for user
  async getAll(req, res, next) {
    try {
      const { page = 1, limit = 20, pdfUuid, search } = req.query;
      const skip = (page - 1) * limit;

      let query = { userId: req.user._id };
      
      if (pdfUuid) {
        query.pdfUuid = pdfUuid;
      }

      if (search) {
        query.highlightedText = { $regex: search, $options: 'i' };
      }

      const [highlights, total] = await Promise.all([
        Highlight.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .populate({
            path: 'pdfUuid',
            select: 'originalName',
            model: 'PDF',
            localField: 'pdfUuid',
            foreignField: 'uuid'
          }),
        Highlight.countDocuments(query)
      ]);

      res.json({
        highlights,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      });
    } catch (error) {
      console.error('Get user highlights error:', error);
      next(error);
    }
  }

  // Bulk delete highlights
  async bulkDelete(req, res, next) {
    try {
      const { highlightUuids } = req.body;

      if (!Array.isArray(highlightUuids) || highlightUuids.length === 0) {
        return res.status(400).json({ error: 'Highlight UUIDs array is required' });
      }

      const result = await Highlight.deleteMany({
        uuid: { $in: highlightUuids },
        userId: req.user._id
      });

      res.json({
        message: `${result.deletedCount} highlights deleted successfully`,
        deletedCount: result.deletedCount
      });
    } catch (error) {
      console.error('Bulk delete highlights error:', error);
      next(error);
    }
  }

  // Get highlight statistics
  async getStats(req, res, next) {
    try {
      const [totalHighlights, highlightsByPdf, recentHighlights] = await Promise.all([
        Highlight.countDocuments({ userId: req.user._id }),
        Highlight.aggregate([
          { $match: { userId: req.user._id } },
          { $group: { _id: '$pdfUuid', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 }
        ]),
        Highlight.find({ userId: req.user._id })
          .sort({ createdAt: -1 })
          .limit(5)
          .select('uuid highlightedText pdfUuid pageNumber createdAt')
      ]);

      res.json({
        stats: {
          totalHighlights,
          highlightsByPdf,
          recentHighlights
        }
      });
    } catch (error) {
      console.error('Get highlight stats error:', error);
      next(error);
    }
  }
}

module.exports = new HighlightController();