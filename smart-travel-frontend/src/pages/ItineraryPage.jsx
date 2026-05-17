import { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import { generateItinerary, getItineraries, deleteItinerary, updateItineraryPlan, suggestPlaces, searchHotels } from '../api/api';
import MapComponent from '../components/MapComponent';
import WeatherWidget from '../components/WeatherWidget';
import html2pdf from 'html2pdf.js';
import './ItineraryPage.css';

import { TRAVEL_STYLES, STYLE_ICONS } from '../utils/constants';

const CURRENCIES = ['MYR', 'EUR', 'GBP', 'USD', 'JPY', 'AUD', 'CAD', 'SGD', 'THB', 'KRW'];

export default function ItineraryPage() {
  const [form, setForm] = useState({
    destination: '', duration: 3, budget: '', currency: 'MYR',
    travelStyle: 'cultural', numberOfPeople: 1,
    startDate: '', endDate: ''
  });
  const [mustVisitPlaces, setMustVisitPlaces] = useState([]);
  const [placeInput, setPlaceInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState([]);
  const [activeItinerary, setActiveItinerary] = useState(null);
  const [activeDay, setActiveDay] = useState(0);

  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [editedPlan, setEditedPlan] = useState(null);
  const [savingPlan, setSavingPlan] = useState(false);

  // Place search
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState([]);
  const [placeSearching, setPlaceSearching] = useState(false);
  const [showPlaceSearch, setShowPlaceSearch] = useState(false);

  // AI suggestions
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);

  const placeSearchTimeout = useRef(null);

  // Hotels
  const [hotels, setHotels] = useState([]);
  const [hotelsLoading, setHotelsLoading] = useState(false);
  const [hotelsError, setHotelsError] = useState('');

  // Destination autocomplete
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [showDestDropdown, setShowDestDropdown] = useState(false);
  const [destLoading, setDestLoading] = useState(false);
  const searchTimeout = useRef(null);
  const wrapperRef = useRef(null);

  // Close destination dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDestDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => { fetchSaved(); }, []);

  const fetchSaved = async () => {
    try {
      const { data } = await getItineraries();
      setSaved(data);
    } catch { /* silent */ }
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // Destination search with debounce
  const handleDestinationInput = (e) => {
    const value = e.target.value;
    setForm({ ...form, destination: value });
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (value.length < 2) { setDestSuggestions([]); setShowDestDropdown(false); return; }
    searchTimeout.current = setTimeout(async () => {
      setDestLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&addressdetails=1&limit=8&accept-language=en&namedetails=1`,
          { headers: { 'Accept-Language': 'en-US,en;q=0.9' } }
        );
        const data = await res.json();
        setDestSuggestions(data);
        setShowDestDropdown(true);
      } catch { setDestSuggestions([]); }
      finally { setDestLoading(false); }
    }, 380);
  };

  const getDestType = (item) => {
    if (item.type === 'country') return { label: 'Country', color: '#6366f1' };
    if (['city', 'town', 'municipality'].includes(item.type)) return { label: 'City', color: '#10b981' };
    if (['state', 'province'].includes(item.type)) return { label: 'State', color: '#f59e0b' };
    if (item.type === 'region') return { label: 'Region', color: '#06b6d4' };
    if (item.class === 'place') return { label: 'City', color: '#10b981' };
    return { label: 'Place', color: '#8b5cf6' };
  };

  const getDestSubtitle = (item) => {
    const a = item.address;
    if (!a) return '';
    const parts = [];
    if (a.state && a.state !== item.display_name.split(',')[0].trim()) parts.push(a.state);
    if (a.country) parts.push(a.country);
    return parts.join(', ');
  };

  const selectSuggestion = (item) => {
    const name = item.display_name.split(',')[0].trim();
    setForm({ ...form, destination: name });
    setDestSuggestions([]);
    setShowDestDropdown(false);
  };

  // Ã¢ââ¬Ã¢ââ¬ Edit Mode Handlers Ã¢ââ¬Ã¢ââ¬
  const handleToggleEdit = () => {
    if (!editMode) setEditedPlan(JSON.parse(JSON.stringify(currentPlan)));
    else setEditedPlan(null);
    setEditMode(e => !e);
    setShowPlaceSearch(false);
    setShowAiSuggestions(false);
  };

  const handleEditActivity = (dayIdx, actIdx, field, value) => {
    const plan = JSON.parse(JSON.stringify(editedPlan));
    plan.days[dayIdx].activities[actIdx][field] = value;
    setEditedPlan(plan);
  };

  const handleDeleteActivity = (dayIdx, actIdx) => {
    const plan = JSON.parse(JSON.stringify(editedPlan));
    plan.days[dayIdx].activities.splice(actIdx, 1);
    setEditedPlan(plan);
  };

  const handleAddActivity = (dayIdx, newAct) => {
    const plan = JSON.parse(JSON.stringify(editedPlan));
    plan.days[dayIdx].activities.push(newAct);
    setEditedPlan(plan);
  };

  const handleSavePlan = async () => {
    setSavingPlan(true);
    try {
      await updateItineraryPlan(activeItinerary._id, editedPlan);
      setActiveItinerary(prev => ({ ...prev }));
      // Update saved list too
      setSaved(prev => prev.map(i => i._id === activeItinerary._id
        ? { ...i, plan: editedPlan } : i));
      setActiveItinerary(prev => ({ ...prev, plan: editedPlan }));
      setEditMode(false);
      setEditedPlan(null);
    } catch { alert('Failed to save. Please try again.'); }
    finally { setSavingPlan(false); }
  };

  // Ã¢ââ¬Ã¢ââ¬ Place Search Ã¢ââ¬Ã¢ââ¬
  const handlePlaceSearch = (e) => {
    const q = e.target.value;
    setPlaceQuery(q);
    if (placeSearchTimeout.current) clearTimeout(placeSearchTimeout.current);
    if (q.length < 2) { setPlaceResults([]); return; }
    placeSearchTimeout.current = setTimeout(async () => {
      setPlaceSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + ' ' + activeItinerary.destination)}&format=json&addressdetails=1&limit=6&accept-language=en`,
          { headers: { 'Accept-Language': 'en-US,en;q=0.9' } }
        );
        const data = await res.json();
        setPlaceResults(data);
      } catch { setPlaceResults([]); }
      finally { setPlaceSearching(false); }
    }, 400);
  };

  const handleAddFromSearch = (place) => {
    const name = place.display_name.split(',')[0].trim();
    handleAddActivity(activeDay, {
      activity: name,
      description: `Visit ${name} in ${activeItinerary.destination}.`,
      time: '',
      estimatedCost: 0,
      lat: parseFloat(place.lat),
      lng: parseFloat(place.lon)
    });
    setPlaceQuery('');
    setPlaceResults([]);
  };

  const handleAiSuggest = async () => {
    setLoadingSuggest(true);
    setShowAiSuggestions(true);
    setAiSuggestions([]);
    try {
      const plan = editMode ? editedPlan : currentPlan;
      const day = plan?.days?.[activeDay];
      const { data } = await suggestPlaces(activeItinerary._id, {
        destination: activeItinerary.destination,
        dayTitle: day?.title || `Day ${activeDay + 1}`,
        existingActivities: day?.activities || []
      });
      setAiSuggestions(data.suggestions || []);
    } catch { setAiSuggestions([]); }
    finally { setLoadingSuggest(false); }
  };

  const handleAddAiSuggestion = (act) => {
    if (!editMode) {
      setEditedPlan(JSON.parse(JSON.stringify(currentPlan)));
      setEditMode(true);
    }
    handleAddActivity(activeDay, act);
  };

  // Auto-calculate duration when dates change
  const handleDateChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...form, [name]: value };
    if (updated.startDate && updated.endDate) {
      const start = new Date(updated.startDate);
      const end   = new Date(updated.endDate);
      const days  = Math.round((end - start) / (1000 * 60 * 60 * 24));
      if (days > 0) updated.duration = days;
    }
    setForm(updated);
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setActiveItinerary(null);
    try {
      const { data } = await generateItinerary({ ...form, mustVisitPlaces });
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

  // Fetch hotels whenever an itinerary becomes active
  useEffect(() => {
    if (!activeItinerary?.destination) return;
    const fetchHotels = async () => {
      setHotelsLoading(true);
      setHotelsError('');
      setHotels([]);
      try {
        const { data } = await searchHotels(activeItinerary.destination);
        setHotels(data.hotels || []);
      } catch {
        setHotelsError('Could not load hotels. Please try again.');
      } finally {
        setHotelsLoading(false);
      }
    };
    fetchHotels();
  }, [activeItinerary]);

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
      if (!mode) return <img src="/transit-default.png" alt="Transit" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />;
      
      const m = mode.toLowerCase();
      
      if (m.includes('train') || m.includes('subway') || m.includes('metro'))
        return <img src="/train.png" alt="Train" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />;
      
      if (m.includes('bus'))
        return <img src="/bus.png" alt="Bus" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />;
      
      if (m.includes('walk'))
        return <img src="/walk.png" alt="Walk" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />;
      
      if (m.includes('drive') || m.includes('car') || m.includes('taxi'))
        return <img src="/car.png" alt="Car" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />;

      if (m.includes('high speed train'))
        return <img src="/high-speed-train.png.png" alt="high speed train" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />;
      
      return <img src="/transit.png" alt="Transit" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />;
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
            <h2 style={{ fontSize: '1.2rem', marginBottom: 20 }}>Plan A New Trip</h2>
            
            {error && <div className="alert alert-error"><span>Ã¢Å¡Â Ã¯Â¸Â</span>{error}</div>}

            <form onSubmit={handleGenerate}>
                <div className="form-group dest-autocomplete-wrapper" ref={wrapperRef}>
                  <label className="form-label">Destination</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      name="destination"
                      className="form-input"
                      placeholder="e.g. Tokyo, Japan"
                      value={form.destination}
                      onChange={handleDestinationInput}
                      onFocus={() => destSuggestions.length > 0 && setShowDestDropdown(true)}
                      autoComplete="off"
                      required
                    />
                    {destLoading && (
                      <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }}>
                        <span className="spinner spinner-sm" style={{ width: 16, height: 16, borderWidth: 2 }} />
                      </span>
                    )}
                  </div>

                  {showDestDropdown && destSuggestions.length > 0 && (
                    <div className="dest-dropdown">
                      {destSuggestions.map((item, idx) => {
                        const typeInfo = getDestType(item);
                        const name = item.display_name.split(',')[0].trim();
                        const subtitle = getDestSubtitle(item);
                        return (
                          <div
                            key={idx}
                            className="dest-option"
                            onMouseDown={() => selectSuggestion(item)}
                          >
                            <div className="dest-option-main">
                              <span className="dest-option-name">{name}</span>
                              {subtitle && <span className="dest-option-sub">{subtitle}</span>}
                            </div>
                            <span className="dest-type-badge" style={{ background: `${typeInfo.color}18`, color: typeInfo.color, border: `1px solid ${typeInfo.color}40` }}>
                              {typeInfo.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
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
                    <label className="form-label">Start Date <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
                    <input
                      name="startDate" type="date"
                      className="form-input"
                      value={form.startDate}
                      onChange={handleDateChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
                    <input
                      name="endDate" type="date"
                      className="form-input"
                      min={form.startDate}
                      value={form.endDate}
                      onChange={handleDateChange}
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

                {/* ── Must-Visit Places ── */}
                <div className="form-group" style={{ marginTop: 16 }}>
                  <label className="form-label">
                     Must-Visit Places <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.8rem' }}>(optional — press Enter to add)</span>
                  </label>

                  {/* Tag Input Row */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      className="form-input"
                      placeholder="e.g. Disneyland Shanghai, Tokyo Tower..."
                      value={placeInput}
                      onChange={e => setPlaceInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const trimmed = placeInput.trim();
                          if (trimmed && !mustVisitPlaces.includes(trimmed)) {
                            setMustVisitPlaces(prev => [...prev, trimmed]);
                          }
                          setPlaceInput('');
                        }
                      }}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '0 18px', flexShrink: 0 }}
                      onClick={() => {
                        const trimmed = placeInput.trim();
                        if (trimmed && !mustVisitPlaces.includes(trimmed)) {
                          setMustVisitPlaces(prev => [...prev, trimmed]);
                        }
                        setPlaceInput('');
                      }}
                    >
                      + Add
                    </button>
                  </div>

                  {/* Tags Display */}
                  {mustVisitPlaces.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                      {mustVisitPlaces.map((place, i) => (
                        <span key={i} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          background: 'rgba(159,232,112,0.12)',
                          border: '1px solid rgba(159,232,112,0.4)',
                          color: 'var(--accent-primary)',
                          padding: '5px 12px', borderRadius: 999,
                          fontSize: '0.82rem', fontWeight: 600,
                          animation: 'fadeIn 0.2s ease'
                        }}>
                          📍 {place}
                          <button
                            type="button"
                            onClick={() => setMustVisitPlaces(prev => prev.filter((_, idx) => idx !== i))}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1,
                              padding: 0, display: 'flex', alignItems: 'center'
                            }}
                          >✕</button>
                        </span>
                      ))}
                      <button
                        type="button"
                        onClick={() => setMustVisitPlaces([])}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--text-muted)', fontSize: '0.75rem', padding: '5px 8px'
                        }}
                      >Clear all</button>
                    </div>
                  )}
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '16px', fontSize: '1.05rem', marginTop: 10 }} disabled={loading}>
                  {loading ? <><span className="spinner spinner-sm" /> Getting things ready for your adventure...</> : ' Generate Smart Itinerary'}
                </button>
            </form>
          </div>

          {/* Saved Items below the form */}
          {saved.length > 0 && (
            <div style={{ marginTop: 40 }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: 16 }}> PREVIOUS JOURNEYS</h3>
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
        <>
        <div className="split-layout-active fade-in">
          
          {/* LEFT: TIMELINE FEED */}
          <div className="timeline-panel" id="itinerary-pdf-content" style={{ background: 'var(--bg-dark)', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setActiveItinerary(null)} data-html2canvas-ignore>
              <button className="btn btn-secondary btn-sm" onClick={() => setActiveItinerary(null)} data-html2canvas-ignore>← Back to Planner</button>
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleExportPDF} data-html2canvas-ignore style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button className="btn btn-primary btn-sm" onClick={handleExportPDF} data-html2canvas-ignore style={{ display: 'flex', alignItems: 'center', gap: 6 }}>📥 Download PDF</button>
              </button>
            </div>

            <div className="itin-header-split">
              <h1 style={{ fontSize: '1.8rem', lineHeight: 1.2, marginBottom: 8 }}>{activeItinerary.destination}</h1>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span className="badge badge-primary">{activeItinerary.duration} Days</span>
                <span className="badge badge-cyan">{activeItinerary.travelStyle}</span>
                {activeItinerary.startDate && (
                  <span className="badge badge-warning">
                    Ã°Å¸ââ¦ {new Date(activeItinerary.startDate).toLocaleDateString()} Ã¢â â {activeItinerary.endDate ? new Date(activeItinerary.endDate).toLocaleDateString() : `+${activeItinerary.duration}d`}
                  </span>
                )}
                {activeItinerary.budget > 0 && (
                  <span className="badge badge-success">{activeItinerary.currency} {Number(activeItinerary.budget).toLocaleString()}</span>
                )}
              </div>
              <p style={{ marginTop: 16, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>{currentPlan.overview}</p>
            </div>

            {/* Live Weather Widget */}
            <WeatherWidget destination={activeItinerary.destination} />
            
            {/* Ã¢ââ¬Ã¢ââ¬ Edit Toolbar Ã¢ââ¬Ã¢ââ¬ */}
            <div className="edit-toolbar" data-html2canvas-ignore>
              {!editMode ? (
                <>
                  <button className="btn btn-secondary btn-sm" onClick={handleToggleEdit} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                   <button className="btn btn-secondary btn-sm" onClick={handleToggleEdit} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>✏️ Edit Itinerary</button>
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={handleAiSuggest} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {loadingSuggest ? <span className="spinner spinner-sm" style={{ width: 14, height: 14, borderWidth: 2 }} /> : ''} AI Suggest Places
                  </button>
                </>
              ) : (
                <>
                  <button className="btn btn-success btn-sm" onClick={handleSavePlan} disabled={savingPlan}>
                   <button className="btn btn-success btn-sm" onClick={handleSavePlan} disabled={savingPlan}>{savingPlan ? 'Saving...' : '💾 Save Changes'}</button>
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowPlaceSearch(s => !s)}>
                    Ã°Å¸âÂ Search Place
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={handleAiSuggest} disabled={loadingSuggest}>
                   <button className="btn btn-secondary btn-sm" onClick={handleAiSuggest} disabled={loadingSuggest}>{loadingSuggest ? '...' : '🤖 AI Suggest'}</button>
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={handleToggleEdit}>Ã¢Åâ¢ Cancel</button>
                </>
              )}
            </div>

            {/* Ã¢ââ¬Ã¢ââ¬ Place Search Panel Ã¢ââ¬Ã¢ââ¬ */}
            {showPlaceSearch && editMode && (
              <div className="place-search-panel">
                <div style={{ position: 'relative' }}>
                  <input
                    className="form-input"
                    placeholder={`Search places in ${activeItinerary.destination}...`}
                    value={placeQuery}
                    onChange={handlePlaceSearch}
                    autoFocus
                    style={{ color: '#161616', background: '#fff' }}
                  />
                  {placeSearching && <span className="spinner spinner-sm" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, borderWidth: 2 }} />}
                </div>
                {placeResults.length > 0 && (
                  <div className="place-results">
                    {placeResults.map((p, i) => (
                      <div key={i} className="place-result-item" onClick={() => handleAddFromSearch(p)}>
                        <span className="place-result-name">📍 {p.display_name.split(',')[0].trim()}</span>
                        <span className="place-result-sub">{p.display_name.split(',').slice(1, 3).join(',').trim()}</span>
                        <span className="place-add-btn">+ Add</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Ã¢ââ¬Ã¢ââ¬ AI Suggestions Panel Ã¢ââ¬Ã¢ââ¬ */}
            {showAiSuggestions && (
              <div className="ai-suggest-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <strong style={{ fontSize: '0.9rem' }}>Ã°Å¸Â¤â AI Suggested Places for Day {activeDay + 1}</strong>
                  <button onClick={() => setShowAiSuggestions(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1rem' }}>Ã¢Åâ¢</button>
                </div>
                {loadingSuggest ? (
                  <div style={{ textAlign: 'center', padding: 16 }}><span className="spinner" /></div>
                ) : aiSuggestions.map((s, i) => (
                  <div key={i} className="ai-suggest-item">
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{s.activity}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 3 }}>{s.description}</div>
                      {s.estimatedCost > 0 && <div style={{ fontSize: '0.75rem', color: 'var(--accent-success)', marginTop: 2 }}>Ã°Å¸âÂ° Est. {activeItinerary.currency} {s.estimatedCost}</div>}
                    </div>
                    <button className="btn btn-primary btn-sm" style={{ flexShrink: 0 }} onClick={() => handleAddAiSuggestion(s)}>+ Add</button>
                  </div>
                ))}
              </div>
            )}

            {/* AI Packing List Section */}
            {currentPlan.packingList && currentPlan.packingList.length > 0 && (
              <div className="packing-list-section" style={{ marginTop: 24, padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>🎒 Smart Packing List</h3>
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
                  {(editMode ? editedPlan?.days?.[activeDay]?.activities : activities).map((act, index) => (
                    <div key={index}>
                      {!editMode && act.transitDetails && (
                        <div className="transit-link fade-in">
                          <div className="transit-icon">{renderTransitIcon(act.transitDetails.mode)}</div>
                          <div className="transit-details">
                            <strong>{act.transitDetails.time || '10 mins'}</strong>
                            <span>({act.transitDetails.distance || 'N/A'}) via {act.transitDetails.mode || 'transit'}</span>
                          </div>
                        </div>
                      )}

                      <div className={`timeline-item fade-in ${editMode ? 'edit-mode' : ''}`} style={{ animationDelay: `${index * 0.1}s` }}>
                        <div className="item-number">{index + 1}</div>
                        <div className="item-content-card">
                          {editMode ? (
                            // Ã¢ââ¬Ã¢ââ¬ EDITABLE MODE Ã¢ââ¬Ã¢ââ¬
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <input
                                className="edit-field-input"
                                value={act.activity}
                                placeholder="Place name"
                                onChange={e => handleEditActivity(activeDay, index, 'activity', e.target.value)}
                              />
                              <textarea
                                className="edit-field-textarea"
                                value={act.description}
                                placeholder="Description"
                                rows={2}
                                onChange={e => handleEditActivity(activeDay, index, 'description', e.target.value)}
                              />
                              <div style={{ display: 'flex', gap: 8 }}>
                                <input
                                  className="edit-field-input"
                                  value={act.time || ''}
                                  placeholder="Time e.g. 09:00 AM"
                                  style={{ flex: 1 }}
                                  onChange={e => handleEditActivity(activeDay, index, 'time', e.target.value)}
                                />
                                <input
                                  className="edit-field-input"
                                  type="number"
                                  value={act.estimatedCost || 0}
                                  placeholder="Cost"
                                  style={{ flex: 1 }}
                                  onChange={e => handleEditActivity(activeDay, index, 'estimatedCost', parseFloat(e.target.value) || 0)}
                                />
                              </div>
                              <button
                                onClick={() => handleDeleteActivity(activeDay, index)}
                                style={{ alignSelf: 'flex-end', background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#ef4444', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: '0.78rem' }}
                              >Ã°Å¸ââÃ¯Â¸Â Remove</button>
                            </div>
                          ) : (
                            // Ã¢ââ¬Ã¢ââ¬ VIEW MODE Ã¢ââ¬Ã¢ââ¬
                            <>
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
                            </>
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

        {/* HOTEL SECTION Ã¢â¬â Below the split view */}
        <div style={{ padding: '32px 24px', borderTop: '1px solid var(--glass-border)' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
             Nearby Hotels in {activeItinerary?.destination}
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: '0.9rem' }}>
            Browse available hotels near your destination. Click "View on Google Maps" to explore and book.
          </p>

          {hotelsLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-secondary)' }}>
              <div className="spinner" style={{ width: 20, height: 20, borderWidth: 3 }} />
              <span>Searching for hotels...</span>
            </div>
          )}

          {hotelsError && (
            <div className="alert alert-error"><span></span> {hotelsError}</div>
          )}

          {!hotelsLoading && hotels.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
              {hotels.map((hotel) => (
                <div key={hotel.id} style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 12,
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 24px rgba(159,232,112,0.15)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'}
                >
                  <div style={{ height: 160, background: 'var(--bg-secondary)', overflow: 'hidden', position: 'relative' }}>
                    {hotel.photoUrl ? (
                      <img src={hotel.photoUrl} alt={hotel.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '3rem' }}>Ã°Å¸ÂÂ¨</div>
                    )}
                    {hotel.priceLevel && (
                      <span style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.65)', color: '#9FE870', padding: '3px 8px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600 }}>
                        {'$'.repeat(hotel.priceLevel)}
                      </span>
                    )}
                  </div>
                  <div style={{ padding: '14px 16px' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)', lineHeight: 1.3 }}>{hotel.name}</h3>
                    {hotel.rating && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                        <span style={{ color: '#f59e0b', fontSize: '0.85rem' }}>{hotel.rating >= 4.5 ? '⭐⭐⭐⭐⭐' : hotel.rating >= 4 ? '⭐⭐⭐⭐☆' : hotel.rating >= 3.5 ? '⭐⭐⭐☆☆' : '⭐⭐⭐☆☆'}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{hotel.rating} ({hotel.totalRatings?.toLocaleString()} reviews)</span>
                      </div>
                    )}
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.4 }}>📍 {hotel.address}</p>
                    <a
                      href={hotel.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'block', textAlign: 'center', padding: '8px 16px', background: 'var(--accent-primary)', color: '#000', borderRadius: 8, fontWeight: 600, fontSize: '0.85rem', textDecoration: 'none', transition: 'opacity 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                    >
                       View on Google Maps
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </>
      )}
    </div>
  );
}
