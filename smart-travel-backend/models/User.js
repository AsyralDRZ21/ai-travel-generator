const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  socialInfo: {
    tiktok: { type: String, default: '' },
    instagram: { type: String, default: '' },
    phone: { type: String, default: '' },
    region: { type: String, default: '' }
  },
  preferences: {
    travelStyles: { type: [String], default: [] },
    interests:    { type: [String], default: [] },
    budgetRange:  { type: String, default: 'medium' },
    preferredSeasons: { type: [String], default: [] }
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
module.exports = User;
