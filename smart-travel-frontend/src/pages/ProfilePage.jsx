import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import './ProfilePage.css';

import { TRAVEL_STYLES, STYLE_ICONS } from '../utils/constants';

export default function ProfilePage() {
  const { user, token, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: ''
  });

  const [preferences, setPreferences] = useState({
    travelStyles: [],
    isMuslimTraveller: false
  });

  const [socialInfo, setSocialInfo] = useState({
    tiktok: '',
    instagram: '',
    phone: '',
    region: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || '',
        email: user.email || '',
        password: '' // Keep empty for security
      });
      if (user.preferences) {
        setPreferences({
          travelStyles: user.preferences.travelStyles || [],
          isMuslimTraveller: !!user.preferences.isMuslimTraveller
        });
      }
      if (user.socialInfo) {
        setSocialInfo({
          tiktok: user.socialInfo.tiktok || '',
          instagram: user.socialInfo.instagram || '',
          phone: user.socialInfo.phone || '',
          region: user.socialInfo.region || ''
        });
      }
    }
  }, [user]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSocialChange = (e) => {
    setSocialInfo({ ...socialInfo, [e.target.name]: e.target.value });
  };

  const toggleTravelStyle = (styleId) => {
    setPreferences(prev => {
      const isSelected = prev.travelStyles.includes(styleId);
      if (isSelected) {
        return { ...prev, travelStyles: prev.travelStyles.filter(id => id !== styleId) };
      } else {
        return { ...prev, travelStyles: [...prev.travelStyles, styleId] };
      }
    });
  };

  const toggleMuslimTraveller = () => {
    setPreferences(prev => ({
      ...prev,
      isMuslimTraveller: !prev.isMuslimTraveller
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const submitData = {
        fullName: formData.fullName,
        email: formData.email,
        preferences: preferences,
        socialInfo: socialInfo
      };
      
      // Only send password if user typed a new one
      if (formData.password) submitData.password = formData.password;

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(submitData)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to update profile');
      }

      updateUser(data.user);
      setMessage('Profile updated successfully! ');
      setFormData(prev => ({ ...prev, password: '' })); // clear password field
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const userInitial = (formData.fullName || user?.fullName || 'U').charAt(0).toUpperCase();
  const userId = user?._id || user?.id;

  return (
    <div className="profile-page-wrapper">
      <Navbar />

      <div className="profile-container">

        {/* ── PROFILE HERO BANNER ── */}
        <div className="profile-hero-card">
          <div className="profile-hero-left">
            <div className="profile-avatar-circle">
              <span className="profile-avatar-letter">{userInitial}</span>
              <span className="profile-status-dot" title="Active Account"></span>
            </div>

            <div className="profile-hero-meta">
              <div className="profile-name-row">
                <h1 className="profile-display-name">{formData.fullName || 'Explorer'}</h1>
                <span className="profile-badge-verified">✓ Verified</span>
                {preferences.isMuslimTraveller && (
                  <span className="profile-badge-muslim">🕌 Muslim Traveller</span>
                )}
              </div>
              <p className="profile-display-email">✉️ {formData.email || 'No email registered'}</p>
              <div className="profile-pills-row">
                <span className="profile-pill">
                  📍 {socialInfo.region || 'Region not set'}
                </span>
                <span className="profile-pill">
                  🎒 {preferences.travelStyles.length} Travel {preferences.travelStyles.length === 1 ? 'Style' : 'Styles'}
                </span>
                <span className="profile-pill">
                  ⭐ Smart Explorer
                </span>
              </div>
            </div>
          </div>

          <div className="profile-hero-right">
            {userId && (
              <Link to={`/user/${userId}`} className="btn-view-public" title="View your public profile as seen by other travelers">
                <span> View Public Profile</span>
                <span className="btn-arrow"></span>
              </Link>
            )}
          </div>
        </div>

        {/* ── ALERTS ── */}
        {message && (
          <div className="profile-alert alert-success fade-in">
            <span>✅</span>
            <span>{message}</span>
          </div>
        )}
        {error && (
          <div className="profile-alert alert-error fade-in">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* ── MAIN FORM ── */}
        <form onSubmit={handleSubmit} className="profile-form-grid">

          {/* 1. Account Details Card */}
          <div className="profile-card">
            <div className="card-header">
              <div className="card-header-icon">👤</div>
              <div>
                <h2 className="card-title">Account Details</h2>
                <p className="card-subtitle">Manage your personal credentials & login access</p>
              </div>
            </div>

            <div className="card-body">
              <div className="input-field-group">
                <label className="input-label">Full Name</label>
                <div className="input-with-icon">
                  <span className="field-icon"></span>
                  <input 
                    type="text" 
                    name="fullName"
                    className="styled-input" 
                    placeholder="Your Full Name"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="input-field-group">
                <label className="input-label">Email Address</label>
                <div className="input-with-icon">
                  <span className="field-icon"></span>
                  <input 
                    type="email" 
                    name="email"
                    className="styled-input" 
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="input-field-group">
                <label className="input-label">New Password (Optional)</label>
                <div className="input-with-icon">
                  <span className="field-icon"></span>
                  <input 
                    type="password" 
                    name="password"
                    className="styled-input" 
                    placeholder="Leave blank to keep current password"
                    value={formData.password}
                    onChange={handleInputChange}
                    minLength="6"
                  />
                </div>
                <span className="field-helper">Minimum 6 characters if you wish to change it.</span>
              </div>
            </div>
          </div>

          {/* 2. Public Identity Card */}
          <div className="profile-card">
            <div className="card-header">
              <div className="card-header-icon">🌐</div>
              <div>
                <h2 className="card-title">Public Identity</h2>
                <p className="card-subtitle">Displayed on your community profile & posts</p>
              </div>
            </div>

            <div className="card-body">
              <div className="input-field-group">
                <label className="input-label">Home City / Country</label>
                <div className="input-with-icon">
                  <span className="field-icon"></span>
                  <input 
                    type="text" 
                    name="region"
                    className="styled-input" 
                    placeholder="e.g. Kuala Lumpur, Malaysia"
                    value={socialInfo.region}
                    onChange={handleSocialChange}
                  />
                </div>
              </div>

              <div className="input-field-group">
                <label className="input-label">WhatsApp / Phone</label>
                <div className="input-with-icon">
                  <span className="field-icon"></span>
                  <input 
                    type="text" 
                    name="phone"
                    className="styled-input" 
                    placeholder="+60 12-345 6789"
                    value={socialInfo.phone}
                    onChange={handleSocialChange}
                  />
                </div>
              </div>

              <div className="input-field-group">
                <label className="input-label">TikTok Username (Optional)</label>
                <div className="input-with-icon">
                  <span className="field-icon"></span>
                  <input 
                    type="text" 
                    name="tiktok"
                    className="styled-input" 
                    placeholder="@username"
                    value={socialInfo.tiktok}
                    onChange={handleSocialChange}
                  />
                </div>
              </div>

              <div className="input-field-group">
                <label className="input-label">Instagram Username (Optional)</label>
                <div className="input-with-icon">
                  <span className="field-icon"></span>
                  <input 
                    type="text" 
                    name="instagram"
                    className="styled-input" 
                    placeholder="username"
                    value={socialInfo.instagram}
                    onChange={handleSocialChange}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3. Muslim Traveller Switch Panel (Full Width) */}
          <div className="profile-card full-width muslim-mode-card">
            <div className="muslim-mode-content">
              <div className="muslim-mode-info">
                <div className="muslim-mode-title-row">
                  <span className="muslim-icon">🕌</span>
                  <div>
                    <h3 className="muslim-title">Muslim Traveller Mode</h3>
                    <p className="muslim-desc">
                      Automatically emphasize halal dining, prayer times, nearby mosques, and Muslim-friendly accommodations in your AI itineraries and recommendations.
                    </p>
                  </div>
                </div>
              </div>

              <label className="toggle-switch-wrapper">
                <input 
                  type="checkbox" 
                  checked={preferences.isMuslimTraveller}
                  onChange={toggleMuslimTraveller}
                  className="toggle-checkbox"
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>

          {/* 4. Travel Preferences Panel (Full Width) */}
          <div className="profile-card full-width">
            <div className="card-header flex-between">
              <div className="header-left">
                <div className="card-header-icon">🎒</div>
                <div>
                  <h2 className="card-title">Travel Styles & Vibes</h2>
                  <p className="card-subtitle">Choose the travel vibes that describe you (select multiple)</p>
                </div>
              </div>

              <span className="selected-counter-badge">
                {preferences.travelStyles.length} of {TRAVEL_STYLES.length} Selected
              </span>
            </div>

            <div className="travel-styles-grid">
              {TRAVEL_STYLES.map(style => {
                const isSelected = preferences.travelStyles.includes(style);
                return (
                  <button 
                    type="button"
                    key={style}
                    className={`travel-style-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleTravelStyle(style)}
                  >
                    <div className="style-icon-wrap">
                      <span className="style-icon">{STYLE_ICONS[style] || '✈️'}</span>
                      {isSelected && <span className="style-check-mark">✓</span>}
                    </div>
                    <span className="style-label">{style}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── ACTION BAR (Bottom) ── */}
          <div className="profile-action-bar full-width">
            <div className="action-info">
              <span> Remember to click <strong>Save Profile Changes</strong> to update your preferences.</span>
            </div>

            <button 
              type="submit" 
              className="btn-save-profile"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner spinner-sm" style={{ width: 18, height: 18, borderWidth: 2 }} />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <span> Save Profile Changes</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
