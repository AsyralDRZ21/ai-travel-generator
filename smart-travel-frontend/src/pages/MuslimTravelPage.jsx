import { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import {
  getPrayerTimes, getMosques, getHalalFood,
  getHistoricalWeather, getVisaInfo, getMuslimAccomm
} from '../api/api';
import './MuslimTravelPage.css';

const TABS = [
  { id: 'prayer',    label: 'Prayer Times',     icon: '' },
  { id: 'mosque',    label: 'Mosques',           icon: '' },
  { id: 'halal',     label: 'Halal Food',        icon: '' },
  { id: 'weather',   label: 'Expected Weather',  icon: '' },
  { id: 'visa',      label: 'Visa Info',          icon: '' },
  { id: 'hotel',     label: 'Accommodation',     icon: '' },
];

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const PRICE_COLORS = { budget: '#22c55e', 'mid-range': '#f59e0b', premium: '#8b5cf6', luxury: '#ec4899', unknown: '#94a3b8' };

export default function MuslimTravelPage() {
  const [activeTab, setActiveTab] = useState('prayer');

  // Shared destination inputs
  const [city, setCity]       = useState('');
  const [country, setCountry] = useState('');
  const [lat, setLat]         = useState('');
  const [lng, setLng]         = useState('');

  // Prayer Times
  const [prayerData, setPrayerData] = useState(null);
  const [prayerDate, setPrayerDate] = useState(new Date().toISOString().split('T')[0]);

  // Mosque
  const [mosques, setMosques]   = useState([]);

  // Halal Food
  const [halalPlaces, setHalalPlaces] = useState([]);
  const [halalFilter, setHalalFilter] = useState('all');

  // Weather
  const [weatherData, setWeatherData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  // Visa
  const [visaInfo, setVisaInfo]         = useState(null);
  const [visaDest, setVisaDest]         = useState('');
  const [visaPassport, setVisaPassport] = useState('Malaysia');

  // Accommodation
  const [hotels, setHotels]         = useState([]);
  const [hotelFilter, setHotelFilter] = useState('all');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const withLoad = async (fn) => {
    setLoading(true); setError('');
    try { await fn(); } catch (e) { setError(e.response?.data?.message || e.message); }
    finally { setLoading(false); }
  };

  // ── Geocode helper (OpenStreetMap Nominatim — free) ──
  const geocode = async (cityName, countryName) => {
    try {
      const q = [cityName, countryName].filter(Boolean).join(', ');
      let res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`, {
        headers: { 'Accept-Language': 'en' }
      });
      let data = await res.json();
      if (!data || !data.length) {
        res = await fetch(`https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(cityName)}&country=${encodeURIComponent(countryName)}&format=json&limit=1`, {
          headers: { 'Accept-Language': 'en' }
        });
        data = await res.json();
      }
      if (data && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
    } catch (err) {
      console.warn('Geocoding error:', err.message);
    }
    return { lat: null, lng: null };
  };

  // ── Fetch Prayer Times ──
  const fetchPrayer = () => withLoad(async () => {
    if (!city || !country) throw new Error('Please enter city and country');
    const { data } = await getPrayerTimes(city, country, prayerDate);
    setPrayerData(data);
  });

  // ── Fetch Mosques ──
  const fetchMosques = () => withLoad(async () => {
    if (!city && !country && !lat && !lng) throw new Error('Please enter city and country');
    let gLat = lat, gLng = lng;
    if (!gLat || !gLng) {
      const coords = await geocode(city, country);
      if (coords.lat && coords.lng) {
        gLat = coords.lat; gLng = coords.lng;
        setLat(gLat); setLng(gLng);
      }
    }
    const { data } = await getMosques(gLat, gLng, 5000, city, country);
    setMosques(data.mosques || []);
  });

  // ── Fetch Halal Food ──
  const fetchHalal = () => withLoad(async () => {
    if (!city && !country && !lat && !lng) throw new Error('Please enter city and country');
    let gLat = lat, gLng = lng;
    if (!gLat || !gLng) {
      const coords = await geocode(city, country);
      if (coords.lat && coords.lng) {
        gLat = coords.lat; gLng = coords.lng;
        setLat(gLat); setLng(gLng);
      }
    }
    const { data } = await getHalalFood(gLat, gLng, 5000, city, country);
    setHalalPlaces(data.places || []);
  });

  // ── Fetch Historical Weather ──
  const fetchWeather = () => withLoad(async () => {
    if (!city && !country && !lat && !lng) throw new Error('Please enter city and country');
    let gLat = lat, gLng = lng;
    if (!gLat || !gLng) {
      const coords = await geocode(city, country);
      if (coords.lat && coords.lng) {
        gLat = coords.lat; gLng = coords.lng;
        setLat(gLat); setLng(gLng);
      } else {
        throw new Error('Location not found. Please check city/country spelling.');
      }
    }
    const { data } = await getHistoricalWeather(gLat, gLng, selectedMonth);
    setWeatherData(data);
  });

  // ── Fetch Visa ──
  const fetchVisa = (customDest, customPassport) => withLoad(async () => {
    const dest = (typeof customDest === 'string' ? customDest : visaDest) || country;
    const pass = (typeof customPassport === 'string' ? customPassport : visaPassport) || 'Malaysia';
    if (!dest) throw new Error('Please enter destination country');
    const { data } = await getVisaInfo(dest, pass);
    setVisaInfo(data);
  });

  // ── Fetch Hotels ──
  const fetchHotels = () => withLoad(async () => {
    if (!city && !country && !lat && !lng) throw new Error('Please enter city and country');
    let gLat = lat, gLng = lng;
    if (!gLat || !gLng) {
      const coords = await geocode(city, country);
      if (coords.lat && coords.lng) {
        gLat = coords.lat; gLng = coords.lng;
        setLat(gLat); setLng(gLng);
      }
    }
    const { data } = await getMuslimAccomm(gLat, gLng, 5000, city, country);
    setHotels(data.hotels || []);
  });

  const filteredHalal  = halalFilter === 'all' ? halalPlaces : halalPlaces.filter(p => p.priceLevel === parseInt(halalFilter));
  const filteredHotels = hotelFilter === 'all' ? hotels : hotels.filter(h => h.priceTier === hotelFilter);

  const prayerIcons = { Fajr: '🌙', Sunrise: '🌅', Dhuhr: '☀️', Asr: '🌤️', Maghrib: '🌇', Isha: '🌙', Imsak: '⭐' };

  return (
    <div className="mtp-page">
      <Navbar />
      <div className="mtp-container">

        {/* ── HEADER ── */}
        <div className="mtp-header">
          <div className="mtp-header-badge"> Muslim Traveller Module</div>
          <h1 className="mtp-title">Muslim-Friendly Travel Guide</h1>
          <p className="mtp-subtitle">Prayer times, halal food, mosques, visa info & more — all in one place for the Muslim traveller.</p>
        </div>

        {/* ── SHARED DESTINATION INPUT ── */}
        <div className="mtp-dest-card">
          <div className="mtp-dest-row">
            <div className="mtp-input-group">
              <label> City</label>
              <input className="mtp-input" placeholder="e.g. Tokyo" value={city} onChange={e => setCity(e.target.value)} />
            </div>
            <div className="mtp-input-group">
              <label> Country</label>
              <input className="mtp-input" placeholder="e.g. Japan" value={country} onChange={e => setCountry(e.target.value)} />
            </div>
          </div>
          <p className="mtp-dest-note">ℹ️ Enter your destination once — it will be used for all sections below.</p>
        </div>

        {/* ── TAB NAV ── */}
        <div className="mtp-tabs">
          {TABS.map(t => (
            <button key={t.id} className={`mtp-tab ${activeTab === t.id ? 'mtp-tab-active' : ''}`} onClick={() => { setActiveTab(t.id); setError(''); }}>
              <span className="mtp-tab-icon">{t.icon}</span>
              <span className="mtp-tab-label">{t.label}</span>
            </button>
          ))}
        </div>

        {error && <div className="mtp-error">⚠️ {error}</div>}

        {/* ════════════════════════════════════════════════════════════
            TAB: PRAYER TIMES
        ════════════════════════════════════════════════════════════ */}
        {activeTab === 'prayer' && (
          <div className="mtp-section">
            <div className="mtp-section-header">
              <h2> Daily Prayer Times</h2>
              <p>Get accurate Solat times for your destination on any travel date.</p>
            </div>
            <div className="mtp-controls">
              <div className="mtp-input-group">
                <label> Travel Date</label>
                <input type="date" className="mtp-input" value={prayerDate} onChange={e => setPrayerDate(e.target.value)} />
              </div>
              <button className="mtp-btn" onClick={fetchPrayer} disabled={loading}>
                {loading ? '⏳ Fetching...' : ' Get Prayer Times'}
              </button>
            </div>

            {prayerData && (
              <div className="mtp-prayer-result">
                <div className="mtp-prayer-meta">
                  <span>- {prayerData.city}, {prayerData.country}</span>
                  <span>- {prayerData.date}</span>
                  <span className="mtp-hijri">- {prayerData.hijriDate}</span>
                </div>
                <div className="mtp-prayer-grid">
                  {Object.entries(prayerData.prayers).map(([name, time]) => (
                    <div key={name} className={`mtp-prayer-card ${name === 'Imsak' ? 'mtp-prayer-imsak' : ''}`}>
                      <div className="mtp-prayer-icon">{prayerIcons[name] || '🕐'}</div>
                      <div className="mtp-prayer-name">{name}</div>
                      <div className="mtp-prayer-time">{time}</div>
                    </div>
                  ))}
                </div>
                <div className="mtp-qibla-note">
                   <strong>Qibla Direction:</strong> Use your phone's compass app and face the direction of Makkah from {prayerData.city}.
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            TAB: MOSQUES
        ════════════════════════════════════════════════════════════ */}
        {activeTab === 'mosque' && (
          <div className="mtp-section">
            <div className="mtp-section-header">
              <h2> Nearby Mosques & Surau</h2>
              <p>Find mosques, surau, and prayer rooms within 3km of your destination.</p>
            </div>
            <button className="mtp-btn" onClick={fetchMosques} disabled={loading}>
              {loading ? '⏳ Searching...' : ' Find Mosques Near Me'}
            </button>

            {mosques.length > 0 && (
              <div className="mtp-list">
                <p className="mtp-count">✅ Found {mosques.length} prayer facilities</p>
                {mosques.map(m => (
                  <div key={m.id} className="mtp-mosque-card">
                    <div className="mtp-mosque-icon">🕌</div>
                    <div className="mtp-mosque-info">
                      <h3>{m.name}</h3>
                      <p className="mtp-mosque-addr">📍 {m.address}</p>
                      {m.openingHours && <p className="mtp-mosque-hours">Time: {m.openingHours}</p>}
                      <div className="mtp-mosque-tags">
                        <span className="mtp-tag mtp-tag-green"> Muslim Place of Worship</span>
                        {m.womenSection && <span className="mtp-tag mtp-tag-purple"> Women's Section</span>}
                      </div>
                    </div>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${m.lat},${m.lng}`}
                      target="_blank" rel="noreferrer"
                      className="mtp-map-btn"
                    >Google Map</a>
                  </div>
                ))}
              </div>
            )}
            {mosques.length === 0 && !loading && <p className="mtp-empty">Click the button above to search for mosques near your destination.</p>}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
          
        ════════════════════════════════════════════════════════════ */}
        {activeTab === 'halal' && (
          <div className="mtp-section">
            <div className="mtp-section-header">
              <h2> Halal Food & Restaurants</h2>
              <p>Halal-certified restaurants, eateries and food courts near your destination.</p>
            </div>
            <div className="mtp-controls">
              <button className="mtp-btn" onClick={fetchHalal} disabled={loading}>
                {loading ? ' Searching...' : ' Find Halal Food'}
              </button>
              {halalPlaces.length > 0 && (
                <select className="mtp-select" value={halalFilter} onChange={e => setHalalFilter(e.target.value)}>
                  <option value="all">All Price Ranges</option>
                  <option value="1"> Budget (MYR 0–15)</option>
                  <option value="2"> Moderate (MYR 15–50)</option>
                  <option value="3"> Expensive (MYR 50+)</option>
                </select>
              )}
            </div>

            {filteredHalal.length > 0 && (
              <div className="mtp-food-grid">
                {filteredHalal.map(p => (
                  <div key={p.id} className="mtp-food-card">
                    {p.photo
                      ? <img src={p.photo} alt={p.name} className="mtp-food-img" />
                      : <div className="mtp-food-img-placeholder"></div>
                    }
                    <div className="mtp-food-body">
                      <div className="mtp-food-top">
                        <h3>{p.name}</h3>
                        <span className="mtp-halal-badge"> HALAL</span>
                      </div>
                      <p className="mtp-food-addr">📍 {p.address}</p>
                      <div className="mtp-food-meta">
                        {p.rating && <span>⭐ {p.rating} ({p.totalRatings?.toLocaleString()})</span>}
                        {p.priceLevelText && <span>Price: {p.priceLevelText}</span>}
                        <span className={`mtp-open-badge ${p.isOpen ? 'open' : 'closed'}`}>
                          {p.isOpen === true ? '🟢 Open' : p.isOpen === false ? '🔴 Closed' : '⏰ Hours unknown'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {halalPlaces.length === 0 && !loading && <p className="mtp-empty">Click the button above to search for halal restaurants near your destination.</p>}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            TAB: EXPECTED WEATHER
        ════════════════════════════════════════════════════════════ */}
        {activeTab === 'weather' && (
          <div className="mtp-section">
            <div className="mtp-section-header">
              <h2> Expected Weather</h2>
              <p>Historical climate data for your travel month — so you know what to pack and expect.</p>
            </div>
            <div className="mtp-controls">
              <div className="mtp-input-group">
                <label> Travel Month</label>
                <select className="mtp-select" value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))}>
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <button className="mtp-btn" onClick={fetchWeather} disabled={loading}>
                {loading ? ' Loading...' : ' Get Climate Info'}
              </button>
            </div>

            {weatherData && (
              <div className="mtp-weather-result">
                <h3 className="mtp-weather-title">Expected Climate in {weatherData.month} for {city}</h3>
                <div className="mtp-weather-grid">
                  <div className="mtp-weather-stat hot"><span className="mtp-ws-val">{weatherData.avgMaxTemp}°C</span><span className="mtp-ws-label">Avg High</span></div>
                  <div className="mtp-weather-stat cool"><span className="mtp-ws-val">{weatherData.avgMinTemp}°C</span><span className="mtp-ws-label">Avg Low</span></div>
                  <div className="mtp-weather-stat rain"><span className="mtp-ws-val">{weatherData.rainyDays}</span><span className="mtp-ws-label">Rainy Days</span></div>
                  <div className="mtp-weather-stat wind"><span className="mtp-ws-val">{weatherData.avgWindSpeed}</span><span className="mtp-ws-label">km/h Wind</span></div>
                </div>
                <div className="mtp-weather-condition">
                  <span className="mtp-condition-badge">{weatherData.condition}</span>
                  <span>{weatherData.totalRainfall}mm total rainfall</span>
                </div>
                {weatherData.muslimNote && (
                  <div className="mtp-muslim-advisory">
                    <strong> Muslim Traveller Advisory</strong>
                    <p>{weatherData.muslimNote}</p>
                  </div>
                )}
                <div className="mtp-packing-tips">
                  <strong> Recommended Packing</strong>
                  <ul>{weatherData.packingTips.map(t => <li key={t}>✓ {t}</li>)}</ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            TAB: VISA INFO
        ════════════════════════════════════════════════════════════ */}
        {/* ════════════════════════════════════════════════════════════
            TAB: VISA INFO
        ════════════════════════════════════════════════════════════ */}
        {activeTab === 'visa' && (
          <div className="mtp-section">
            <div className="mtp-section-header">
              <h2>🛂 International Passport & Visa Requirements</h2>
              <p>Check official visa rules, electronic authorizations (K-ETA, ETA, SGAC, ESTA), and entry requirements for any passport nationality.</p>
            </div>
            
            <div className="mtp-controls" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', alignItems: 'end' }}>
              <div className="mtp-input-group">
                <label>🛂 Your Passport / Nationality</label>
                <input
                  className="mtp-input"
                  placeholder="e.g. Malaysia, Indonesia, Singapore, United Kingdom"
                  value={visaPassport}
                  onChange={e => setVisaPassport(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') fetchVisa(); }}
                />
              </div>

              <div className="mtp-input-group">
                <label>🔍 Destination Country or City</label>
                <input
                  className="mtp-input"
                  placeholder="e.g. South Korea, Japan, United Kingdom, Australia"
                  value={visaDest || country}
                  onChange={e => setVisaDest(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') fetchVisa(); }}
                />
              </div>

              <div>
                <button 
                  className="mtp-btn" 
                  onClick={() => fetchVisa()} 
                  disabled={loading}
                  style={{ width: '100%', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {loading ? '⏳ Checking...' : '🔍 Check Visa Requirements'}
                </button>
              </div>
            </div>

            {/* Quick Passport Pills */}
            <div className="mtp-quick-countries" style={{ marginTop: '12px', marginBottom: '8px' }}>
              <span className="mtp-quick-label">🛂 Select Passport:</span>
              {[
                { label: '🇲🇾 Malaysia', val: 'Malaysia' },
                { label: '🇮🇩 Indonesia', val: 'Indonesia' },
                { label: '🇸🇬 Singapore', val: 'Singapore' },
                { label: '🇧🇳 Brunei', val: 'Brunei' },
                { label: '🇬🇧 United Kingdom', val: 'United Kingdom' },
                { label: '🇦🇺 Australia', val: 'Australia' },
                { label: '🇺🇸 United States', val: 'United States' }
              ].map(item => (
                <button
                  key={item.val}
                  type="button"
                  className={`mtp-quick-pill ${visaPassport.toLowerCase() === item.val.toLowerCase() ? 'active' : ''}`}
                  style={visaPassport.toLowerCase() === item.val.toLowerCase() ? { background: '#9FE870', color: '#163300', fontWeight: 'bold' } : {}}
                  onClick={() => {
                    setVisaPassport(item.val);
                    if (visaDest || country) {
                      fetchVisa(visaDest || country, item.val);
                    }
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Quick Country Pills */}
            <div className="mtp-quick-countries">
              <span className="mtp-quick-label">⚡ Popular Destinations:</span>
              {[
                { label: '🇰🇷 South Korea (K-ETA)', val: 'South Korea' },
                { label: '🇯🇵 Japan', val: 'Japan' },
                { label: '🇬🇧 United Kingdom', val: 'United Kingdom' },
                { label: '🇦🇺 Australia (ETA)', val: 'Australia' },
                { label: '🇸🇦 Saudi Arabia (Umrah)', val: 'Saudi Arabia' },
                { label: '🇹🇭 Thailand (60d)', val: 'Thailand' },
                { label: '🇨🇳 China', val: 'China' },
                { label: '🇸🇬 Singapore (SGAC)', val: 'Singapore' },
                { label: '🇮🇩 Indonesia (e-CD)', val: 'Indonesia' },
                { label: '🇪🇺 Europe / Schengen', val: 'Schengen' },
                { label: '🇹🇷 Turkey', val: 'Turkey' }
              ].map(item => (
                <button
                  key={item.val}
                  type="button"
                  className="mtp-quick-pill"
                  onClick={() => {
                    setVisaDest(item.val);
                    fetchVisa(item.val, visaPassport);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {visaInfo && (
              <div className="mtp-visa-card">
                <div className="mtp-visa-header">
                  <h3>
                    {visaInfo.passportFlag || '🛂'} {visaInfo.passport || visaPassport} → {visaInfo.flag || '✈️'} {visaInfo.destination?.toUpperCase()}
                  </h3>
                  <span className={`mtp-visa-badge ${
                    visaInfo.badgeType === 'k-eta' ? 'visa-keta' :
                    visaInfo.badgeType === 'eta' ? 'visa-eta' :
                    visaInfo.badgeType === 'evisa' ? 'visa-evisa' :
                    visaInfo.badgeType === 'visa-arrival' ? 'visa-arrival' :
                    visaInfo.required?.toLowerCase().includes('free') ? 'visa-free' :
                    visaInfo.required?.toLowerCase().includes('arrival') ? 'visa-arrival' : 'visa-required'
                  }`}>
                    {visaInfo.badgeType === 'k-eta' ? '⚡ Mandatory K-ETA Required' :
                     visaInfo.badgeType === 'eta' ? '⚡ Electronic Travel Authority (ETA)' :
                     visaInfo.badgeType === 'evisa' ? '💻 eVisa Required' :
                     visaInfo.required === 'Visa Free' ? '✓ Visa Free Entry' :
                     visaInfo.required === 'Visa on Arrival' ? '🟡 Visa on Arrival' :
                     visaInfo.required}
                  </span>
                </div>

                {/* Important Alert Notice (e.g. K-ETA pre-departure mandate) */}
                {visaInfo.importantNotice && (
                  <div className="mtp-visa-alert-box">
                    <div className="mtp-visa-alert-title">
                      <span className="mtp-alert-icon">🚨</span>
                      <span>MANDATORY PRE-DEPARTURE ENTRY REQUIREMENT</span>
                    </div>
                    <p className="mtp-visa-alert-text">{visaInfo.importantNotice}</p>
                    {visaInfo.officialPortal && (
                      <div className="mtp-portal-action">
                        <a
                          href={visaInfo.officialPortal.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mtp-official-portal-btn"
                        >
                          🌐 Apply Online on {visaInfo.officialPortal.name} ↗
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Exemption Note */}
                {visaInfo.exemptionNotes && (
                  <div className="mtp-visa-exemption-pill">
                    <span className="exemption-badge">💡 Note on Exemptions:</span>
                    <span>{visaInfo.exemptionNotes}</span>
                  </div>
                )}

                <div className="mtp-visa-details">
                  {visaInfo.duration && (
                    <div className="mtp-visa-row">
                      <span>⏱️ Permitted Duration</span>
                      <strong>{visaInfo.duration}</strong>
                    </div>
                  )}
                  {visaInfo.cost !== undefined && (
                    <div className="mtp-visa-row">
                      <span>💵 Visa / Authorization Fee</span>
                      <strong>{visaInfo.cost === 0 ? 'FREE' : String(visaInfo.cost)}</strong>
                    </div>
                  )}
                  {visaInfo.processingDays !== undefined && (
                    <div className="mtp-visa-row">
                      <span>⚡ Processing Time</span>
                      <strong>{visaInfo.processingDays === 0 ? 'On Arrival / Instant' : String(visaInfo.processingDays)}</strong>
                    </div>
                  )}
                </div>

                {visaInfo.documents && visaInfo.documents.length > 0 && (
                  <div className="mtp-visa-docs">
                    <strong>📋 Checklist of Required Travel Documents:</strong>
                    <ul>{visaInfo.documents.map(d => <li key={d}>✓ {d}</li>)}</ul>
                  </div>
                )}

                {visaInfo.muslimNote && (
                  <div className="mtp-muslim-advisory">
                    <strong>🕌 Muslim Traveller Advisory:</strong>
                    <p>{visaInfo.muslimNote}</p>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '16px' }}>
                  {visaInfo.officialPortal && (
                    <a href={visaInfo.officialPortal.url} target="_blank" rel="noreferrer" className="mtp-portal-action-link">
                      🌐 Official Visa / Authorization Portal ↗
                    </a>
                  )}
                  <a href={visaInfo.embassyUrl || 'https://www.kln.gov.my'} target="_blank" rel="noreferrer" className="mtp-embassy-link">
                    🏛️ Malaysian Ministry of Foreign Affairs (KLN) ↗
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            TAB: ACCOMMODATION
        ════════════════════════════════════════════════════════════ */}
        {activeTab === 'hotel' && (
          <div className="mtp-section">
            <div className="mtp-section-header">
              <h2> Muslim-Friendly Accommodation</h2>
              <p>Hotels and guesthouses near your destination with price ranges and Muslim-friendly features.</p>
            </div>
            <div className="mtp-controls">
              <button className="mtp-btn" onClick={fetchHotels} disabled={loading}>
                {loading ? ' Searching...' : ' Find Accommodation'}
              </button>
              {hotels.length > 0 && (
                <select className="mtp-select" value={hotelFilter} onChange={e => setHotelFilter(e.target.value)}>
                  <option value="all">All Price Tiers</option>
                  <option value="budget"> Budget (MYR 50–200)</option>
                  <option value="mid-range"> Mid-Range (MYR 200–500)</option>
                  <option value="premium"> Premium (MYR 500–1000)</option>
                  <option value="luxury"> Luxury (MYR 1000+)</option>
                </select>
              )}
            </div>

            {filteredHotels.length > 0 && (
              <div className="mtp-hotel-grid">
                {filteredHotels.map(h => (
                  <div key={h.id} className="mtp-hotel-card">
                    {h.photo
                      ? <img src={h.photo} alt={h.name} className="mtp-hotel-img" />
                      : <div className="mtp-hotel-img-placeholder"></div>
                    }
                    <div className="mtp-hotel-body">
                      <div className="mtp-hotel-top">
                        <h3>{h.name}</h3>
                        <span className="mtp-price-badge" style={{ background: PRICE_COLORS[h.priceTier] }}>
                          {h.priceRange}
                        </span>
                      </div>
                      <p className="mtp-hotel-addr">📍 {h.address}</p>
                      <div className="mtp-hotel-meta">
                        {h.rating && <span>⭐ {h.rating}</span>}
                        <span className={`mtp-open-badge ${h.isOpen ? 'open' : ''}`}>
                          {h.isOpen ? '🟢 Available' : '📞 Call to check'}
                        </span>
                      </div>
                      <div className="mtp-hotel-features">
                        {h.muslimFeatures.map(f => <span key={f} className="mtp-feature-tag">{f}</span>)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {hotels.length === 0 && !loading && <p className="mtp-empty">Click the button above to search for accommodation near your destination.</p>}
          </div>
        )}

      </div>
    </div>
  );
}
