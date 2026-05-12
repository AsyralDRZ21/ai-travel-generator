import { useState, useEffect } from 'react';

const WEATHER_ICONS = {
  'Clear': '☀️', 'Clouds': '☁️', 'Rain': '🌧️', 'Drizzle': '🌦️',
  'Thunderstorm': '⛈️', 'Snow': '❄️', 'Mist': '🌫️', 'Fog': '🌫️',
  'Haze': '🌫️', 'Dust': '🌪️', 'Sand': '🌪️', 'Smoke': '🌫️'
};

export default function WeatherWidget({ destination }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!destination) return;
    fetchWeather(destination);
  }, [destination]);

  const fetchWeather = async (city) => {
    setLoading(true);
    setError('');
    setWeather(null);
    try {
      const apiKey = import.meta.env.VITE_WEATHER_API_KEY;
      if (!apiKey) { setError('no_key'); setLoading(false); return; }

      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`
      );
      if (!res.ok) throw new Error(`City not found (${res.status})`);
      const data = await res.json();
      setWeather(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!destination) return null;

  // Loading state
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

  // No API key
  if (error === 'no_key') {
    return (
      <div style={cardStyle}>
        <div style={{ fontSize: '1.5rem' }}>🌤️</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>Live Weather</div>
          <div style={{ fontSize: '0.75rem', color: '#f59e0b' }}>Restart frontend after adding VITE_WEATHER_API_KEY to .env</div>
        </div>
      </div>
    );
  }

  // Error fetching
  if (error) {
    return (
      <div style={cardStyle}>
        <span style={{ fontSize: '1.5rem' }}>⚠️</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>Weather — {destination}</div>
          <div style={{ fontSize: '0.75rem', color: '#ef4444' }}>{error}</div>
        </div>
      </div>
    );
  }

  if (!weather) return null;

  const main = weather.weather?.[0]?.main || 'Clear';
  const desc = weather.weather?.[0]?.description || '';
  const temp = Math.round(weather.main?.temp);
  const feels = Math.round(weather.main?.feels_like);
  const humidity = weather.main?.humidity;
  const wind = weather.wind?.speed;
  const icon = WEATHER_ICONS[main] || '🌡️';

  return (
    <div style={cardStyle}>
      <div style={{ fontSize: '2.4rem', lineHeight: 1 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
            {temp}°C
          </span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
            {desc}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
          <span style={metaStyle}>🌡️ Feels {feels}°C</span>
          <span style={metaStyle}>💧 {humidity}% humidity</span>
          <span style={metaStyle}>💨 {wind} m/s wind</span>
        </div>
      </div>
      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', alignSelf: 'flex-start', whiteSpace: 'nowrap' }}>
        🔴 Live
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
