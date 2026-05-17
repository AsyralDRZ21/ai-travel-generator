import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import './CommunityPage.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function StarDisplay({ rating }) {
  return (
    <span style={{ fontSize: '1rem', letterSpacing: 1 }}>
      {[1,2,3,4,5].map(s => (
        <span key={s} style={{ filter: s <= rating ? 'none' : 'grayscale(1) opacity(0.3)' }}>⭐</span>
      ))}
    </span>
  );
}

export default function CommunityPage() {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState('posts');

  // Posts state
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [postsLoading, setPostsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [activeReplyPost, setActiveReplyPost] = useState(null);
  const [replyText, setReplyText] = useState('');

  // Search state
  const [postSearch, setPostSearch] = useState('');
  const [reviewSearch, setReviewSearch] = useState('');
  const [reviewRatingFilter, setReviewRatingFilter] = useState('all');

  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsLoaded, setReviewsLoaded] = useState(false);

  // Filtered data
  const filteredPosts = posts.filter(p =>
    p.content?.toLowerCase().includes(postSearch.toLowerCase()) ||
    p.user?.fullName?.toLowerCase().includes(postSearch.toLowerCase())
  );

  const filteredReviews = reviews.filter(r => {
    const matchText =
      r.destination?.toLowerCase().includes(reviewSearch.toLowerCase()) ||
      r.title?.toLowerCase().includes(reviewSearch.toLowerCase()) ||
      r.content?.toLowerCase().includes(reviewSearch.toLowerCase());
    const matchRating = reviewRatingFilter === 'all' || r.rating === Number(reviewRatingFilter);
    return matchText && matchRating;
  });

  useEffect(() => { fetchPosts(); }, [token]);

  useEffect(() => {
    if (activeTab === 'reviews' && !reviewsLoaded) fetchReviews();
  }, [activeTab]);

  // ─── Posts ───────────────────────────────────────────────
  const fetchPosts = async () => {
    try {
      const res = await fetch(`${API}/community`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setPosts(data);
    } catch (err) { setError(err.message); }
    finally { setPostsLoading(false); }
  };

  const handlePost = async (e) => {
    e.preventDefault();
    if (!newPost.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/community`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ content: newPost })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setPosts([data, ...posts]);
      setNewPost('');
    } catch (err) { alert(err.message); }
    finally { setSubmitting(false); }
  };

  const handleLike = async (postId) => {
    try {
      const res = await fetch(`${API}/community/${postId}/like`, {
        method: 'PUT', headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(posts.map(p => p._id === postId ? { ...p, likes: data.likes } : p));
      }
    } catch (err) { console.error(err); }
  };

  const handleReply = async (postId) => {
    if (!replyText.trim()) return;
    try {
      const res = await fetch(`${API}/community/${postId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ text: replyText })
      });
      if (res.ok) {
        const updated = await res.json();
        setPosts(posts.map(p => p._id === postId ? updated : p));
        setReplyText('');
      }
    } catch (err) { console.error(err); }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Delete this post?')) return;
    try {
      const res = await fetch(`${API}/community/${postId}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setPosts(posts.filter(p => p._id !== postId));
    } catch (err) { console.error(err); }
  };

  // ─── Reviews ─────────────────────────────────────────────
  const fetchReviews = async () => {
    setReviewsLoading(true);
    try {
      const res = await fetch(`${API}/reviews`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setReviews(data);
      setReviewsLoaded(true);
    } catch (err) { console.error(err); }
    finally { setReviewsLoading(false); }
  };

  const handleDeleteReview = async (id) => {
    if (!window.confirm('Delete your review?')) return;
    try {
      const res = await fetch(`${API}/reviews/${id}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setReviews(reviews.filter(r => r._id !== id));
    } catch (err) { console.error(err); }
  };

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="community-container page-transition">
      <Navbar />

      <div className="community-header fade-in">
        <h1 className="page-title"> Community Hub</h1>
        <p className="page-subtitle">Share travel tips, ask questions, and read real traveler reviews.</p>
      </div>

      {/* Tab Switcher */}
      <div className="community-tabs fade-in">
        <button
          className={`community-tab ${activeTab === 'posts' ? 'active' : ''}`}
          onClick={() => setActiveTab('posts')}
        >
          💬 Posts & Discussions
        </button>
        <button
          className={`community-tab ${activeTab === 'reviews' ? 'active' : ''}`}
          onClick={() => setActiveTab('reviews')}
        >
          ⭐ Travel Reviews
          {reviews.length > 0 && <span className="tab-badge">{reviews.length}</span>}
        </button>
      </div>

      {/* ─── POSTS TAB ─── */}
      {activeTab === 'posts' && (
        <div className="community-feed fade-in">

          {/* Search Bar for Posts */}
          <div className="search-bar-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="community-search-input"
              placeholder="Search posts or traveler names..."
              value={postSearch}
              onChange={e => setPostSearch(e.target.value)}
            />
            {postSearch && (
              <button className="search-clear-btn" onClick={() => setPostSearch('')}>✕</button>
            )}
          </div>
          <div className="glass-card post-composer">
            <form onSubmit={handlePost}>
              <textarea
                className="post-textarea"
                placeholder="What travel tips do you want to share today? e.g. Just came back from Japan!"
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                disabled={submitting}
              />
              <div className="post-actions">
                <button type="submit" className="post-btn" disabled={!newPost.trim() || submitting}>
                  {submitting ? 'Posting...' : ' Post'}
                </button>
              </div>
            </form>
          </div>

          {error && <div className="alert-error" style={{ padding: 12, borderRadius: 8 }}>{error}</div>}

          {postsLoading ? (
            <div className="loading-overlay" style={{ background: 'transparent' }}>
              <div className="spinner"></div><p>Loading timeline...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="search-empty-state">
              <div style={{ fontSize: '2.5rem' }}>🔍</div>
              <p>No posts found for <strong>"{postSearch}"</strong></p>
              <button className="search-clear-btn" style={{ marginTop: 8 }} onClick={() => setPostSearch('')}>Clear Search</button>
            </div>
          ) : filteredPosts.map(post => {
            const hasLiked = post.likes.includes(user.id);
            const canDelete = post.user?._id === user.id || user.role === 'admin';
            return (
              <div key={post._id} className="post-card">
                <div className="post-card-header">
                  <div className="post-author">
                    <Link to={post.user ? `/user/${post.user._id}` : '#'} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="post-avatar">{post.user ? post.user.fullName.charAt(0).toUpperCase() : '?'}</div>
                      <div className="post-author-info">
                        <span className="post-author-name">
                          {post.user ? post.user.fullName : 'Unknown Traveler'}
                          {post.user?.role === 'admin' && <span className="role-badge role-admin" style={{ marginLeft: 8, padding: '2px 6px', fontSize: '0.7rem' }}>Admin</span>}
                        </span>
                        <span className="post-time">{new Date(post.createdAt).toLocaleDateString()} at {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </Link>
                  </div>
                  {canDelete && <button className="delete-btn" onClick={() => handleDeletePost(post._id)}>🗑️</button>}
                </div>
                <div className="post-body">{post.content}</div>
                <div className="post-footer" style={{ display: 'flex', gap: '16px' }}>
                  <button className={`like-btn ${hasLiked ? 'liked' : ''}`} onClick={() => handleLike(post._id)}>
                    {hasLiked ? '❤️' : '🤍'} {post.likes.length} Likes
                  </button>
                  <button
                    onClick={() => { setActiveReplyPost(activeReplyPost === post._id ? null : post._id); if (activeReplyPost !== post._id) setReplyText(''); }}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    💬 {post.replies?.length || 0} Replies
                  </button>
                </div>
                {activeReplyPost === post._id && (
                  <div className="post-replies fade-in" style={{ marginTop: '16px', borderTop: '1px solid var(--glass-border)', paddingTop: '16px' }}>
                    {post.replies?.length > 0 ? post.replies.map((reply, i) => (
                      <div key={i} style={{ marginBottom: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', padding: '12px', borderRadius: '8px' }}>
                        <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{reply.user?.fullName || 'Traveler'}</strong>
                        {reply.user?.role === 'admin' && <span className="role-badge role-admin" style={{ marginLeft: 6, padding: '2px 4px', fontSize: '0.65rem' }}>Admin</span>}
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '8px' }}>{new Date(reply.createdAt).toLocaleDateString()}</span>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{reply.text}</p>
                      </div>
                    )) : (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '12px' }}>No replies yet. Be the first!</p>
                    )}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      <input type="text" placeholder="Write a reply..." value={replyText} onChange={e => setReplyText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleReply(post._id)}
                        style={{ flex: 1, padding: '10px 16px', borderRadius: '20px', background: '#ffffff', border: '1.5px solid var(--glass-border)', color: 'var(--text-primary)', outline: 'none', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem' }}
                      />
                      <button onClick={() => handleReply(post._id)} disabled={!replyText.trim()}
                        style={{ background: 'var(--accent-primary)', color: 'white', border: 'none', padding: '0 20px', borderRadius: '20px', cursor: 'pointer', opacity: replyText.trim() ? 1 : 0.5, fontWeight: 'bold' }}>
                        Send
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Result count */}
          {postSearch && !postsLoading && (
            <div className="search-result-count">
              Showing {filteredPosts.length} of {posts.length} posts
            </div>
          )}
        </div>
      )}

      {/* ─── REVIEWS TAB ─── */}
      {activeTab === 'reviews' && (
        <div className="reviews-feed fade-in">

          {/* Search Bar for Reviews */}
          <div className="search-bar-wrapper" style={{ maxWidth: 760, margin: '0 auto 20px auto' }}>
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="community-search-input"
              placeholder="Search by destination, title or content..."
              value={reviewSearch}
              onChange={e => setReviewSearch(e.target.value)}
            />
            {reviewSearch && (
              <button className="search-clear-btn" onClick={() => setReviewSearch('')}>✕</button>
            )}
            <select
              className="review-rating-select"
              value={reviewRatingFilter}
              onChange={e => setReviewRatingFilter(e.target.value)}
            >
              <option value="all">⭐ All Ratings</option>
              <option value="5">⭐⭐⭐⭐⭐ 5 Stars</option>
              <option value="4">⭐⭐⭐⭐ 4 Stars</option>
              <option value="3">⭐⭐⭐ 3 Stars</option>
              <option value="2">⭐⭐ 2 Stars</option>
              <option value="1">⭐ 1 Star</option>
            </select>
          </div>

          {/* Summary Bar */}
          {reviews.length > 0 && (
            <div className="reviews-summary-bar">
              <div className="reviews-summary-stat">
                <span className="summary-big">{avgRating}</span>
                <StarDisplay rating={Math.round(avgRating)} />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Average Rating</span>
              </div>
              <div className="reviews-summary-stat" style={{ borderLeft: '1px solid var(--glass-border)', paddingLeft: 28 }}>
                <span className="summary-big">{reviews.length}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Reviews</span>
              </div>
              <div className="reviews-summary-stat" style={{ borderLeft: '1px solid var(--glass-border)', paddingLeft: 28 }}>
                <span className="summary-big">{new Set(reviews.map(r => r.destination.toLowerCase())).size}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Destinations Reviewed</span>
              </div>
            </div>
          )}

          {reviewsLoading ? (
            <div className="loading-overlay" style={{ background: 'transparent' }}>
              <div className="spinner"></div><p>Loading reviews...</p>
            </div>
          ) : reviews.length === 0 ? (
            <div className="empty-reviews">
              <div style={{ fontSize: '3.5rem' }}>✈️</div>
              <h3>No reviews yet</h3>
              <p>Complete a trip in your Trip History and write the first review!</p>
              <Link to="/history" className="btn btn-primary" style={{ marginTop: 8 }}>Go to Trip History</Link>
            </div>
          ) : (
            <>
              {(reviewSearch || reviewRatingFilter !== 'all') && (
                <div className="search-result-count" style={{ maxWidth: 900, margin: '0 auto 16px auto' }}>
                  Showing {filteredReviews.length} of {reviews.length} reviews
                </div>
              )}

              <div className="reviews-grid">
              {filteredReviews.length === 0 ? (
                <div className="search-empty-state" style={{ gridColumn: '1/-1' }}>
                  <div style={{ fontSize: '2.5rem' }}>🔍</div>
                  <p>No reviews found matching your search.</p>
                  <button className="search-clear-btn" style={{ marginTop: 8 }} onClick={() => { setReviewSearch(''); setReviewRatingFilter('all'); }}>Clear Filters</button>
                </div>
              ) : filteredReviews.map(review => {
                const isOwner = review.userId === user?.id || review.userId === user?._id;
                return (
                  <div key={review._id} className="review-card">
                    {/* Destination Header */}
                    <div className="review-card-header">
                      <div>
                        <div className="review-destination">📍 {review.destination}</div>
                        <StarDisplay rating={review.rating} />
                      </div>
                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        <span className="review-rating-num">{review.rating}.0 / 5</span>
                        {isOwner && (
                          <button className="review-delete-btn" onClick={() => handleDeleteReview(review._id)}>🗑️ Delete</button>
                        )}
                      </div>
                    </div>

                    {/* Review Body */}
                    <h4 className="review-title">"{review.title}"</h4>
                    <p className="review-content">{review.content}</p>

                    {/* Footer */}
                    <div className="review-footer">
                      <div className="review-avatar">{review.userName?.charAt(0).toUpperCase()}</div>
                      <div>
                        <div className="review-author">{review.userName}</div>
                        <div className="review-date">{new Date(review.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
            </>
          )}

        </div>
      )}
    </div>
  );
}
