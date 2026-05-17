import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../api/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import './AuthPages.css';
import { TRAVEL_STYLES, STYLE_ICONS } from '../utils/constants';
export default function RegisterPage() {
  const navigate = useNavigate();
  const { loginUser } = useAuth();
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', confirmPassword: '',
    preferences: { travelStyles: [], interests: [] }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const toggleStyle = (style) => {
    const styles = form.preferences.travelStyles;
    const updated = styles.includes(style) ? styles.filter(s => s !== style) : [...styles, style];
    setForm({ ...form, preferences: { ...form.preferences, travelStyles: updated } });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      return setError('Passwords do not match');
    }
    if (form.password.length < 8) {
      return setError('Password must be at least 8 characters');
    }
    
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(form.password)) {
      return setError('Password must include uppercase, lowercase, number, and special character');
    }

    setLoading(true);
    try {
      const { data } = await register({
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        preferences: form.preferences
      });
      loginUser(data.token, data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <Navbar />
      <div className="auth-bg-glow glow-1" />
      <div className="auth-bg-glow glow-2" />

      <div className="auth-container fade-in" style={{ maxWidth: 480 }}>
        <div className="auth-card glass-card">
          <div className="auth-logo">
            <div className="brand-icon" style={{ width: 48, height: 48, fontSize: '1.4rem' }}></div>
            <span className="auth-brand"></span>
          </div>
          <img src="/logo.png" alt="SmartTravel" style={{ height: 60, width: 400, objectFit: 'contain' }} />
          <h1 className="auth-title">Create account</h1>
          <p className="auth-subtitle">Start planning smarter trips today</p>

          {error && (
            <div className="alert alert-error"><span>⚠️</span> {error}</div>
          )}

          <form onSubmit={handleSubmit} id="register-form">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                id="register-name"
                name="fullName"
                type="text"
                className="form-input"
                placeholder="Sultan Selangor"
                value={form.fullName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                id="register-email"
                name="email"
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  id="register-password"
                  name="password"
                  type="password"
                  className="form-input"
                  placeholder="Password"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
                <small style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>
                  Must contain uppercase, lowercase, number, and special char (@$!%*?&).
                </small>
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input
                  id="register-confirm-password"
                  name="confirmPassword"
                  type="password"
                  className="form-input"
                  placeholder="Repeat password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Travel style preferences */}
            <div className="form-group" style={{ marginTop: '16px' }}>
              <label className="form-label" style={{ marginBottom: '12px' }}>What kind of traveler are you? (Optional)</label>
              <div 
                className="style-picker" 
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', 
                  gap: '8px', 
                  maxHeight: '220px', 
                  overflowY: 'auto', 
                  padding: '4px',
                  scrollbarWidth: 'thin'
                }}
              >
                {TRAVEL_STYLES.map(style => (
                  <button
                    key={style}
                    type="button"
                    className={`style-badge ${form.preferences.travelStyles.includes(style) ? 'active' : ''}`}
                    onClick={() => toggleStyle(style)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      justifyContent: 'flex-start',
                      padding: '8px 12px',
                      fontSize: '0.85rem'
                    }}
                  >
                    <span style={{ fontSize: '1.2rem' }}>{STYLE_ICONS[style]}</span>
                    <span style={{ textTransform: 'capitalize' }}>{style}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              id="register-submit"
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '1rem', marginTop: 8 }}
              disabled={loading}
            >
              {loading ? (
                <><span className="spinner spinner-sm" /> Creating account...</>
              ) : (
                ' Create Account'
              )}
            </button>
          </form>

          <div className="auth-footer">
            <p>Already have an account? <Link to="/login">Sign in </Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}
