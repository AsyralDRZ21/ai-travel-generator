import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import './PublicProfilePage.css';

const TRAVEL_STYLES = [
  { id: 'adventure', label: 'Adventure', icon: '🧗' },
  { id: 'relaxation', label: 'Relaxation', icon: '🏖️' },
  { id: 'cultural', label: 'Cultural', icon: '🎭' },
  { id: 'foodie', label: 'Foodie', icon: '🍜' },
  { id: 'nature', label: 'Nature', icon: '🌲' },
  { id: 'urban', label: 'Urban', icon: '🏙️' }
];

export default function PublicProfilePage() {
  const { userId } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState(null);
  const [recentPosts, setRecentPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // If they click on their own profile, redirect to dashboard settings
    if (user && user.id === userId) {
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
      const res = await fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`}/auth/public/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.message || 'Failed to fetch public profile');
      
      setProfile(data.profile);
      setRecentPosts(data.recentPosts);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <Navbar />
        <div className="loading-overlay" style={{ background: 'transparent' }}>
          <div className="spinner"></div>
          <p>Loading Explorer Profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="page-container">
        <Navbar />
        <div style={{ padding: '100px 20px', textAlign: 'center' }}>
          <h2>🕵️ User Not Found</h2>
          <p>{error || "This traveler's passport seems to be invalid."}</p>
          <button onClick={() => navigate('/community')} className="btn-primary mt-4">Back to Community</button>
        </div>
      </div>
    );
  }

  const { socialInfo, preferences } = profile;

  return (
    <div className="public-profile-container page-transition">
      <Navbar />
      
      <div className="profile-hero fade-in">
        <div className="hero-avatar">
          {profile.fullName?.charAt(0).toUpperCase()}
        </div>
        <h1 className="hero-name">
          {profile.fullName} 
          {profile.role === 'admin' && <span className="role-badge role-admin" style={{ marginLeft: 12, fontSize: '1rem' }}>Admin</span>}
        </h1>
        
        {socialInfo?.region && (
          <div className="hero-region mt-2">
            📍 {socialInfo.region}
          </div>
        )}



        <div className="social-links-grid">
          {socialInfo?.tiktok && (
            <a 
              href={`https://tiktok.com/${socialInfo.tiktok.startsWith('@') ? socialInfo.tiktok : '@' + socialInfo.tiktok}`} 
              target="_blank" 
              rel="noreferrer" 
              className="social-btn btn-tiktok"
            >
              🎵 TikTok
            </a>
          )}
          {socialInfo?.instagram && (
            <a 
              href={`https://instagram.com/${socialInfo.instagram.replace('@', '')}`} 
              target="_blank" 
              rel="noreferrer" 
              className="social-btn btn-instagram"
            >
              📸 Instagram
            </a>
          )}
          {socialInfo?.phone && (
            <a 
              href={`https://wa.me/${socialInfo.phone.replace(/[^0-9]/g, '')}`} 
              target="_blank" 
              rel="noreferrer" 
              className="social-btn btn-whatsapp"
            >
              💬 WhatsApp
            </a>
          )}
        </div>
      </div>

      <div className="public-stats-grid fade-in delay-1">
        <div className="glass-panel">
          <h3 style={{ marginBottom: 16 }}>Passport Stamped</h3>
          <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
            Joined on {new Date(profile.createdAt).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="glass-panel">
          <h3 style={{ marginBottom: 16 }}>Travel Styles</h3>
          <div className="preference-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))' }}>
            {preferences?.travelStyles?.length > 0 ? (
              preferences.travelStyles.map(styleId => {
                const s = TRAVEL_STYLES.find(x => x.id === styleId);
                return s ? (
                  <div key={styleId} style={{ background: 'rgba(255,255,255,0.1)', padding: '8px 12px', borderRadius: 20, textAlign: 'center', fontSize: '0.9rem' }}>
                    {s.icon} {s.label}
                  </div>
                ) : null;
              })
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>No styles selected yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="public-activity-section fade-in delay-2">
        <h3>📢 Recent Broadcasts</h3>
        {recentPosts.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            This traveler hasn't posted any updates yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {recentPosts.map(post => (
              <div key={post._id} className="post-card" style={{ padding: 20 }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                  Posted on {new Date(post.createdAt).toLocaleDateString()}
                </div>
                <div style={{ fontSize: '1.05rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {post.content}
                </div>
                <div style={{ marginTop: 12, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  ❤️ {post.likes?.length || 0} Likes
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
