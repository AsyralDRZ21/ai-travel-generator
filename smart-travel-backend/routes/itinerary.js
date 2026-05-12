const express = require('express');
const router = express.Router();
const { generateItinerary, getItineraries, deleteItinerary, updateItineraryStatus } = require('../controllers/itineraryController');
const { protect } = require('../middleware/authMiddleware');

router.post('/generate', protect, generateItinerary);
router.get('/', protect, getItineraries);
router.put('/:id/status', protect, updateItineraryStatus);
router.delete('/:id', protect, deleteItinerary);

module.exports = router;
