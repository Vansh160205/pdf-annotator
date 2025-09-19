const mongoose = require('mongoose');

const searchIndexSchema = new mongoose.Schema({
  pdfUuid: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  pageNumber: {
    type: Number,
    required: true
  },
  content: {
    type: String,
    required: true,
    index: 'text' // Enable text search
  },
  contentType: {
    type: String,
    enum: ['pdf_text', 'annotation'],
    required: true
  },
  position: {
    x: Number,
    y: Number,
    width: Number,
    height: Number
  },
  highlightId: {
    type: String,
    sparse: true // Only for annotations
  }
}, {
  timestamps: true
});

// Compound indexes for efficient searching
searchIndexSchema.index({ userId: 1, pdfUuid: 1 });
searchIndexSchema.index({ userId: 1, contentType: 1 });
searchIndexSchema.index({ content: 'text', userId: 1 });

module.exports = mongoose.model('SearchIndex', searchIndexSchema);