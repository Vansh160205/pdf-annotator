const mongoose = require('mongoose');

const cloudFileSchema = new mongoose.Schema({
  uuid: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  pdfUuid: {
    type: String,
    required: true
  },
  service: {
    type: String,
    enum: ['googledrive'],
    default: 'googledrive'
  },
  cloudFileId: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  webViewLink: String,
  downloadLink: String,
  shareLink: String,
  fileSize: Number,
  lastSynced: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

cloudFileSchema.index({ userId: 1, pdfUuid: 1 });
cloudFileSchema.index({ cloudFileId: 1, service: 1 });

module.exports = mongoose.model('CloudFile', cloudFileSchema);