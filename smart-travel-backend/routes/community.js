const express = require('express');
const router = express.Router();
const { createPost, getAllPosts, toggleLike, deletePost, replyToPost } = require('../controllers/communityController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createPost);
router.get('/', protect, getAllPosts);
router.put('/:id/like', protect, toggleLike);
router.delete('/:id', protect, deletePost);
router.post('/:id/reply', protect, replyToPost);

module.exports = router;
