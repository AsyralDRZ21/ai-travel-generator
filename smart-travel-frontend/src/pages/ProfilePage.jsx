import { useState, useEffect } from 'react';
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
    travelStyles: []
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
          travelStyles: user.preferences.travelStyles || []
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
      setMessage('Profile updated successfully! 🎉');
      setFormData(prev => ({ ...prev, password: '' })); // clear password field
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <Navbar />
      <div className="page-header">
        <h1 className="page-title"> Profile Management</h1>
        <p className="page-subtitle">Update your personal details & travel preferences</p>
      </div>

      {message && <div className="alert-msg alert-success">{message}</div>}
      {error && <div className="alert-msg alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="profile-layout">
        
        {/* Personal Details Panel */}
        <div className="glass-panel">
          <h2 className="panel-title">🛡️ Account Details</h2>
          
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input 
              type="text" 
              name="fullName"
              className="form-input" 
              value={formData.fullName}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input 
              type="email" 
              name="email"
              className="form-input" 
              value={formData.email}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">New Password (Optional)</label>
            <input 
              type="password" 
              name="password"
              className="form-input" 
              placeholder="Leave blank to keep current password"
              value={formData.password}
              onChange={handleInputChange}
              minLength="6"
            />
          </div>
        </div>

        {/* Social Links Panel */}
        <div className="glass-panel">
          <h2 className="panel-title">📱 Public Identity</h2>
          <p className="form-label mb-3">Visible on your Community Public Profile</p>
          
          <div className="form-group">
            <label className="form-label">Tiktok (Optional)</label>
            <input 
              type="text" 
              name="tiktok"
              className="form-input" 
              placeholder="@username"
              value={socialInfo.tiktok}
              onChange={handleSocialChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Instagram (Optional)</label>
            <input 
              type="text" 
              name="instagram"
              className="form-input" 
              placeholder="username"
              value={socialInfo.instagram}
              onChange={handleSocialChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Region/Country</label>
            <input 
              type="text" 
              name="region"
              className="form-input" 
              placeholder="e.g. Kuala Lumpur, Malaysia"
              value={socialInfo.region}
              onChange={handleSocialChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">WhatsApp/Phone</label>
            <input 
              type="text" 
              name="phone"
              className="form-input" 
              placeholder="+60123456789"
              value={socialInfo.phone}
              onChange={handleSocialChange}
            />
          </div>
        </div>

        {/* Travel Preferences Panel - Full Width */}
        <div className="glass-panel pref-panel">
          <h2 className="panel-title">❤️ Travel Preferences</h2>
          <p className="form-label mb-3">What kind of traveler are you?(Select multiple)</p>
          
          <div className="preference-grid">
            {TRAVEL_STYLES.map(style => (
              <button 
                type="button"
                key={style}
                className={`pref-btn ${preferences.travelStyles.includes(style) ? 'active' : ''}`}
                onClick={() => toggleTravelStyle(style)}
              >
                <span className="pref-icon">{STYLE_ICONS[style]}</span>
                <span style={{ textTransform: 'capitalize' }}>{style}</span>
              </button>
            ))}
          </div>

          <button 
            type="submit" 
            className="btn-primary mt-4"
            disabled={loading}
          >
            {loading ? 'Saving Changes...' : '💾 Save Profile'}
          </button>
        </div>

      </form>
    </div>
  );
}
