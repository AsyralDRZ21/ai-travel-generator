import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { STYLE_ICONS } from '../utils/constants';
import './PublicProfilePage.css';

export default function PublicProfilePage() {
  const { userId } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState(null);
  const [recentPosts, setRecentPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // If user views their own public profile, redirect to private profile editor
    if (user && (user.id === userId || user._id === userId)) {
      navigate('/profile');
      return;
    }

    if (token && userId) {
      fetchPublicData();
    }
    // eslint-disable-next-line
  }, [userId, token, user]);

  const fetchPublicData = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${apiUrl}/auth/public/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.message || 'Failed to fetch public profile');
      
      setProfile(data.profile);
      setRecentPosts(data.recentPosts || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Explorer';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Explorer';
    }
  };

  if (loading) {
    return (
      <div className="public-profile-wrapper">
        <Navbar />
        <div className="public-profile-loading">
          <div className="spinner"></div>
          <p>Loading Explorer Profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="public-profile-wrapper">
        <Navbar />
        <div className="public-profile-container">
          <div className="public-empty-card">
            <div className="public-empty-icon">🕵️</div>
            <h2>Explorer Not Found</h2>
            <p>{error || "This traveler's passport could not be found or has expired."}</p>
            <button onClick={() => navigate('/community')} className="btn-primary-back">
              ← Return to Community
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { socialInfo, preferences } = profile;
  const userInitial = (profile.fullName || 'E').charAt(0).toUpperCase();
  const travelStyles = preferences?.travelStyles || [];
  const joinedDate = formatDate(profile.createdAt);
  const firstName = profile.fullName ? profile.fullName.split(' ')[0] : 'Traveler';

  return (
    <div className="public-profile-wrapper">
      <Navbar />

      <div className="public-profile-container">
        {/* Navigation Breadcrumb */}
        <div className="public-nav-row">
          <button onClick={() => navigate('/community')} className="btn-back-link">
            <span className="arrow">←</span> Back to Community
          </button>
          <span className="public-breadcrumb-tag">🛂 Verified Traveler Passport</span>
        </div>

        {/* Hero Header Card */}
        <div className="public-hero-card">
          <div className="public-hero-top">
            <div className="public-avatar-wrapper">
              <div className="public-avatar-circle">
                <span className="public-avatar-initial">{userInitial}</span>
              </div>
              <span className="public-status-badge" title="Active Explorer"></span>
            </div>

            <div className="public-hero-info">
              <div className="public-name-row">
                <h1 className="public-name">{profile.fullName}</h1>
                <div className="public-badge-group">
                  <span className="badge-pill badge-verified">✓ Verified</span>
                  {profile.role === 'admin' && (
                    <span className="badge-pill badge-admin">👑 Admin</span>
                  )}
                  {preferences?.isMuslimTraveller && (
                    <span className="badge-pill badge-muslim">🕌 Muslim Traveller</span>
                  )}
                </div>
              </div>

              <div className="public-meta-pills">
                {socialInfo?.region && (
                  <span className="meta-pill">
                    📍 {socialInfo.region}
                  </span>
                )}
                <span className="meta-pill">
                  📅 Joined {joinedDate}
                </span>
                <span className="meta-pill">
                  🎒 {travelStyles.length} Travel {travelStyles.length === 1 ? 'Style' : 'Styles'}
                </span>
                <span className="meta-pill">
                  📢 {recentPosts.length} {recentPosts.length === 1 ? 'Broadcast' : 'Broadcasts'}
                </span>
              </div>
            </div>
          </div>

          {/* Social Links Row */}
          <div className="public-social-strip">
            <span className="social-strip-label">Connect with {firstName}:</span>
            <div className="public-social-buttons">
              {socialInfo?.tiktok && (
                <a 
                  href={`https://tiktok.com/${socialInfo.tiktok.startsWith('@') ? socialInfo.tiktok : '@' + socialInfo.tiktok}`} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="social-pill-btn pill-tiktok"
                  title="View TikTok Profile"
                >
                  <span className="social-icon">🎵</span>
                  <span className="social-text">TikTok</span>
                  <span className="social-handle">{socialInfo.tiktok.startsWith('@') ? socialInfo.tiktok : '@' + socialInfo.tiktok}</span>
                </a>
              )}
              {socialInfo?.instagram && (
                <a 
                  href={`https://instagram.com/${socialInfo.instagram.replace('@', '')}`} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="social-pill-btn pill-instagram"
                  title="View Instagram Profile"
                >
                  <span className="social-icon">📸</span>
                  <span className="social-text">Instagram</span>
                  <span className="social-handle">@{socialInfo.instagram.replace('@', '')}</span>
                </a>
              )}
              {socialInfo?.phone && (
                <a 
                  href={`https://wa.me/${socialInfo.phone.replace(/[^0-9]/g, '')}`} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="social-pill-btn pill-whatsapp"
                  title="Chat on WhatsApp"
                >
                  <span className="social-icon">💬</span>
                  <span className="social-text">WhatsApp</span>
                </a>
              )}
              {!socialInfo?.tiktok && !socialInfo?.instagram && !socialInfo?.phone && (
                <span className="social-empty-hint">No direct social links shared yet</span>
              )}
            </div>
          </div>
        </div>

        {/* 2-Column Info Grid */}
        <div className="public-cards-grid">
          {/* Passport & Details */}
          <div className="public-card">
            <div className="public-card-header">
              <div className="public-card-icon">🛂</div>
              <div className="header-meta">
                <h2 className="public-card-title">Passport Details</h2>
                <p className="public-card-subtitle">Verified platform credentials & preferences</p>
              </div>
            </div>

            <div className="public-details-list">
              <div className="public-detail-item">
                <span className="detail-item-icon">📅</span>
                <div className="detail-item-content">
                  <span className="detail-item-label">Passport Issued</span>
                  <span className="detail-item-value">{joinedDate}</span>
                </div>
              </div>

              <div className="public-detail-item">
                <span className="detail-item-icon">📍</span>
                <div className="detail-item-content">
                  <span className="detail-item-label">Home Base / Region</span>
                  <span className="detail-item-value">{socialInfo?.region || 'Global Explorer'}</span>
                </div>
              </div>

              <div className="public-detail-item">
                <span className="detail-item-icon">🕌</span>
                <div className="detail-item-content">
                  <span className="detail-item-label">Muslim Traveller Mode</span>
                  <span className="detail-item-value">
                    {preferences?.isMuslimTraveller ? (
                      <span className="status-highlight active">Enabled (Halal & Mosque Preferences Active)</span>
                    ) : (
                      <span className="status-highlight neutral">Standard Explorer</span>
                    )}
                  </span>
                </div>
              </div>

              <div className="public-detail-item">
                <span className="detail-item-icon">🛡️</span>
                <div className="detail-item-content">
                  <span className="detail-item-label">Account Standing</span>
                  <span className="detail-item-value">Active Community Member</span>
                </div>
              </div>
            </div>
          </div>

          {/* Travel Styles & Vibes */}
          <div className="public-card">
            <div className="public-card-header">
              <div className="public-card-icon">🎒</div>
              <div className="header-meta">
                <h2 className="public-card-title">Travel Styles & Vibes</h2>
                <p className="public-card-subtitle">Preferred ways of exploring the world</p>
              </div>
              <span className="public-counter-pill">
                {travelStyles.length} Selected
              </span>
            </div>

            {travelStyles.length > 0 ? (
              <div className="public-styles-cloud">
                {travelStyles.map(styleId => {
                  const icon = STYLE_ICONS[styleId] || '✨';
                  const label = styleId.charAt(0).toUpperCase() + styleId.slice(1);
                  return (
                    <div key={styleId} className="public-style-badge">
                      <span className="style-badge-icon">{icon}</span>
                      <span className="style-badge-label">{label}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="public-subtle-empty">
                <span className="subtle-icon">🎒</span>
                <p>No travel styles shared yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Broadcasts Section */}
        <div className="public-broadcasts-card">
          <div className="public-card-header">
            <div className="public-card-icon">📢</div>
            <div className="header-meta">
              <h2 className="public-card-title">Recent Broadcasts</h2>
              <p className="public-card-subtitle">Community posts and updates shared by {firstName}</p>
            </div>
            <span className="public-counter-pill">
              {recentPosts.length} {recentPosts.length === 1 ? 'Post' : 'Posts'}
            </span>
          </div>

          {recentPosts.length === 0 ? (
            <div className="public-broadcast-empty">
              <div className="empty-broadcast-icon">📣</div>
              <h3>No broadcasts yet</h3>
              <p>{firstName} hasn't posted any community updates yet. Check back soon!</p>
            </div>
          ) : (
            <div className="public-posts-feed">
              {recentPosts.map(post => (
                <div key={post._id} className="public-post-bubble">
                  <div className="post-bubble-header">
                    <div className="post-author-mini">
                      <div className="post-mini-avatar">{userInitial}</div>
                      <div>
                        <span className="post-author-name">{profile.fullName}</span>
                        <span className="post-timestamp">{formatDate(post.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="post-bubble-content">
                    {post.content}
                  </div>

                  <div className="post-bubble-footer">
                    <span className="post-like-tag">
                      ❤️ {post.likes?.length || 0} {post.likes?.length === 1 ? 'Like' : 'Likes'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
