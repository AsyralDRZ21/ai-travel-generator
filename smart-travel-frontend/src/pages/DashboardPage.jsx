import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import './DashboardPage.css';

const quickActions = [
  {
    id: 'dash-go-itinerary',
    icon: <img src="/Maps.png" alt="Currency" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />,
    title: 'Smart Planner',
    desc: 'Let our system plan your perfect trip',
    to: '/itinerary',
    gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    glow: 'rgba(99,102,241,0.4)'
  },
  {
    id: 'dash-go-budget',
    icon: <img src="/budget.png" alt="Currency" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />,
    title: 'Budget Tracker',
    desc: 'Track your travel expenses',
    to: '/budget',
    gradient: 'linear-gradient(135deg, #10b981, #06b6d4)',
    glow: 'rgba(16,185,129,0.4)'
  },
  {
    id: 'dash-go-currency',
    icon: <img src="/currency.png" alt="Currency" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />,
    title: 'Currency Converter',
    desc: 'Convert between 30+ currencies',
    to: '/currency',
    gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)',
    glow: 'rgba(245,158,11,0.4)'
  }
];

const tips = [
  { icon: <img src="/Maps.png" alt="Currency" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />, tip: 'Try generating a 5-day Tokyo itinerary with "cultural" style!' },
  { icon: <img src="/ai.png" alt="Currency" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />, tip: 'Create a budget before your trip to avoid overspending.' },
  { icon: <img src="/currency.png" alt="Currency" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />, tip: 'Always check live currency rates before exchanging money.' },
  { icon: <img src="/itinerary.png" alt="Currency" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />, tip: 'Save multiple itineraries to compare different destinations.' },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="page-container">
      <Navbar />
      <div className="content-wrapper fade-in">

        {/* Welcome Hero */}
        <div className="dashboard-hero glass-card">
          <div className="dashboard-hero-content">
            <div className="welcome-badge">🌏 Your Travel Hub</div>
            <div className="dashboard-content">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Welcome back, {user?.fullName?.split(' ')[0]}! 👋</h2>
            <p>Ready for your next adventure? Use our Smart System to plan, track, and convert.</p>
          </div>  {user?.preferences?.travelStyles?.length > 0 && (
              <div className="pref-badges">
                {user.preferences.travelStyles.map(s => (
                  <span key={s} className="badge badge-primary">{s}</span>
                ))}
              </div>
            )}
          </div>
          <div className="hero-plane float">✈️</div>
        </div>

        {/* Quick Actions */}
        <h2 className="section-title">What would you like to do?</h2>
        <div className="quick-actions">
          {quickActions.map((action) => (
            <Link
              key={action.id}
              id={action.id}
              to={action.to}
              className="action-card glass-card"
              style={{ '--card-gradient': action.gradient, '--card-glow': action.glow }}
            >
              <div className="action-icon">{action.icon}</div>
              <div className="action-content">
                <h3>{action.title}</h3>
                <p>{action.desc}</p>
              </div>
              <div className="action-arrow">→</div>
            </Link>
          ))}
        </div>

        {/* Travel Tips */}
        <h2 className="section-title" style={{ marginTop: 40 }}>✨ Travel Tips</h2>
        <div className="grid-2" style={{ gap: 16 }}>
          {tips.map((t, i) => (
            <div key={i} className="glass-card tip-card">
              <span className="tip-icon">{t.icon}</span>
              <p>{t.tip}</p>
            </div>
          ))}
        </div>

        {/* Stats row */}
        <div className="stats-row">
          <div className="stat-card stat-ai">
            <div className="stat-icon-bg">🧠</div>
            <div className="stat-number gradient-text">Smart</div>
            <div className="stat-label">Powered by Core Engine</div>
          </div>
          <div className="glass-card stat-box">
            <div className="stat-number gradient-text">30+</div>
            <div className="stat-label">Currencies Supported</div>
          </div>
          <div className="glass-card stat-box">
            <div className="stat-number gradient-text">∞</div>
            <div className="stat-label">Trips You Can Plan</div>
          </div>
          <div className="glass-card stat-box">
            <div className="stat-number gradient-text">🔒</div>
            <div className="stat-label">Secure & Private</div>
          </div>
        </div>

      </div>
    </div>
  );
}
