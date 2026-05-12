import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import './StatsPage.css';

const STATUS_COLORS = {
  planned: '#6366f1',
  ongoing: '#f59e0b',
  completed: '#10b981',
};

const STYLE_COLORS = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#14b8a6'];

const STYLE_EMOJI = {
  adventure: '🏔️', relaxation: '🏖️', cultural: '🏛️',
  foodie: '🍜', budget: '💰', luxury: '✨'
};

function StatCard({ emoji, label, value, sub, color }) {
  return (
    <div className="stat-card" style={{ borderTop: `3px solid ${color || 'var(--accent-primary)'}` }}>
      <div className="stat-card-emoji">{emoji}</div>
      <div className="stat-card-value" style={{ color: color || 'var(--text-primary)' }}>{value}</div>
      <div className="stat-card-label">{label}</div>
      {sub && <div className="stat-card-sub">{sub}</div>}
    </div>
  );
}

const CustomTooltip = ({ active, payload }) => {
  if (active && payload?.length) {
    return (
      <div style={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 14px', borderRadius: 8, fontSize: '0.85rem' }}>
        <p style={{ color: '#fff', margin: 0 }}>{payload[0].name}: <strong>{payload[0].value}</strong></p>
      </div>
    );
  }
  return null;
};

export default function StatsPage() {
  const { token, user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setStats(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const statusChartData = stats ? [
    { name: 'Planned', value: stats.statusBreakdown.planned },
    { name: 'Ongoing', value: stats.statusBreakdown.ongoing },
    { name: 'Completed', value: stats.statusBreakdown.completed },
  ].filter(d => d.value > 0) : [];

  const memberDays = stats
    ? Math.floor((new Date() - new Date(stats.memberSince)) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="stats-page">
      <Navbar />

      <div className="stats-container">
        {/* Header */}
        <div className="stats-header">
          <div>
            <h1 className="stats-title">📊 My Travel Statistics</h1>
            <p className="stats-subtitle">A complete overview of your travel journey with SmartTravel</p>
          </div>
          {stats && (
            <div className="member-badge">
              <span>🗓️</span>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>Member for {memberDays} days</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Since {new Date(stats.memberSince).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}</div>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300, gap: 16 }}>
            <div className="spinner" />
            <p style={{ color: 'var(--text-muted)' }}>Loading your stats...</p>
          </div>
        ) : error ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#ef4444' }}>⚠️ {error}</div>
        ) : stats && (
          <>
            {/* ── TOP KPI CARDS ── */}
            <div className="stats-kpi-grid">
              <StatCard emoji="✈️" label="Total Trips Planned" value={stats.totalTrips} color="#6366f1" />
              <StatCard emoji="🌍" label="Destinations Explored" value={stats.uniqueDestinations.length} color="#06b6d4" />
              <StatCard emoji="📅" label="Total Days Planned" value={stats.totalDaysPlanned} sub="across all trips" color="#8b5cf6" />
              <StatCard emoji="✅" label="Trips Completed" value={stats.statusBreakdown.completed} color="#10b981" />
              <StatCard emoji="💰" label="Total Budget Planned" value={`${stats.totalBudgetPlanned.toLocaleString()}`} sub="across all itineraries" color="#f59e0b" />
              <StatCard emoji="🧾" label="Actual Money Spent" value={`${stats.totalActualSpent.toLocaleString()}`} sub="from budget tracker" color="#ef4444" />
              <StatCard emoji="⭐" label="Reviews Written" value={stats.reviewCount} color="#f59e0b" />
              <StatCard emoji="💬" label="Community Posts" value={stats.postCount} color="#ec4899" />
            </div>

            {/* ── FAVOURITE STYLE BANNER ── */}
            <div className="fav-style-banner">
              <div style={{ fontSize: '2.5rem' }}>{STYLE_EMOJI[stats.favouriteStyle] || '🎒'}</div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Your Favourite Travel Style</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textTransform: 'capitalize' }}>
                  {stats.favouriteStyle}
                </div>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Most visited destination</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  📍 {stats.uniqueDestinations[0] || 'None yet'}
                </div>
              </div>
            </div>

            {/* ── CHARTS ROW ── */}
            <div className="stats-charts-row">

              {/* Trip Status Donut */}
              <div className="stats-chart-card">
                <h3 className="chart-title">🗂️ Trip Status Breakdown</h3>
                {statusChartData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={statusChartData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                          {statusChartData.map((entry, idx) => (
                            <Cell key={idx} fill={STATUS_COLORS[entry.name.toLowerCase()]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap', marginTop: 8 }}>
                      {statusChartData.map(d => (
                        <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLORS[d.name.toLowerCase()] }} />
                          <span style={{ color: 'var(--text-muted)' }}>{d.name}</span>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No trips yet</div>
                )}
              </div>

              {/* Travel Style Chart */}
              <div className="stats-chart-card">
                <h3 className="chart-title">🎒 Travel Style Distribution</h3>
                {stats.travelStyleData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={stats.travelStyleData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                      <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {stats.travelStyleData.map((_, idx) => (
                          <Cell key={idx} fill={STYLE_COLORS[idx % STYLE_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No data yet</div>
                )}
              </div>

              {/* Monthly Activity */}
              <div className="stats-chart-card">
                <h3 className="chart-title">📆 Monthly Trip Activity</h3>
                {stats.monthlyTrips.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={stats.monthlyTrips} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                      <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No trips in last 6 months</div>
                )}
              </div>
            </div>

            {/* ── DESTINATIONS LIST ── */}
            {stats.uniqueDestinations.length > 0 && (
              <div className="stats-destinations-card">
                <h3 className="chart-title">🌍 All Destinations You've Planned</h3>
                <div className="destinations-tags">
                  {stats.uniqueDestinations.map((dest, idx) => (
                    <span key={idx} className="dest-tag">📍 {dest}</span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
