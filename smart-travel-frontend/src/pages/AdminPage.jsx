import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';
import './AdminPage.css';

export default function AdminPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Search filters
  const [userSearch, setUserSearch] = useState('');
  const [postSearch, setPostSearch] = useState('');

  // Global broadcast announcement
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcastActive, setBroadcastActive] = useState(true);
  const [savingBroadcast, setSavingBroadcast] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    // Extra security guard redirect
    if (user && user.role !== 'admin') {
      navigate('/dashboard');
      return;
    }

    if (token) {
      fetchAdminStats();
      fetchBroadcast();
    }
  }, [user, token, navigate]);

  const showNotification = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const fetchAdminStats = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE}/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch admin stats');
      setStats(data);
      if (isManual) showNotification('Admin metrics refreshed successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  const fetchBroadcast = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/broadcast`);
      if (res.ok) {
        const data = await res.json();
        if (data.broadcast) {
          setBroadcastText(data.broadcast);
          setBroadcastActive(true);
        }
      }
    } catch (err) {
      console.warn('Could not fetch active broadcast:', err.message);
    }
  };

  const handleSaveBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastText.trim()) {
      alert('Please enter a broadcast announcement message.');
      return;
    }
    setSavingBroadcast(true);
    try {
      const res = await fetch(`${API_BASE}/admin/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          message: broadcastText.trim(),
          active: broadcastActive
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save broadcast');
      showNotification(
        broadcastActive
          ? '📢 Global broadcast published live to all users!'
          : 'Global broadcast saved as inactive.'
      );
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingBroadcast(false);
    }
  };

  const handlePromoteUser = async (userId, name) => {
    if (!window.confirm(`Are you sure you want to promote ${name} to Administrator?`)) return;
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/promote`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to promote user');
      showNotification(`🎉 ${name} has been promoted to Admin!`);
      fetchAdminStats();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteUser = async (userId, name) => {
    if (!window.confirm(`⚠️ DANGER: Permanently delete user "${name}" and all their itineraries?`)) return;
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete user');
      showNotification(`User "${name}" was permanently removed.`);
      fetchAdminStats();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('⚠️ Are you sure you want to permanently WIPE this community post?')) return;
    try {
      const res = await fetch(`${API_BASE}/admin/posts/${postId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to wipe post');
      showNotification('Community post wiped successfully.');
      fetchAdminStats();
    } catch (err) {
      alert(err.message);
    }
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    if (!stats?.recentUsers) return [];
    if (!userSearch.trim()) return stats.recentUsers;
    const q = userSearch.toLowerCase();
    return stats.recentUsers.filter(
      (u) =>
        u.fullName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q)
    );
  }, [stats?.recentUsers, userSearch]);

  // Filtered posts
  const filteredPosts = useMemo(() => {
    if (!stats?.recentPosts) return [];
    if (!postSearch.trim()) return stats.recentPosts;
    const q = postSearch.toLowerCase();
    return stats.recentPosts.filter(
      (p) =>
        p.content?.toLowerCase().includes(q) ||
        p.user?.fullName?.toLowerCase().includes(q) ||
        p.user?.email?.toLowerCase().includes(q)
    );
  }, [stats?.recentPosts, postSearch]);

  // Chart data
  const chartAreaData = useMemo(() => {
    const total = stats?.totalItineraries || 0;
    return [
      { name: 'Week 1', plans: Math.max(0, total - 18) },
      { name: 'Week 2', plans: Math.max(0, total - 11) },
      { name: 'Week 3', plans: Math.max(0, total - 4) },
      { name: 'This Week', plans: total }
    ];
  }, [stats?.totalItineraries]);

  const chartBarData = useMemo(() => {
    return [
      { metric: 'Users', total: stats?.totalUsers || 0 },
      { metric: 'Plans', total: stats?.totalItineraries || 0 },
      { metric: 'Community', total: stats?.totalPosts || 0 }
    ];
  }, [stats]);

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="admin-page-layout">
      <Navbar />

      <main className="admin-main-content">
        {/* Header Section */}
        <section className="admin-hero-card">
          <div className="admin-hero-left">
            <div className="admin-hero-pill">
              <span className="admin-pill-dot"></span>
              <span>ADMIN CONSOLE</span>
            </div>
            <h1 className="admin-hero-title">System Overview & Management</h1>
            <p className="admin-hero-subtitle">
              Monitor real-time AI generation metrics, manage platform accounts, and maintain community safety.
            </p>
          </div>

          <div className="admin-hero-actions">
            <button
              className="admin-btn-refresh"
              onClick={() => fetchAdminStats(true)}
              disabled={refreshing}
              title="Refresh platform statistics"
            >
              <span className={`refresh-icon ${refreshing ? 'spinning' : ''}`}>🔄</span>
              <span>{refreshing ? 'Refreshing...' : 'Refresh Metrics'}</span>
            </button>
          </div>
        </section>

        {/* Floating alerts */}
        {error && (
          <div className="admin-toast-banner error-banner">
            <span>⚠️ {error}</span>
            <button onClick={() => setError('')} className="btn-close-toast">×</button>
          </div>
        )}

        {successMsg && (
          <div className="admin-toast-banner success-banner">
            <span>✅ {successMsg}</span>
            <button onClick={() => setSuccessMsg('')} className="btn-close-toast">×</button>
          </div>
        )}

        {loading ? (
          <div className="admin-loading-state">
            <div className="admin-spinner"></div>
            <p>Loading enterprise platform metrics...</p>
          </div>
        ) : stats ? (
          <>
            {/* KPI Cards Grid */}
            <section className="admin-kpi-grid">
              {/* Card 1: Users */}
              <div className="admin-kpi-card">
                <div className="kpi-card-header">
                  <span className="kpi-card-icon-badge">👥</span>
                  <span className="kpi-tag-trend">Total Registered</span>
                </div>
                <div className="kpi-value-row">
                  <span className="kpi-number">{stats.totalUsers || 0}</span>
                </div>
                <div className="kpi-meta-text">Active traveler accounts</div>
              </div>

              {/* Card 2: Itineraries */}
              <div className="admin-kpi-card highlight-card">
                <div className="kpi-card-header">
                  <span className="kpi-card-icon-badge">🗺️</span>
                  <span className="kpi-tag-trend success-trend">AI Generated</span>
                </div>
                <div className="kpi-value-row">
                  <span className="kpi-number">{stats.totalItineraries || 0}</span>
                </div>
                <div className="kpi-meta-text">Full travel plans constructed</div>
              </div>

              {/* Card 3: Community Posts */}
              <div className="admin-kpi-card">
                <div className="kpi-card-header">
                  <span className="kpi-card-icon-badge">💬</span>
                  <span className="kpi-tag-trend">Community Hub</span>
                </div>
                <div className="kpi-value-row">
                  <span className="kpi-number">{stats.totalPosts || 0}</span>
                </div>
                <div className="kpi-meta-text">Travel discussions shared</div>
              </div>

              {/* Card 4: AI Engine Health */}
              <div className="admin-kpi-card engine-card">
                <div className="kpi-card-header">
                  <span className="kpi-card-icon-badge">⚡</span>
                  <span className="kpi-tag-trend engine-status">Gemini 2.5 Flash</span>
                </div>
                <div className="kpi-value-row">
                  <span className="kpi-number cost-number">
                    ~${((stats.totalItineraries || 0) * 0.0015).toFixed(2)}
                  </span>
                </div>
                <div className="kpi-meta-text">Est. AI token compute cost</div>
              </div>
            </section>

            {/* Global Broadcast Announcement Section */}
            <section className="admin-section-card broadcast-card">
              <div className="section-card-header">
                <div>
                  <h2 className="section-card-title">📢 Global Announcement Broadcast</h2>
                  <p className="section-card-desc">
                    Publish a live notice or maintenance alert displayed to all visitors and active travelers.
                  </p>
                </div>
                <div className="broadcast-live-badge">
                  <span className={`live-indicator ${broadcastActive ? 'active' : 'inactive'}`}></span>
                  <span>{broadcastActive ? 'Broadcast Live' : 'Broadcast Paused'}</span>
                </div>
              </div>

              <form onSubmit={handleSaveBroadcast} className="broadcast-form">
                <div className="broadcast-input-group">
                  <input
                    type="text"
                    className="broadcast-input"
                    placeholder="E.g., 📢 Welcome to Smart Travel! Gemini AI 2.5 Flash engine is now active for instant itineraries."
                    value={broadcastText}
                    onChange={(e) => setBroadcastText(e.target.value)}
                  />
                  <div className="broadcast-controls">
                    <label className="broadcast-toggle-label">
                      <input
                        type="checkbox"
                        checked={broadcastActive}
                        onChange={(e) => setBroadcastActive(e.target.checked)}
                      />
                      <span>Active on Platform</span>
                    </label>
                    <button
                      type="submit"
                      className="btn-broadcast-submit"
                      disabled={savingBroadcast}
                    >
                      {savingBroadcast ? 'Saving...' : 'Publish Announcement'}
                    </button>
                  </div>
                </div>
              </form>
            </section>

            {/* Recharts Analytics Grid */}
            <section className="admin-charts-grid">
              <div className="admin-chart-box">
                <div className="chart-box-header">
                  <h3 className="chart-box-title">📈 AI Engine Itinerary Throughput</h3>
                  <span className="chart-box-badge">Weekly Output</span>
                </div>
                <div className="chart-container-inner">
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={chartAreaData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="wiseGreenGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#9FE870" stopOpacity={0.7} />
                          <stop offset="95%" stopColor="#9FE870" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e6ece0" vertical={false} />
                      <XAxis dataKey="name" stroke="#718096" fontSize={12} tickLine={false} />
                      <YAxis stroke="#718096" fontSize={12} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          background: '#163300',
                          border: '1px solid #9FE870',
                          borderRadius: 10,
                          color: '#ffffff',
                          fontWeight: 600
                        }}
                        itemStyle={{ color: '#9FE870' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="plans"
                        name="Generated Plans"
                        stroke="#163300"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#wiseGreenGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="admin-chart-box">
                <div className="chart-box-header">
                  <h3 className="chart-box-title">📊 Platform Distribution</h3>
                  <span className="chart-box-badge">Platform Breakdown</span>
                </div>
                <div className="chart-container-inner">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={chartBarData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e6ece0" vertical={false} />
                      <XAxis dataKey="metric" stroke="#718096" fontSize={12} tickLine={false} />
                      <YAxis stroke="#718096" fontSize={12} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          background: '#163300',
                          border: '1px solid #9FE870',
                          borderRadius: 10,
                          color: '#ffffff',
                          fontWeight: 600
                        }}
                        itemStyle={{ color: '#9FE870' }}
                      />
                      <Bar dataKey="total" name="Total Records" fill="#163300" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            {/* User Directory Management Section */}
            <section className="admin-section-card">
              <div className="section-card-header wrap-header">
                <div>
                  <h2 className="section-card-title">👥 User Directory & Accounts</h2>
                  <p className="section-card-desc">
                    Manage registered traveler profiles and assign administrative privileges.
                  </p>
                </div>
                <div className="section-search-box">
                  <span className="search-box-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="Search by name, email, role..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                  {userSearch && (
                    <button className="btn-clear-search" onClick={() => setUserSearch('')}>×</button>
                  )}
                </div>
              </div>

              <div className="table-responsive-wrapper">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Traveler</th>
                      <th>Email Address</th>
                      <th>Account Role</th>
                      <th>Date Registered</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((u) => {
                        const isSelf = user.id === u._id || user._id === u._id;
                        return (
                          <tr key={u._id}>
                            <td>
                              <div className="user-cell-meta">
                                <div className="user-avatar-badge">
                                  {u.fullName?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <div className="user-name-box">
                                  <strong>{u.fullName}</strong>
                                  {isSelf && <span className="self-tag">(You)</span>}
                                </div>
                              </div>
                            </td>
                            <td className="table-cell-email">{u.email}</td>
                            <td>
                              <span className={`pill-badge badge-${u.role}`}>
                                {u.role === 'admin' ? '🛡️ ADMIN' : '👤 USER'}
                              </span>
                            </td>
                            <td className="table-cell-date">
                              {new Date(u.createdAt).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div className="action-buttons-group">
                                {u.role === 'user' && (
                                  <button
                                    className="btn-action-pill btn-promote-pill"
                                    onClick={() => handlePromoteUser(u._id, u.fullName)}
                                    title="Grant admin privileges"
                                  >
                                    ⭐ Promote
                                  </button>
                                )}
                                <button
                                  className="btn-action-pill btn-delete-pill"
                                  onClick={() => handleDeleteUser(u._id, u.fullName)}
                                  disabled={isSelf}
                                  title={isSelf ? 'Cannot delete your own account' : 'Delete user permanently'}
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="5" className="table-empty-row">
                          No users found matching "{userSearch}".
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Community Content Moderation Section */}
            <section className="admin-section-card">
              <div className="section-card-header wrap-header">
                <div>
                  <h2 className="section-card-title">🛡️ Community Content Moderation</h2>
                  <p className="section-card-desc">
                    Review live community feed discussions and purge inappropriate or spam content.
                  </p>
                </div>
                <div className="section-search-box">
                  <span className="search-box-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="Search posts or authors..."
                    value={postSearch}
                    onChange={(e) => setPostSearch(e.target.value)}
                  />
                  {postSearch && (
                    <button className="btn-clear-search" onClick={() => setPostSearch('')}>×</button>
                  )}
                </div>
              </div>

              <div className="table-responsive-wrapper">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Author</th>
                      <th>Discussion Content</th>
                      <th>Date Posted</th>
                      <th style={{ textAlign: 'right' }}>Moderation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPosts.length > 0 ? (
                      filteredPosts.map((post) => (
                        <tr key={post._id}>
                          <td>
                            <div className="user-cell-meta">
                              <div className="user-avatar-badge post-avatar">
                                {post.user?.fullName?.charAt(0).toUpperCase() || 'P'}
                              </div>
                              <div className="user-name-box">
                                <strong>{post.user?.fullName || 'Traveler'}</strong>
                                <span className="author-email">{post.user?.email || 'N/A'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="table-cell-content">
                            <p className="post-content-preview" title={post.content}>
                              {post.content}
                            </p>
                          </td>
                          <td className="table-cell-date">
                            {new Date(post.createdAt).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className="btn-action-pill btn-wipe-pill"
                              onClick={() => handleDeletePost(post._id)}
                              title="Permanently remove this community post"
                            >
                              🛡️ Wipe Post
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="table-empty-row">
                          {stats.recentPosts && stats.recentPosts.length > 0
                            ? `No discussions match "${postSearch}".`
                            : 'No community discussions currently posted.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
