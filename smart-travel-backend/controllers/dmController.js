const DirectMessage = require('../models/DirectMessage');
const User = require('../models/User');
const mongoose = require('mongoose');

// @route   POST /api/dm/:receiverId
// @desc    Send a direct message
// @access  Private
exports.sendMessage = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: 'Message text cannot be empty' });

    const receiverId = req.params.receiverId;
    if (receiverId === req.user.userId) return res.status(400).json({ message: 'You cannot message yourself' });

    const receiver = await User.findById(receiverId);
    if (!receiver) return res.status(404).json({ message: 'Receiver not found' });

    const newDM = new DirectMessage({
      sender: req.user.userId,
      receiver: receiverId,
      text
    });

    await newDM.save();
    
    const populatedDM = await DirectMessage.findById(newDM._id).populate('sender', 'fullName email').populate('receiver', 'fullName email');
    res.status(201).json(populatedDM);
  } catch (error) {
    res.status(500).json({ message: 'Failed to send message', error: error.message });
  }
};

// @route   GET /api/dm/:targetUserId
// @desc    Get chat thread with a specific user
// @access  Private
exports.getThread = async (req, res) => {
  try {
    const targetUserId = req.params.targetUserId;
    const currentUserId = req.user.userId;

    // Mark incoming messages as read
    await DirectMessage.updateMany(
      { sender: targetUserId, receiver: currentUserId, isRead: false },
      { $set: { isRead: true } }
    );

    const messages = await DirectMessage.find({
      $or: [
        { sender: currentUserId, receiver: targetUserId },
        { sender: targetUserId, receiver: currentUserId }
      ]
    }).sort({ createdAt: 1 })
      .populate('sender', 'fullName email')
      .populate('receiver', 'fullName email');

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch thread', error: error.message });
  }
};

// @route   GET /api/dm/inbox/list
// @desc    Get list of unique users the current user has chatted with
// @access  Private
exports.getInbox = async (req, res) => {
  try {
    const currentUserId = new mongoose.Types.ObjectId(req.user.userId);

    const inbox = await DirectMessage.aggregate([
      {
        $match: {
          $or: [{ sender: currentUserId }, { receiver: currentUserId }]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$sender', currentUserId] },
              '$receiver',
              '$sender'
            ]
          },
          latestMessage: { $first: '$text' },
          latestDate: { $first: '$createdAt' },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$receiver', currentUserId] }, { $eq: ['$isRead', false] }] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $sort: { latestDate: -1 }
      }
    ]);

    // Populate user details for each _id
    const populatedInbox = await User.populate(inbox, { path: '_id', select: 'fullName email' });

    res.json(populatedInbox);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch inbox', error: error.message });
  }
};
