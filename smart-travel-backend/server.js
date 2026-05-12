require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require('./routes/auth');
const itineraryRoutes = require('./routes/itinerary');
const budgetRoutes = require('./routes/budget');
const recommendRoutes = require('./routes/recommend');
const adminRoutes = require('./routes/admin');
const chatRoutes = require('./routes/chat');
const communityRoutes = require('./routes/community');
const dmRoutes = require('./routes/dm');
const reviewRoutes = require('./routes/reviews');

app.use('/api/auth', authRoutes);
app.use('/api/itinerary', itineraryRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/recommendations', recommendRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/dm', dmRoutes);
app.use('/api/reviews', reviewRoutes);

// Health check route
app.get('/', (req, res) => {
  res.json({ message: '✅ Smart Travel API is running!', version: '2.0' });
});

// --- DATABASE CONNECTION ---
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-travel-db';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB at:', MONGODB_URI);
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err.message);
    console.log('💡 Make sure MongoDB is running locally: mongod --dbpath data/db');
  });

// --- START SERVER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Smart Travel API running on http://localhost:${PORT}`);
});
