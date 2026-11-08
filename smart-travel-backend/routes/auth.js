const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

const { protect } = require('../middleware/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.put('/profile', protect, authController.updateProfile);
router.get('/stats', protect, authController.getUserStats);
router.get('/public/:id', protect, authController.getPublicProfile);
router.post('/forgot-password', authController.forgotPassword);
router.put('/reset-password/:token', authController.resetPassword);

module.exports = router;
