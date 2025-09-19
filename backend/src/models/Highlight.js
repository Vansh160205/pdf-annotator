const mongoose = require('mongoose');

const highlightSchema = new mongoose.Schema({
  uuid: {
    type: String,
    required: true,
    unique: true
  },
  pdfUuid: {
    type: String,
    required: true,
    ref: 'PDFDocument'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  pageNumber: {
    type: Number,
    required: true
  },
  highlightedText: {
    type: String,
    required: true
  },
  position: {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true }
  },
  boundingBox: {
    left: { type: Number, required: true },
    top: { type: Number, required: true },
    right: { type: Number, required: true },
    bottom: { type: Number, required: true }
  },
  color: {
    type: String,
    default: '#ffff00'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Highlight', highlightSchema);