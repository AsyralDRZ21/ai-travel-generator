const express = require('express');
const router = express.Router();
const { createReview, getAllReviews, getReviewsByDestination, getMyReviews, deleteReview } = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createReview);
router.get('/', protect, getAllReviews);
router.get('/my', protect, getMyReviews);
router.get('/destination/:name', protect, getReviewsByDestination);
router.delete('/:id', protect, deleteReview);

module.exports = router;
