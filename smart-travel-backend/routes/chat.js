const express = require('express');
const router = express.Router();
const { sendMessage, getHistory, getAdminInbox } = require('../controllers/chatController');
const { protect, adminProtect } = require('../middleware/authMiddleware');

// Inbox for admins
router.get('/admin/inbox', protect, adminProtect, getAdminInbox);

// Send message
router.post('/', protect, sendMessage);

// Get specific history (Admin passes /id)
router.get('/:targetUserId', protect, getHistory);

// Get general history (User passes nothing /)
router.get('/', protect, getHistory);

module.exports = router;
