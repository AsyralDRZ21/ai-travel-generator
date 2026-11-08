const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getPrayerTimes,
  getMosques,
  getHalalFood,
  getHistoricalWeather,
  getVisaInfo,
  getMuslimAccommodation,
} = require('../controllers/muslimController');

// All routes are private (require login)
router.get('/prayer-times',    protect, getPrayerTimes);
router.get('/mosques',         protect, getMosques);
router.get('/halal-food',      protect, getHalalFood);
router.get('/weather-history', protect, getHistoricalWeather);
router.get('/visa',            protect, getVisaInfo);
router.get('/accommodation',   protect, getMuslimAccommodation);

module.exports = router;
