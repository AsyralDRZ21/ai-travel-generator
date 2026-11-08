const User = require('../models/User');
const Itinerary = require('../models/Itinerary');
const Post = require('../models/Post');
const Broadcast = require('../models/Broadcast');

// @route   GET /api/admin/stats
// @desc    Get dashboard metrics and latest activity
// @access  Private / Admin Only
exports.getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalItineraries = await Itinerary.countDocuments();
    
    const totalPosts = await Post.countDocuments();
    const recentPosts = await Post.find().populate('user', 'fullName email').sort({ createdAt: -1 }).limit(15);

    // Get 5 most recent users
    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(5).select('-password');

    res.status(200).json({
      totalUsers,
      totalItineraries,
      totalPosts,
      recentUsers,
      recentPosts
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching admin stats', error: error.message });
  }
};

// @route   PUT /api/admin/users/:id/promote
// @desc    Promote a regular user to admin
// @access  Private / Admin Only
exports.promoteUser = async (req, res) => {
  try {
    const userToPromote = await User.findById(req.params.id);
    if (!userToPromote) return res.status(404).json({ message: 'User not found' });
    
    // Check if targeting self (not harmful, but maybe logically avoid self prompt?)
    if (userToPromote._id.toString() === req.user.userId) {
      return res.status(400).json({ message: 'You are already an admin!' });
    }

    userToPromote.role = 'admin';
    await userToPromote.save();

    res.json({ message: 'User promoted to Admin successfully', user: userToPromote });
  } catch (error) {
    res.status(500).json({ message: 'Failed to promote user', error: error.message });
  }
};

// @route   DELETE /api/admin/users/:id
// @desc    Delete a user and cascade their itineraries
// @access  Private / Admin Only
exports.deleteUser = async (req, res) => {
  try {
    const userToDelete = await User.findById(req.params.id);
    if (!userToDelete) return res.status(404).json({ message: 'User not found' });

    // Prevent self-deletion as admin
    if (userToDelete._id.toString() === req.user.userId) {
      return res.status(400).json({ message: 'Cannot delete your own admin account!' });
    }

    // Cascade Delete: Wipe out all itineraries belonging to this user
    await Itinerary.deleteMany({ userId: userToDelete._id });
    
    // Wipe out the user
    await User.findByIdAndDelete(req.params.id);

    res.json({ message: 'User account and all associated itineraries completely wiped out.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete user', error: error.message });
  }
};

// @route   DELETE /api/admin/posts/:id
// @desc    Admin securely wipes a community post completely
// @access  Private / Admin Only
exports.deleteCommunityPost = async (req, res) => {
  try {
    const postToDelete = await Post.findById(req.params.id);
    if (!postToDelete) return res.status(404).json({ message: 'Post not found' });
    
    await Post.findByIdAndDelete(req.params.id);

    res.json({ message: 'Community post successfully wiped by admin.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete post', error: error.message });
  }
};

// @route   POST /api/admin/broadcast
// @desc    Update or create the Global Broadcast Message
// @access  Private / Admin Only
exports.updateBroadcast = async (req, res) => {
  try {
    const { message, active } = req.body;
    let mainBroadcast = await Broadcast.findOne();
    if (!mainBroadcast) {
      mainBroadcast = new Broadcast({ message, active, updatedBy: req.user.userId });
    } else {
      mainBroadcast.message = message !== undefined ? message : mainBroadcast.message;
      mainBroadcast.active = active !== undefined ? active : mainBroadcast.active;
      mainBroadcast.updatedBy = req.user.userId;
    }
    await mainBroadcast.save();
    res.json({ message: 'Broadcast updated successfully', broadcast: mainBroadcast });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update broadcast', error: error.message });
  }
};

// @route   GET /api/admin/broadcast
// @desc    Get the current active Global Broadcast
// @access  Public
exports.getActiveBroadcast = async (req, res) => {
  try {
    const broadcast = await Broadcast.findOne({ active: true });
    res.json({ broadcast: broadcast ? broadcast.message : null });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch broadcast', error: error.message });
  }
};
