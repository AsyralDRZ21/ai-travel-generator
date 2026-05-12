const mongoose = require('mongoose');

const itinerarySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  destination: {
    type: String,
    required: [true, 'Destination is required'],
    trim: true
  },
  duration: {
    type: Number,
    required: [true, 'Duration (days) is required'],
    min: 1,
    max: 30
  },
  budget: {
    type: Number,
    required: false
  },
  currency: {
    type: String,
    default: 'MYR'
  },
  travelStyle: {
    type: String,
    enum: ['adventure', 'relaxation', 'cultural', 'foodie', 'budget', 'luxury', 'nature', 'urban', 'historical', 'nightlife', 'backpacking', 'roadtrip', 'photography', 'spiritual', 'family', 'shopping', 'wellness', 'romantic', 'wildlife'],
    default: 'cultural'
  },
  numberOfPeople: {
    type: Number,
    default: 1
  },
  status: {
    type: String,
    enum: ['planned', 'ongoing', 'completed'],
    default: 'planned'
  },
  generatedPlan: {
    type: String, // Store as JSON string from Gemini
    required: true
  }
}, { timestamps: true });

const Itinerary = mongoose.model('Itinerary', itinerarySchema);
module.exports = Itinerary;
