import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ReviewModal from '../components/ReviewModal';
import './TripHistoryPage.css';

const STATUS_CONFIG = {
  planned:   { label: 'Planned',   emoji: '📋', color: '#6366f1', bg: 'rgba(99,102,241,0.15)',  next: 'ongoing'   },
  ongoing:   { label: 'Ongoing',   emoji: '✈️', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)',  next: 'completed' },
  completed: { label: 'Completed', emoji: '✅', color: '#10b981', bg: 'rgba(16,185,129,0.15)',  next: null        },
};

const FILTER_OPTIONS = ['all', 'planned', 'ongoing', 'completed'];

export default function TripHistoryPage() {
  const { token } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);
  const [reviewTrip, setReviewTrip] = useState(null); // trip to review
  const [reviewedIds, setReviewedIds] = useState(new Set()); // track submitted reviews

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/itinerary`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch history');
      setHistory(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/itinerary/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setHistory(prev => prev.map(t => t._id === id ? { ...t, status: newStatus } : t));
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this itinerary?')) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/itinerary/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to delete');
      }
      setHistory(prev => prev.filter(item => item._id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const filtered = filter === 'all' ? history : history.filter(t => (t.status || 'planned') === filter);

  // Stats
  const counts = {
    all: history.length,
    planned: history.filter(t => (t.status || 'planned') === 'planned').length,
    ongoing: history.filter(t => (t.status || 'planned') === 'ongoing').length,
    completed: history.filter(t => (t.status || 'planned') === 'completed').length,
  };

  return (
    <div className="page-container" style={{ padding: '88px 40px 40px', maxWidth: 1100, margin: '0 auto' }}>
      <Navbar />

      {/* Header */}
      <div className="history-header">
        <h1> Trip History</h1>
        <p>Track and manage the lifecycle of all your travel plans.</p>
      </div>

      {/* Status Stats Bar */}
      <div className="status-stats-bar">
        {FILTER_OPTIONS.map(f => {
          const cfg = f === 'all' ? null : STATUS_CONFIG[f];
          return (
            <button
              key={f}
              className={`status-stat-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
              style={filter === f && cfg ? { borderColor: cfg.color, background: cfg.bg } : {}}
            >
              <span className="stat-emoji">{f === 'all' ? '🗂️' : cfg.emoji}</span>
              <span className="stat-count" style={filter === f && cfg ? { color: cfg.color } : {}}>{counts[f]}</span>
              <span className="stat-label">{f === 'all' ? 'All Trips' : cfg.label}</span>
            </button>
          );
        })}
      </div>

      {error && <div className="alert-error" style={{ padding: 12, borderRadius: 8, marginBottom: 20 }}>{error}</div>}

      {loading ? (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Loading your archives...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-history">
          <div style={{ fontSize: '4rem', opacity: 0.5 }}>🧳</div>
          <h3>{filter === 'all' ? 'No trips planned yet' : `No ${filter} trips`}</h3>
          <p>{filter === 'all' ? 'Use our Smart Generator to start planning your first adventure!' : `You have no trips marked as "${filter}".`}</p>
          {filter === 'all' && <Link to="/itinerary" className="btn btn-primary">Start Planning</Link>}
        </div>
      ) : (
        <div className="history-grid">
          {filtered.map(trip => {
            const status = trip.status || 'planned';
            const cfg = STATUS_CONFIG[status];
            const isUpdating = updatingId === trip._id;

            return (
              <div key={trip._id} className="history-card">
                {/* Status stripe at top */}
                <div className="history-status-stripe" style={{ background: cfg.color }} />

                <div className="history-card-top">
                  <div className="history-title-group">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <h2>{trip.destination}</h2>
                      {/* Status Badge */}
                      <span className="status-badge" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}` }}>
                        {cfg.emoji} {cfg.label}
                      </span>
                    </div>
                    <div className="history-meta">
                      <span className="meta-item">⏱️ {trip.duration} Days</span>
                      <span className="meta-item">🎒 {trip.travelStyle}</span>
                      {trip.budget > 0 && <span className="meta-item">💰 {trip.budget} {trip.currency}</span>}
                      <span className="meta-item">📅 {formatDate(trip.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="history-Overview">
                  <strong>Overview:</strong> {trip.plan?.overview || 'A great trip tailored for you.'}
                </div>

                {/* Trip Status Progress Tracker */}
                <div className="trip-progress-tracker">
                  {['planned', 'ongoing', 'completed'].map((s, idx) => {
                    const scfg = STATUS_CONFIG[s];
                    const isActive = s === status;
                    const isPast = ['planned', 'ongoing', 'completed'].indexOf(s) < ['planned', 'ongoing', 'completed'].indexOf(status);
                    return (
                      <>
                        <div key={s} className="tracker-step-wrap">
                          <div
                            className={`tracker-step ${isActive ? 'tracker-active' : ''} ${isPast ? 'tracker-done' : ''}`}
                            style={isActive ? { background: scfg.color, borderColor: scfg.color } : isPast ? { background: scfg.color + '88', borderColor: scfg.color + '88' } : {}}
                          >
                            <span>{scfg.emoji}</span>
                          </div>
                          <span className="tracker-label" style={isActive ? { color: scfg.color } : isPast ? { color: scfg.color + 'aa' } : {}}>
                            {scfg.label}
                          </span>
                        </div>
                        {/* Line rendered as flex sibling BETWEEN steps */}
                        {idx < 2 && (
                          <div
                            className={`tracker-line ${isPast || isActive ? 'tracker-line-done' : ''}`}
                            style={(isPast || isActive) ? { background: cfg.color } : {}}
                          />
                        )}
                      </>
                    );
                  })}
                </div>

                {/* Expanded Day Details */}
                {expandedId === trip._id && (
                  <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16 }}>
                    <h4 style={{ color: 'var(--text-primary)', marginBottom: 12 }}>Detailed Itinerary:</h4>
                    {trip.plan?.days?.map((day) => (
                      <div key={day.day} style={{ marginBottom: 16, background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8 }}>
                        <h5 style={{ color: 'var(--accent-primary)' }}>Day {day.day}: {day.title}</h5>
                        {day.activities && Array.isArray(day.activities) ? (
                          <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            {day.activities.map((act, idx) => (
                              <li key={idx} style={{ marginBottom: 4 }}>📍 <strong>{act.time || `Stop ${idx + 1}`}:</strong> {act.activity}</li>
                            ))}
                            <li style={{ marginTop: 8, color: 'var(--accent-tertiary)' }}>🏨 Lodging: {day.accommodation || 'None'}</li>
                          </ul>
                        ) : (
                          <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            {day.morning && <li style={{ marginBottom: 4 }}>🌅 <strong>Morning:</strong> {day.morning.activity}</li>}
                            {day.afternoon && <li style={{ marginBottom: 4 }}>☀️ <strong>Afternoon:</strong> {day.afternoon.activity}</li>}
                            {day.evening && <li style={{ marginBottom: 4 }}>🌙 <strong>Evening:</strong> {day.evening.activity}</li>}
                            <li style={{ marginTop: 8, color: 'var(--accent-tertiary)' }}>🏨 Lodging: {day.accommodation}</li>
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions Row */}
                <div className="history-actions">
                  <button
                    className="btn-history-view"
                    onClick={() => setExpandedId(expandedId === trip._id ? null : trip._id)}
                  >
                    {expandedId === trip._id ? '🔼 Hide Details' : '🔽 View Trip'}
                  </button>
                  {/* Write Review — only for completed trips */}
                  {status === 'completed' && (
                    <button
                      className="btn-status-advance"
                      style={{ borderColor: '#f59e0b', color: '#f59e0b' }}
                      onClick={() => setReviewTrip(trip)}
                      disabled={reviewedIds.has(trip._id)}
                    >
                      {reviewedIds.has(trip._id) ? '✅ Reviewed' : '⭐ Write Review'}
                    </button>
                  )}

                  {/* Advance Status Button */}
                  {cfg.next && (
                    <button
                      className="btn-status-advance"
                      style={{ borderColor: STATUS_CONFIG[cfg.next].color, color: STATUS_CONFIG[cfg.next].color }}
                      onClick={() => handleUpdateStatus(trip._id, cfg.next)}
                      disabled={isUpdating}
                    >
                      {isUpdating ? '⏳ Updating...' : `${STATUS_CONFIG[cfg.next].emoji} Mark as ${STATUS_CONFIG[cfg.next].label}`}
                    </button>
                  )}

                  {/* Revert to Planned if needed */}
                  {status !== 'planned' && (
                    <button
                      className="btn-status-revert"
                      onClick={() => handleUpdateStatus(trip._id, 'planned')}
                      disabled={isUpdating}
                      title="Reset to Planned"
                    >
                      ↩️
                    </button>
                  )}

                  <button
                    className="btn-history-delete"
                    onClick={() => handleDelete(trip._id)}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      {reviewTrip && (
        <ReviewModal
          trip={reviewTrip}
          onClose={() => setReviewTrip(null)}
          onSubmitted={(review) => {
            setReviewedIds(prev => new Set([...prev, reviewTrip._id]));
            setReviewTrip(null);
          }}
        />
      )}
    </div>
  );
}
