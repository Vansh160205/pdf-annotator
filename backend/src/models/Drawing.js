const mongoose = require('mongoose');

const drawingSchema = new mongoose.Schema({
  uuid: {
    type: String,
    required: true,
    unique: true
  },
  pdfUuid: {
    type: String,
    required: true
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
  type: {
    type: String,
    enum: ['freehand', 'arrow', 'rectangle', 'circle', 'line'],
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  style: {
    color: { type: String, default: '#000000' },
    strokeWidth: { type: Number, default: 2 },
    opacity: { type: Number, default: 1 }
  }
}, {
  timestamps: true
});

drawingSchema.index({ pdfUuid: 1, userId: 1 });

module.exports = mongoose.model('Drawing', drawingSchema);