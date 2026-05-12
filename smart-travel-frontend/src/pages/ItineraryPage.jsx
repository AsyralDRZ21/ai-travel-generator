import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { generateItinerary, getItineraries, deleteItinerary } from '../api/api';
import MapComponent from '../components/MapComponent';
import WeatherWidget from '../components/WeatherWidget';
import html2pdf from 'html2pdf.js';
import './ItineraryPage.css';

import { TRAVEL_STYLES, STYLE_ICONS } from '../utils/constants';

const CURRENCIES = ['MYR', 'EUR', 'GBP', 'USD', 'JPY', 'AUD', 'CAD', 'SGD', 'THB', 'KRW'];

export default function ItineraryPage() {
  const [form, setForm] = useState({
    destination: '', duration: 3, budget: '', currency: 'MYR',
    travelStyle: 'cultural', numberOfPeople: 1
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState([]);
  const [activeItinerary, setActiveItinerary] = useState(null);
  const [activeDay, setActiveDay] = useState(0);

  useEffect(() => { fetchSaved(); }, []);

  const fetchSaved = async () => {
    try {
      const { data } = await getItineraries();
      setSaved(data);
    } catch { /* silent */ }
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setActiveItinerary(null);
    try {
      const { data } = await generateItinerary(form);
      setActiveItinerary(data.itinerary);
      setActiveDay(0);
      fetchSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate itinerary.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this itinerary?')) return;
    try {
      await deleteItinerary(id);
      setSaved(prev => prev.filter(i => i._id !== id));
      if (activeItinerary?._id === id) setActiveItinerary(null);
    } catch { /* silent */ }
  };

  const handleViewSaved = (itin) => {
    setActiveItinerary(itin);
    setActiveDay(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExportPDF = () => {
    const element = document.getElementById('itinerary-pdf-content');
    if (!element) return;
    
    // Temporarily adjust styles for pure print rendering
    const originalHeight = element.style.height;
    const originalOverflow = element.style.overflow;
    element.style.height = 'auto';
    element.style.overflow = 'visible';
    
    const opt = {
      margin:       10,
      filename:     `${activeItinerary.destination.replace(/[^a-z0-9]/gi, '_')}_Itinerary.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(element).save().then(() => {
      // Restore styles
      element.style.height = originalHeight;
      element.style.overflow = originalOverflow;
    });
  };

  const currentPlan = activeItinerary?.plan;

  // Process activities (backward compatible for older saves without "activities" array)
  const getActivitiesForDay = (dayData) => {
    if (!dayData) return [];
    if (dayData.activities && Array.isArray(dayData.activities)) return dayData.activities;
    
    // Legacy mapping
    const mapped = [];
    if (dayData.morning) mapped.push({ time: '09:00 AM', ...dayData.morning });
    if (dayData.afternoon) mapped.push({ time: '01:00 PM', ...dayData.afternoon });
    if (dayData.evening) mapped.push({ time: '06:00 PM', ...dayData.evening });
    return mapped;
  };

  // Extract markers for the current active day
  const currentDayData = currentPlan?.days?.[activeDay];
  const activities = getActivitiesForDay(currentDayData);
  
  const mapMarkers = activities
    .filter(a => a.lat && a.lng)
    .map(a => ({
      lat: a.lat,
      lng: a.lng,
      title: a.activity,
      description: a.description
    }));

  const renderTransitIcon = (mode) => {
    if (!mode) return '🧭';
    const m = mode.toLowerCase();
    if (m.includes('train') || m.includes('subway') || m.includes('metro')) return '🚇';
    if (m.includes('bus')) return '🚌';
    if (m.includes('walk')) return '🚶';
    if (m.includes('drive') || m.includes('car') || m.includes('taxi')) return '🚗';
    return '🧭';
  };

  return (
    <div className="itinerary-dashboard-container">
      <Navbar />

      {/* NO ACTIVE ITINERARY = SHOW FORM VIEW */}
      {!activeItinerary && (
        <div className="form-layout-centered fade-in">
          <div className="page-header" style={{ textAlign: 'center', marginBottom: 40 }}>
            <h1 className="page-title"> Smart Itinerary Generator</h1>
            <p className="page-subtitle">Describe your trip and let our Core Algorithm plan every detail</p>
          </div>

          <div className="glass-card" style={{ padding: 30 }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: 20 }}>✈️ Plan A New Trip</h2>
            
            {error && <div className="alert alert-error"><span>⚠️</span>{error}</div>}

            <form onSubmit={handleGenerate}>
                <div className="form-group">
                  <label className="form-label">Destination</label>
                  <input
                    name="destination"
                    className="form-input"
                    placeholder="e.g. Tokyo, Japan"
                    value={form.destination}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Duration (days)</label>
                    <input
                      name="duration" type="number" min="1" max="14"
                      className="form-input" value={form.duration} onChange={handleChange} required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Travelers</label>
                    <input
                      name="numberOfPeople" type="number" min="1" max="20"
                      className="form-input" value={form.numberOfPeople} onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Budget (optional)</label>
                    <input
                      name="budget" type="number" min="0"
                      className="form-input" placeholder="e.g. 3000" value={form.budget} onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Currency</label>
                    <select name="currency" className="form-select" value={form.currency} onChange={handleChange}>
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: 10 }}>
                  <label className="form-label">Travel Style</label>
                  <div className="style-grid">
                    {TRAVEL_STYLES.map(style => (
                      <button
                        key={style} type="button"
                        className={`style-option ${form.travelStyle === style ? 'active' : ''}`}
                        onClick={() => setForm({ ...form, travelStyle: style })}
                      >
                        <span>{STYLE_ICONS[style]}</span>
                        <span>{style}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '16px', fontSize: '1.05rem', marginTop: 10 }} disabled={loading}>
                  {loading ? <><span className="spinner spinner-sm" /> Computing Plan via Global Sattelites...</> : ' Generate Smart Itinerary'}
                </button>
            </form>
          </div>

          {/* Saved Items below the form */}
          {saved.length > 0 && (
            <div style={{ marginTop: 40 }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: 16 }}>📂 PREVIOUS JOURNEYS</h3>
              <div className="grid-2">
                {saved.map(itin => (
                  <div key={itin._id} className="saved-itin-item">
                    <div className="saved-itin-info" onClick={() => handleViewSaved(itin)}>
                      <div className="saved-itin-dest">📍 {itin.destination}</div>
                      <div className="saved-itin-meta">{itin.duration}d · {itin.travelStyle} · {new Date(itin.createdAt).toLocaleDateString()}</div>
                    </div>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(itin._id)} title="Delete">🗑️</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* YES ACTIVE ITINERARY = SHOW SPLIT LAYOUT */}
      {activeItinerary && currentPlan && (
        <div className="split-layout-active fade-in">
          
          {/* LEFT: TIMELINE FEED */}
          <div className="timeline-panel" id="itinerary-pdf-content" style={{ background: 'var(--bg-dark)', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setActiveItinerary(null)} data-html2canvas-ignore>
                ← Back to Planner
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleExportPDF} data-html2canvas-ignore style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                📄 Download PDF
              </button>
            </div>

            <div className="itin-header-split">
              <h1 style={{ fontSize: '1.8rem', lineHeight: 1.2, marginBottom: 8 }}>{activeItinerary.destination}</h1>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span className="badge badge-primary">{activeItinerary.duration} Days</span>
                <span className="badge badge-cyan">{activeItinerary.travelStyle}</span>
                {activeItinerary.budget > 0 && (
                  <span className="badge badge-success">{activeItinerary.currency} {Number(activeItinerary.budget).toLocaleString()}</span>
                )}
              </div>
              <p style={{ marginTop: 16, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>{currentPlan.overview}</p>
            </div>

            {/* Live Weather Widget */}
            <WeatherWidget destination={activeItinerary.destination} />
            
            {/* AI Packing List Section */}
            {currentPlan.packingList && currentPlan.packingList.length > 0 && (
              <div className="packing-list-section" style={{ marginTop: 24, padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  🎒 Smart Packing List
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                  {currentPlan.packingList.map((item, idx) => (
                    <div key={idx} style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: '8px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>✅ {item.item}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{item.reason}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="day-tabs" style={{ marginTop: 24 }}>
              {currentPlan.days?.map((day, i) => (
                <button 
                  key={i} 
                  className={`day-tab ${activeDay === i ? 'active' : ''}`}
                  onClick={() => setActiveDay(i)}
                >
                  Day {day.day}
                </button>
              ))}
            </div>

            {currentDayData && (
              <div className="day-feed" style={{ marginTop: 24 }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: 16 }}>{currentDayData.title}</h3>

                <div className="timeline-list">
                  {activities.map((act, index) => (
                    <div key={index}>
                      {/* Transit details block injected BEFORE the activity if it exists */}
                      {act.transitDetails && (
                        <div className="transit-link fade-in">
                          <div className="transit-icon">{renderTransitIcon(act.transitDetails.mode)}</div>
                          <div className="transit-details">
                            <strong>{act.transitDetails.time || '10 mins'}</strong> 
                            <span>({act.transitDetails.distance || 'N/A'}) via {act.transitDetails.mode || 'transit'}</span>
                          </div>
                        </div>
                      )}

                      <div className="timeline-item fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                        <div className="item-number">{index + 1}</div>
                        <div className="item-content-card">
                          <div className="item-header">
                            <div className="item-title">{act.activity}</div>
                            {act.time && <div className="item-time">{act.time}</div>}
                          </div>
                          <div className="item-desc">{act.description}</div>
                          {act.estimatedCost > 0 && (
                            <div style={{ marginTop: 8, fontSize: '0.85rem', color: 'var(--accent-success)', fontWeight: 600 }}>
                              💰 Est. Cost: {activeItinerary.currency} {act.estimatedCost}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Accommodations & Meals block for the day */}
                <div style={{ marginTop: 30, paddingTop: 20, borderTop: '1px solid var(--glass-border)' }}>
                  {currentDayData.accommodation && (
                    <div style={{ marginBottom: 16, background: 'rgba(99,102,241,0.05)', padding: 14, borderRadius: 8 }}>
                      <strong style={{ display: 'block', color: 'var(--accent-primary)', marginBottom: 4, fontSize: '0.85rem', textTransform: 'uppercase' }}>🏨 Night Stay</strong>
                      <span>{currentDayData.accommodation}</span>
                    </div>
                  )}
                  {currentDayData.meals?.length > 0 && (
                    <div style={{ background: 'rgba(16,185,129,0.05)', padding: 14, borderRadius: 8 }}>
                      <strong style={{ display: 'block', color: 'var(--accent-success)', marginBottom: 8, fontSize: '0.85rem', textTransform: 'uppercase' }}>🍽️ Dining Suggestions</strong>
                      <ul style={{ paddingLeft: 20, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        {currentDayData.meals.map((meal, i) => <li key={i} style={{ marginBottom: 4 }}>{meal}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: MAP FULL HEIGHT */}
          <div className="map-panel">
            <MapComponent markers={mapMarkers} />
          </div>
          
        </div>
      )}
    </div>
  );
}
