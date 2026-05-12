import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const STAR_LABELS = ['', 'Terrible', 'Poor', 'Average', 'Good', 'Excellent'];

export default function ReviewModal({ trip, onClose, onSubmitted }) {
  const { token } = useAuth();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) { setError('Please select a star rating'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ itineraryId: trip._id, rating, title, content })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      onSubmitted(data.review);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
              ⭐ Write a Review
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>📍 {trip.destination}</p>
          </div>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#ef4444', fontSize: '0.85rem', marginBottom: 16 }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Star Rating */}
          <div style={{ marginBottom: 20, textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Overall Rating
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 6 }}>
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  style={{
                    fontSize: '2rem',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease',
                    transform: (hovered || rating) >= star ? 'scale(1.2)' : 'scale(1)',
                    filter: (hovered || rating) >= star ? 'none' : 'grayscale(1) opacity(0.4)',
                  }}
                >
                  ⭐
                </button>
              ))}
            </div>
            {(hovered || rating) > 0 && (
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f59e0b' }}>
                {STAR_LABELS[hovered || rating]}
              </div>
            )}
          </div>

          {/* Review Title */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Review Title</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Amazing hidden gems in Tokyo!"
              required
              maxLength={100}
              style={inputStyle}
            />
          </div>

          {/* Review Content */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Your Experience</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Share what you loved, tips for others, what to avoid..."
              required
              maxLength={1000}
              rows={4}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
            />
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'right', marginTop: 4 }}>
              {content.length}/1000
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || rating === 0}
            style={{
              width: '100%', padding: '13px',
              background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
              border: 'none', borderRadius: 10, color: '#fff',
              fontSize: '0.95rem', fontWeight: 700, cursor: loading ? 'wait' : 'pointer',
              opacity: rating === 0 ? 0.5 : 1, fontFamily: 'Inter, sans-serif',
              transition: 'all 0.2s ease'
            }}
          >
            {loading ? '⏳ Submitting...' : '⭐ Post Review'}
          </button>
        </form>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed', inset: 0, zIndex: 999,
  background: 'rgba(0,0,0,0.6)',
  backdropFilter: 'blur(6px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
};

const modalStyle = {
  background: 'linear-gradient(135deg, #0f172a, #1e1b4b)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 16, padding: 28,
  width: '100%', maxWidth: 480,
  boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
  animation: 'fadeIn 0.2s ease'
};

const closeBtnStyle = {
  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, color: 'var(--text-muted)', cursor: 'pointer',
  padding: '4px 10px', fontSize: '1rem', fontFamily: 'Inter, sans-serif',
  transition: 'all 0.2s'
};

const labelStyle = {
  display: 'block', fontSize: '0.8rem', fontWeight: 600,
  color: 'var(--text-muted)', marginBottom: 6,
  textTransform: 'uppercase', letterSpacing: '0.05em'
};

const inputStyle = {
  width: '100%', padding: '11px 14px',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, color: 'var(--text-primary)',
  fontSize: '0.9rem', fontFamily: 'Inter, sans-serif',
  outline: 'none', boxSizing: 'border-box'
};
