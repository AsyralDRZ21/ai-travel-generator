const express = require('express');
const router = express.Router();
const { getAdminStats, promoteUser, deleteUser, deleteCommunityPost, updateBroadcast, getActiveBroadcast } = require('../controllers/adminController');
const { protect, adminProtect } = require('../middleware/authMiddleware');

router.get('/stats', protect, adminProtect, getAdminStats);
router.put('/users/:id/promote', protect, adminProtect, promoteUser);
router.delete('/users/:id', protect, adminProtect, deleteUser);
router.delete('/posts/:id', protect, adminProtect, deleteCommunityPost);

// Broadcast Routes
router.post('/broadcast', protect, adminProtect, updateBroadcast);
router.get('/broadcast', getActiveBroadcast);

module.exports = router;
