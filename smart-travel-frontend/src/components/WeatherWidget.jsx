import { useState, useEffect } from 'react';

const WEATHER_ICONS = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
  45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌧️',
  61: '🌧️', 63: '🌧️', 65: '🌧️',
  71: '❄️', 73: '❄️', 75: '❄️',
  80: '🌦️', 81: '🌧️', 82: '⛈️',
  95: '⛈️', 96: '⛈️', 99: '⛈️',
};

const WEATHER_DESC = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Foggy', 48: 'Foggy',
  51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
  71: 'Light snow', 73: 'Snow', 75: 'Heavy snow',
  80: 'Showers', 81: 'Rain showers', 82: 'Heavy showers',
  95: 'Thunderstorm', 96: 'Thunderstorm', 99: 'Thunderstorm',
};

export default function WeatherWidget({ destination }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!destination) return;
    // Extract first city name — handles "Tokyo, Japan" or "Paris and Lyon"
    const firstCity = destination
      .split(/\s+and\s+|\s*,\s*|\s*&\s*|\s*\+\s*/i)[0]
      .trim();
    fetchWeather(firstCity || destination);
  }, [destination]);

  const fetchWeather = async (city) => {
    setLoading(true);
    setError('');
    setWeather(null);
    try {
      // Step 1: Geocode city name using Nominatim (FREE, no key)
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const geoData = await geoRes.json();
      if (!geoData.length) throw new Error(`City not found: ${city}`);

      const lat = parseFloat(geoData[0].lat);
      const lon = parseFloat(geoData[0].lon);
      const displayName = geoData[0].display_name?.split(',')[0] || city;

      // Step 2: Get current weather from Open-Meteo (FREE, no key)
      const wxRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,apparent_temperature` +
        `&timezone=auto`
      );
      const wxData = await wxRes.json();
      const cur = wxData.current;

      setWeather({
        city: displayName,
        temp: Math.round(cur.temperature_2m),
        feels: Math.round(cur.apparent_temperature),
        humidity: cur.relative_humidity_2m,
        wind: cur.wind_speed_10m,
        code: cur.weather_code,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!destination) return null;

  if (loading) {
    return (
      <div style={cardStyle}>
        <span style={{ fontSize: '1.5rem' }}>🌤️</span>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Fetching live weather for {destination}...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={cardStyle}>
        <span style={{ fontSize: '1.5rem' }}>⚠️</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
            Weather — {destination}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#ef4444' }}>{error}</div>
        </div>
      </div>
    );
  }

  if (!weather) return null;

  const icon = WEATHER_ICONS[weather.code] || '🌡️';
  const desc = WEATHER_DESC[weather.code] || 'Current weather';

  return (
    <div style={cardStyle}>
      <div style={{ fontSize: '2.4rem', lineHeight: 1 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
            {weather.temp}°C
          </span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
            {desc}
          </span>
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2, marginBottom: 6 }}>
          📍 {weather.city}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
          <span style={metaStyle}>🌡️ Feels {weather.feels}°C</span>
          <span style={metaStyle}>💧 {weather.humidity}% humidity</span>
          <span style={metaStyle}>💨 {weather.wind} km/h wind</span>
        </div>
      </div>
      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', alignSelf: 'flex-start', whiteSpace: 'nowrap' }}>
        🟢 Live
      </div>
    </div>
  );
}

const cardStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  padding: '16px 20px',
  background: 'rgba(6,182,212,0.07)',
  border: '1px solid rgba(6,182,212,0.25)',
  borderRadius: '14px',
  marginBottom: 16,
};

const metaStyle = {
  fontSize: '0.78rem',
  color: 'var(--text-secondary)',
  background: 'rgba(255,255,255,0.06)',
  padding: '3px 10px',
  borderRadius: '999px',
  border: '1px solid rgba(255,255,255,0.08)',
};
