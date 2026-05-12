const mongoose = require('mongoose');

const dmSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Add index to easily fetch conversations between two users
dmSchema.index({ sender: 1, receiver: 1 });

const DirectMessage = mongoose.model('DirectMessage', dmSchema);
module.exports = DirectMessage;
