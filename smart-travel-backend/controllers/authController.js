const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// @route   POST /api/auth/register
// @desc    Register a new user
exports.register = async (req, res) => {
  try {
    const { fullName, email, password, preferences } = req.body;

    // Strict Server-side Validation
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'Please provide full name, email, and password' });
    }

    // Password complexity validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long, and include an uppercase letter, a lowercase letter, a number, and a special character (e.g., @, !, #).' });
    }

    // Check for duplicate emails
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email is already registered' });
    }

    // Hash password using bcryptjs
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create a new user with parsed preferences
    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
      preferences: preferences || { travelStyles: [], interests: [] }
    });

    await newUser.save();

    // Create JSON Web Token (JWT)
    const token = jwt.sign(
      { userId: newUser._id, role: newUser.role },
      process.env.JWT_SECRET || 'secret_token_placeholder',
      { expiresIn: '1d' }
    );

    res.status(201).json({
      message: 'User registered successfully!',
      token,
      user: {
        id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        role: newUser.role,
        preferences: newUser.preferences,
        socialInfo: newUser.socialInfo
      }
    });

  } catch (error) {
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: 'Validation Error', details: messages });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route   POST /api/auth/login
// @desc    Login a user & get token
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Strict Server-side Validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Check if the user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Compare entered password with hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create JSON Web Token (JWT)
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'secret_token_placeholder',
      { expiresIn: '1d' }
    );

    res.status(200).json({
      message: 'Login successful!',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        preferences: user.preferences,
        socialInfo: user.socialInfo
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route   PUT /api/auth/profile
// @desc    Update user profile & preferences
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { fullName, email, password, preferences, socialInfo } = req.body;

    if (fullName) user.fullName = fullName;
    if (email) user.email = email;
    if (preferences) user.preferences = { ...user.preferences, ...preferences };
    if (socialInfo) user.socialInfo = { ...user.socialInfo, ...socialInfo };

    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        preferences: user.preferences,
        socialInfo: user.socialInfo
      }
    });
  } catch (error) {
    // Handle specific mongoose duplication errors
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    res.status(500).json({ message: 'Server error updating profile', error: error.message });
  }
};

// @route   GET /api/auth/public/:id
// @desc    Get a public profile for Community Module
// @access  Public or Private depending on spec
exports.getPublicProfile = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const user = await User.findById(targetUserId).select('fullName role preferences socialInfo createdAt');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Also fetch their recent posts
    const Post = require('../models/Post');
    const recentPosts = await Post.find({ user: targetUserId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('user', 'fullName role');

    res.json({
      profile: user,
      recentPosts
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving public profile', error: error.message });
  }
};

// @route   GET /api/auth/stats
// @desc    Get personal travel statistics for the logged-in user
// @access  Private
exports.getUserStats = async (req, res) => {
  try {
    const Itinerary = require('../models/Itinerary');
    const Budget = require('../models/Budget');
    const Review = require('../models/Review');
    const Post = require('../models/Post');

    const userId = req.user.userId;
    const user = await User.findById(userId);

    // Itinerary stats
    const itineraries = await Itinerary.find({ userId });
    const totalTrips = itineraries.length;
    const uniqueDestinations = [...new Set(itineraries.map(i => i.destination.split(',')[0].trim()))];
    const totalDaysPlanned = itineraries.reduce((sum, i) => sum + (i.duration || 0), 0);
    const totalBudgetPlanned = itineraries.reduce((sum, i) => sum + (i.budget || 0), 0);

    // Trip status breakdown
    const statusBreakdown = { planned: 0, ongoing: 0, completed: 0 };
    itineraries.forEach(i => { statusBreakdown[i.status || 'planned']++; });

    // Favourite travel style
    const styleCount = {};
    itineraries.forEach(i => { if (i.travelStyle) styleCount[i.travelStyle] = (styleCount[i.travelStyle] || 0) + 1; });
    const favouriteStyle = Object.entries(styleCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

    // Budget stats — total actually spent across all budgets
    const budgets = await Budget.find({ userId });
    const totalActualSpent = budgets.reduce((sum, b) => {
      return sum + b.expenses.reduce((s, e) => s + (e.amount || 0), 0);
    }, 0);

    // Travel style chart data
    const travelStyleData = Object.entries(styleCount).map(([name, value]) => ({ name, value }));

    // Reviews & posts count
    let reviewCount = 0;
    let postCount = 0;
    try { reviewCount = await Review.countDocuments({ userId }); } catch {}
    try { postCount = await Post.countDocuments({ user: userId }); } catch {}

    // Monthly trips (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const recentItineraries = itineraries.filter(i => new Date(i.createdAt) >= sixMonthsAgo);
    const monthlyData = {};
    recentItineraries.forEach(i => {
      const month = new Date(i.createdAt).toLocaleString('default', { month: 'short' });
      monthlyData[month] = (monthlyData[month] || 0) + 1;
    });
    const monthlyTrips = Object.entries(monthlyData).map(([month, count]) => ({ month, count }));

    res.json({
      totalTrips,
      uniqueDestinations,
      totalDaysPlanned,
      totalBudgetPlanned,
      totalActualSpent,
      favouriteStyle,
      statusBreakdown,
      travelStyleData,
      reviewCount,
      postCount,
      memberSince: user.createdAt,
      monthlyTrips,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route   POST /api/auth/forgot-password
// @desc    Generate password reset token and "send" email (log to console)
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'No user found with that email address.' });
    }

    // Generate random token
    const resetToken = crypto.randomBytes(20).toString('hex');
    
    // Hash it and set to user document with 10 mins expiry
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // Create reset URL
    const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;

    // Simulate sending email by logging to console
    console.log('\n\n======================================================');
    console.log('📬 PASSWORD RESET EMAIL SIMULATION');
    console.log(`To: ${user.email}`);
    console.log('Subject: Password Reset Request');
    console.log(`Click this link to reset your password: \n${resetUrl}`);
    console.log('======================================================\n\n');

    res.status(200).json({ message: 'Password reset link sent to email (check console).' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Error sending reset email' });
  }
};

// @route   PUT /api/auth/reset-password/:token
// @desc    Reset password using token
exports.resetPassword = async (req, res) => {
  try {
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const { password } = req.body;

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() } // Ensure token has not expired
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token.' });
    }

    // Password complexity validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long, and include an uppercase letter, a lowercase letter, a number, and a special character (e.g., @, !, #).' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // Clear reset token fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({ message: 'Password successfully reset! You can now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Error resetting password' });
  }
};
