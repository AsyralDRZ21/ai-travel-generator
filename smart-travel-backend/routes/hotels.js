const express = require('express');
const router = express.Router();
const { searchHotels } = require('../controllers/hotelController');
const { protect } = require('../middleware/authMiddleware');

// GET /api/hotels/search?destination=Ipoh,malaysia
router.get('/search', protect, searchHotels);

module.exports = router;
