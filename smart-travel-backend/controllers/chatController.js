const Message = require('../models/Message');
const User = require('../models/User');

// @route   POST /api/chat
// @desc    Send a message (works for both User and Admin)
// @access  Private
exports.sendMessage = async (req, res) => {
  try {
    const { text, targetUserId } = req.body;
    if (!text) return res.status(400).json({ message: 'Message text is required' });

    const role = req.user.role;
    
    // If admin is replying, they must specify who they are replying to
    // If standard user is sending, the target is inherently themselves (their own chat instance)
    const chatUserId = role === 'admin' && targetUserId ? targetUserId : req.user.userId;

    const newMessage = new Message({
      userId: chatUserId,
      senderRole: role,
      text
    });

    await newMessage.save();
    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ message: 'Failed to send message', error: error.message });
  }
};

// @route   GET /api/chat/:targetUserId?
// @desc    Get chat history for a specific user
// @access  Private
exports.getHistory = async (req, res) => {
  try {
    const role = req.user.role;
    const targetUserId = req.params.targetUserId;

    // Standard user can only request their own history
    let chatUserId = req.user.userId;

    // If an Admin specifically requests a user's thread
    if (role === 'admin' && targetUserId) {
      chatUserId = targetUserId;
      // Mark all user messages as read when Admin opens the chat
      await Message.updateMany({ userId: chatUserId, senderRole: 'user', isRead: false }, { isRead: true });
    } else if (role === 'user') {
      // Mark admin replies as read when User opens history
      await Message.updateMany({ userId: chatUserId, senderRole: 'admin', isRead: false }, { isRead: true });
    }

    const messages = await Message.find({ userId: chatUserId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch messages', error: error.message });
  }
};

// @route   GET /api/chat/admin/inbox
// @desc    Get all active chat threads for Admin Dashboard
// @access  Private / Admin Only
exports.getAdminInbox = async (req, res) => {
  try {
    // We aggregate unique users who have sent messages.
    // MongoDB native grouping to find latest message per user.
    const inboxRaw = await Message.aggregate([
      { $sort: { createdAt: -1 } },
      { 
        $group: {
          _id: "$userId",
          latestMessage: { $first: "$text" },
          latestDate: { $first: "$createdAt" },
          unreadCount: { 
            $sum: { $cond: [ { $and: [{ $eq: ["$senderRole", "user"] }, { $eq: ["$isRead", false] }] }, 1, 0 ] } 
          }
        }
      },
      { $sort: { latestDate: -1 } }
    ]);

    // Populate user info (Aggregation output needs a manual lookup or population)
    const inbox = await User.populate(inboxRaw, { path: '_id', select: 'fullName email' });

    res.json(inbox.filter(item => item._id != null)); // Ensure active users only
  } catch (error) {
    res.status(500).json({ message: 'Failed to load inbox', error: error.message });
  }
};
