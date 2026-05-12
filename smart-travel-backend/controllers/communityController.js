const Post = require('../models/Post');

// @route   POST /api/community
// @desc    Create a new community post
// @access  Private
exports.createPost = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ message: 'Content cannot be empty' });

    const newPost = new Post({
      user: req.user.userId,
      content
    });

    await newPost.save();
    
    // Return populated post
    const populatedPost = await Post.findById(newPost._id).populate('user', 'fullName email role');
    res.status(201).json(populatedPost);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create post', error: error.message });
  }
};

// @route   GET /api/community
// @desc    Get all community posts
// @access  Private
exports.getAllPosts = async (req, res) => {
  try {
    // Sort by latest first
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate('user', 'fullName email role')
      .populate('replies.user', 'fullName role');
      
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch posts', error: error.message });
  }
};

// @route   PUT /api/community/:id/like
// @desc    Like or Unlike a post
// @access  Private
exports.toggleLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    // Check if the post has already been liked by this user
    const hasLiked = post.likes.includes(req.user.userId);
    
    if (hasLiked) {
      // Unlike
      post.likes = post.likes.filter(id => id.toString() !== req.user.userId);
    } else {
      // Like
      post.likes.push(req.user.userId);
    }

    await post.save();
    res.json({ message: 'Like status updated', likes: post.likes });
  } catch (error) {
    res.status(500).json({ message: 'Action failed', error: error.message });
  }
};

// @route   DELETE /api/community/:id
// @desc    Delete a post (User deleting their own, or Admin deleting any)
// @access  Private
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    // Ensure authorized to delete
    if (post.user.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }

    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete post', error: error.message });
  }
};

// @route   POST /api/community/:id/reply
// @desc    Reply to a post
// @access  Private
exports.replyToPost = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: 'Reply text cannot be empty' });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    post.replies.push({
      user: req.user.userId,
      text
    });

    await post.save();
    
    const updatedPost = await Post.findById(post._id)
      .populate('user', 'fullName email role')
      .populate('replies.user', 'fullName role');

    res.json(updatedPost);
  } catch (error) {
    res.status(500).json({ message: 'Failed to post reply', error: error.message });
  }
};
