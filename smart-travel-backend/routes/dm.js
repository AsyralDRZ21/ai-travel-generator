const express = require('express');
const router = express.Router();
const { sendMessage, getThread, getInbox } = require('../controllers/dmController');
const { protect } = require('../middleware/authMiddleware');

router.get('/inbox/list', protect, getInbox);
router.get('/:targetUserId', protect, getThread);
router.post('/:receiverId', protect, sendMessage);

module.exports = router;
