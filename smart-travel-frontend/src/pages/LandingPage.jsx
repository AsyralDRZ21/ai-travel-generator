import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import './LandingPage.css';

const features = [
  {
    icon:  <img src="/bot.png" alt="AI" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />,
    title: 'Smart Itinerary Generator',
    desc: 'Powered by our Core Engine, get personalized day-by-day travel plans tailored to your style and budget.',
    color: '#6366f1'
  },
  {
    icon:  <img src="/budget.png" alt="Budget" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />,
    title: 'Budget Tracker',
    desc: 'Log expenses by category, track spending against your budget in real time with visual progress bars.',
    color: '#10b981'
  },
  {
    icon: <img src="/currency.png" alt="Currency" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />,
    title: 'Currency Converter',
    desc: 'Convert between 30+ global currencies with live exchange rates — always know what you\'re spending.',
    color: '#06b6d4'
  },
  {
    icon:  <img src="/data.png" alt="Secure" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />,
    title: 'Secure Auth',
    desc: 'Your data is protected with JWT tokens and encrypted passwords. Login from anywhere.',
    color: '#f59e0b'
  }
];

export default function LandingPage() {
  return (
    <div className="landing-page">
      <Navbar />

      {/* Hero */}
      <section className="hero">
        <div className="hero-glow hero-glow-1" />
        <div className="hero-glow hero-glow-2" />
        <div className="hero-content fade-in">
          <div className="hero-badge">
            <span>✨</span> Smart Travel Planning
          </div>
          <h1 className="hero-title">
            Travel Smarter, Not Harder <br />
            <span className="gradient-text">with Smart Travel</span>
          </h1>
          <p className="hero-subtitle">
            Generate personalized itineraries, track your travel budget, and convert currencies all in one application.
          </p>
          <div className="hero-actions">
            <Link to="/register" className="btn btn-primary" id="hero-cta-register">
              <span style={{ color: '#fff', WebkitTextFillColor: '#fff' }}>Start Planning for Free</span>
            </Link>
            <Link to="/login" className="btn btn-secondary" id="hero-cta-login">
              Sign In
            </Link>
          </div>
          <div className="hero-stats">
            <div className="stat">
              <strong>AI-Powered</strong>
              <span>Itineraries</span>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <strong>30+</strong>
              <span>Currencies</span>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <strong>Free</strong>
              <span>To Use</span>
            </div>
          </div>
        </div>

        {/* Floating cards */}
        <div className="hero-visual">
          <div className="floating-card card-1 float">
            <div className="fc-icon">
              <img src="/Maps.png" alt="Map" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
            </div>
            <div className="fc-content">
              <div className="fc-title">Tokyo, Japan</div>
              <div className="fc-sub">7-day cultural trip</div>
            </div>
          </div>
          <div className="floating-card card-2">
            <div className="fc-icon">
              <img src="/budget.png" alt="Budget" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
            </div>
            <div className="fc-content">
              <div className="fc-title">Budget: $2,400</div>
              <div className="fc-sub">
                <div className="progress-container" style={{ width: 140 }}>
                  <div className="progress-bar safe" style={{ width: '65%' }} />
                </div>
              </div>
            </div>
          </div>
          <div className="floating-card card-3 float" style={{ animationDelay: '1s' }}>
            <div className="fc-icon">
              <img src="/currency.png" alt="Currency" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
            </div>
            <div className="fc-content">
              <div className="fc-title">1 USD = 149.5 JPY</div>
              <div className="fc-sub">Live rates</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features-section">
        <div className="content-wrapper">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 12 }}>
              Everything You Need to Travel Smart
            </h2>
            <p>A complete travel planning toolkit, all in one place.</p>
          </div>
          <div className="grid-2" style={{ gap: 24 }}>
            {features.map((f) => (
              <div key={f.title} className="glass-card feature-card" style={{ padding: 28 }}>
                <div className="feature-icon" style={{ background: `${f.color}22`, color: f.color }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: '1.15rem', marginBottom: 8 }}>{f.title}</h3>
                <p style={{ fontSize: '0.9rem' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-card glass-card">
          <h2>Ready to explore the world?</h2>
          <p>Join Smart Travel and let our algorithm plan your next adventure.</p>
          <Link to="/register" className="btn btn-primary" style={{ marginTop: 8 }}>
            <span style={{ color: '#fff', WebkitTextFillColor: '#fff' }}>Start Your Journey</span>
          </Link>
        </div>
      </section>

      <footer className="landing-footer">
        <p>© 2026 Smart travel · Built by Asyintelligent</p>
      </footer>
    </div>
  );
}
