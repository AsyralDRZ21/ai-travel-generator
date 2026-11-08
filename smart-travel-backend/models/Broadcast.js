const mongoose = require('mongoose');

const broadcastSchema = new mongoose.Schema({
  message: { type: String, required: true },
  active: { type: Boolean, default: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Broadcast', broadcastSchema);
