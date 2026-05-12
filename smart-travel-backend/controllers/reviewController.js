const Review = require('../models/Review');
const Itinerary = require('../models/Itinerary');
const User = require('../models/User');

// @route   POST /api/reviews
// @desc    Create a review for a completed trip
// @access  Private
exports.createReview = async (req, res) => {
  try {
    const { itineraryId, rating, title, content } = req.body;

    if (!itineraryId || !rating || !title || !content) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Ensure itinerary belongs to user
    const itinerary = await Itinerary.findOne({ _id: itineraryId, userId: req.user.userId });
    if (!itinerary) return res.status(404).json({ message: 'Itinerary not found' });

    const user = await User.findById(req.user.userId);

    const review = new Review({
      userId: req.user.userId,
      itineraryId,
      destination: itinerary.destination,
      rating,
      title,
      content,
      userName: user.fullName
    });

    await review.save();
    res.status(201).json({ message: 'Review posted!', review });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'You have already reviewed this trip' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route   GET /api/reviews
// @desc    Get all reviews (latest first) — for community view
// @access  Private
exports.getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route   GET /api/reviews/destination/:name
// @desc    Get reviews for a specific destination
// @access  Private
exports.getReviewsByDestination = async (req, res) => {
  try {
    const reviews = await Review.find({
      destination: { $regex: req.params.name, $options: 'i' }
    }).sort({ createdAt: -1 });

    const avgRating = reviews.length
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : null;

    res.json({ reviews, avgRating, count: reviews.length });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route   GET /api/reviews/my
// @desc    Get current user's own reviews
// @access  Private
exports.getMyReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route   DELETE /api/reviews/:id
// @desc    Delete a review (owner only)
// @access  Private
exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    if (!review) return res.status(404).json({ message: 'Review not found' });
    res.json({ message: 'Review deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
