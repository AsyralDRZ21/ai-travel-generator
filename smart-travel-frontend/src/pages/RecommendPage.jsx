import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import './RecommendPage.css';

export default function RecommendPage() {
  const { user, token } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchRecommendations = async () => {
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/recommendations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Failed to fetch recommendations');
      }
      
      setRecommendations(data.recommendations);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Get flag image URL from country code returned by AI
  const getFlagUrl = (countryCode) => {
    if (!countryCode) return null;
    return `https://flagcdn.com/w640/${countryCode.toLowerCase()}.png`;
  };

  // Fallback gradient colors per card index
  const cardGradients = [
    'linear-gradient(135deg, #1a1a2e, #16213e)',
    'linear-gradient(135deg, #0f3460, #533483)',
    'linear-gradient(135deg, #1b1b2f, #2b2d42)',
    'linear-gradient(135deg, #2d6a4f, #1b4332)',
    'linear-gradient(135deg, #7b2d8b, #4a0e8f)',
    'linear-gradient(135deg, #c77dff, #7b2ff7)',
  ];

  return (
    <div className="recommend-container">
      <Navbar />
      <div className="recommend-header">
        <h1 className="recommend-title">Smart Destination Recommender</h1>
        <p className="recommend-subtitle">
          Not sure where to go next? Let our recommendation engine read your profile preferences 
          and suggest the perfect matching locations tailor-made just for you.
        </p>
        
        <button 
          className="hero-btn" 
          onClick={fetchRecommendations}
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="loader-spinner"></div>
              <span>Analyzing Profile...</span>
            </>
          ) : (
            <>
              <span> Discover My Perfect Destinations</span>
            </>
          )}
        </button>
      </div>

      {error && <div className="alert-msg alert-error" style={{ maxWidth: 600, margin: '0 auto' }}>{error}</div>}

      {recommendations.length > 0 ? (
        <div className="recommendations-grid">
          {recommendations.map((dest, i) => (
            <div className="dest-card" key={i}>
              <div className="dest-image-placeholder" style={{ background: cardGradients[i % cardGradients.length], position: 'relative', overflow: 'hidden' }}>
                {dest.countryCode ? (
                  <>
                    <img
                      src={getFlagUrl(dest.countryCode)}
                      alt={`${dest.destination} flag`}
                      style={{
                        width: '100%', height: '100%', objectFit: 'cover',
                        opacity: 0.6, position: 'absolute', inset: 0
                      }}
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 60%)',
                      display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start',
                      padding: '14px 16px'
                    }}>
                      <span style={{
                        fontSize: '0.8rem', fontWeight: 700, color: '#fff',
                        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
                        padding: '4px 10px', borderRadius: 20,
                        border: '1px solid rgba(255,255,255,0.2)'
                      }}>
                        🌍 {dest.destination.split(',')[1]?.trim() || dest.destination}
                      </span>
                    </div>
                  </>
                ) : (
                  <span style={{ fontSize: '4rem', zIndex: 1, position: 'relative' }}>🌍</span>
                )}
              </div>
              <div className="dest-content">
                <h3 className="dest-title">{dest.destination}</h3>
                
                <div className="dest-season">
                  <span>📅</span> Best time: <strong>{dest.bestTimeToVisit}</strong>
                </div>

                <div className="dest-match">
                  <strong>💡 Why it matches you:</strong><br/>
                  {dest.matchReason}
                </div>

                <p className="dest-desc">
                  {dest.description}
                </p>

                <h4 style={{ color: 'var(--text-light)', marginBottom: '8px', fontSize: '1rem' }}>Top Attractions:</h4>
                <ul className="attractions-list">
                  {dest.topAttractions?.map((attr, j) => (
                    <li key={j}>{attr}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !loading && !error && (
          <div className="empty-state">
            <span className="empty-icon">🌍</span>
            <h3 style={{ color: 'var(--text-light)', marginBottom: '8px' }}>Your next adventure awaits</h3>
            <p style={{ color: 'var(--text-muted)' }}>
              Click the button above to generate personalized recommendations.<br/>
              <em>Hint: Make sure you've selected your Travel Preferences in your Profile!</em>
            </p>
          </div>
        )
      )}
    </div>
  );
}
