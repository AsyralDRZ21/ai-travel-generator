import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import './AuthPages.css';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }
    if (password.length < 8) {
      return setError('Password must be at least 8 characters');
    }
    
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return setError('Password must include uppercase, lowercase, number, and special character');
    }

    setLoading(true);
    setMessage('');
    setError('');

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/reset-password/${token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.message || 'Something went wrong');
      
      setMessage(data.message);
      // Automatically redirect to login after 3 seconds
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <Navbar />
      <div className="auth-bg-glow glow-1" />
      <div className="auth-bg-glow glow-2" />

      <div className="auth-container fade-in">
        <div className="auth-card glass-card">
          <div className="auth-logo">
            <div className="brand-icon" style={{ width: 48, height: 48, fontSize: '1.4rem' }}></div>
            <span className="auth-brand"></span>
          </div>
          <img src="/logo.png" alt="SmartTravel" style={{ height: 50, width: 10, objectFit: 'contain', margin: '0 auto 24px', display: 'block' }} />
          <h1 className="auth-title">Create New Password</h1>
          <p className="auth-subtitle">Your new password must be strong and secure.</p>

          {message && (
            <div className="alert alert-success" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid #10b981', padding: '12px', borderRadius: '8px', marginBottom: '20px' }}>
              <span>✅</span> {message}
            </div>
          )}

          {error && (
            <div className="alert alert-error">
              <span>⚠️</span> {error}
            </div>
          )}

          {!message && (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Min 8 chars, 1 uppercase, 1 special char"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <small style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>
                  Must contain uppercase, lowercase, number, and special char (@$!%*?&).
                </small>
              </div>

              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className={`btn btn-primary btn-block ${loading ? 'loading' : ''}`}
                disabled={loading}
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}

          <div className="auth-footer">
            <p><Link to="/login">Back to Login</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}
