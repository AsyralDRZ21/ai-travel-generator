import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../api/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import './AuthPages.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const { loginUser } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await login(form);
      loginUser(data.token, data.user);
      
      // Route admin directly to admin monitor dashboard
      if (data.user?.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
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
          {/* Logo */}
          <div className="auth-logo">
            <div className="brand-icon" style={{ width: 48, height: 48, fontSize: '1.4rem' }}></div>
            <span className="auth-brand"></span>
          </div>
          
          <img src="/logo.png" alt="SmartTravel" style={{ height: 60, width: 360, objectFit: 'contain' }} />
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Sign in to continue planning your adventures</p>

          {error && (
            <div className="alert alert-error">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} id="login-form">
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                id="login-email"
                name="email"
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                id="login-password"
                name="password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>

            <div style={{ textAlign: 'right', marginBottom: '16px' }}>
              <Link to="/forgot-password" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textDecoration: 'none' }}>
                Forgot Password?
              </Link>
            </div>
            <button
              id="login-submit"
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '1rem', marginTop: 8 }}
              disabled={loading}
            >
              {loading ? (
                <><span className="spinner spinner-sm" /> Signing in...</>
              ) : (
                ' Sign In'
              )}
            </button>
          </form>

          <div className="auth-footer">
            <p>Don't have an account? <Link to="/register">Create one free </Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}
