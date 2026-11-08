import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import './AuthPages.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.message || 'Something went wrong');
      
      setMessage(data.message);
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
          <h1 className="auth-title">Reset Password</h1>
          <p className="auth-subtitle">Enter your email and we'll send you a link to reset your password.</p>

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
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className={`btn btn-primary btn-block ${loading ? 'loading' : ''}`}
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}

          <div className="auth-footer">
            <p>Remember your password? <Link to="/login">Back to Login</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}
