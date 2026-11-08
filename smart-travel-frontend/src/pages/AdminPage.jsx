import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts';
import './AdminPage.css';

export default function AdminPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState(null);
  const [inbox, setInbox] = useState([]);
  const [activeChatUser, setActiveChatUser] = useState(null);
  const [adminMessages, setAdminMessages] = useState([]);
  const [adminReplyText, setAdminReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Extra guard redirect
    if (user && user.role !== 'admin') {
      navigate('/dashboard');
      return;
    }

    if (token) {
      fetchAdminStats();
      fetchInbox();
    }
  }, [user, token, navigate]);

  const fetchInbox = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/chat/admin/inbox`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInbox(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openAdminChat = async (targetUser) => {
    setActiveChatUser(targetUser);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`}/chat/${targetUser._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAdminMessages(data);
        fetchInbox(); // Refresh unread count
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdminReply = async (e) => {
    e.preventDefault();
    if (!adminReplyText.trim() || !activeChatUser) return;
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: adminReplyText, targetUserId: activeChatUser._id })
      });
      if (res.ok) {
        setAdminReplyText('');
        openAdminChat(activeChatUser); // Refresh chat history
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAdminStats = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Failed to fetch admin stats');
      }
      
      setStats(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePromoteUser = async (userId, name) => {
    if (!window.confirm(`Are you sure you want to promote ${name} to Admin?`)) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`}/admin/users/${userId}/promote`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to promote user');
      
      // Refresh stats to show new role
      fetchAdminStats();
      alert('User successfully promoted to Admin!');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteUser = async (userId, name) => {
    if (!window.confirm(`DANGER: Are you sure you want to PERMANENTLY delete ${name}? All their itineraries will be gone.`)) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete user');
      
      // Refresh stats
      fetchAdminStats();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm(`DANGER: Are you sure you want to permanently WIPE this post?`)) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to wipe post');
      
      fetchAdminStats();
    } catch (err) {
      alert(err.message);
    }
  };

  if (!user || user.role !== 'admin') return null; // Avoid flashing UI before redirect

  return (
    <div className="admin-container">
      <Navbar />
      
      <div className="admin-header">
        <div>
          <h1> Admin Dashboard</h1>
          <p>Global analytics and platform management.</p>
        </div>
      </div>

      {error && <div className="alert-error" style={{ padding: 12, borderRadius: 8, marginBottom: 24 }}>{error}</div>}

      {loading ? (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Loading global metrics...</p>
        </div>
      ) : stats ? (
        <>

          <div className="admin-stats-grid">
            <div className="stat-card" style={{ '--card-gradient': 'var(--gradient-primary)' }}>
              <div className="stat-value">{stats.totalUsers}</div>
              <div className="stat-label">Total Users</div>
            </div>
            
            <div className="stat-card" style={{ '--card-gradient': 'var(--gradient-success)' }}>
              <div className="stat-value">{stats.totalItineraries}</div>
              <div className="stat-label">Itineraries Generated</div>
            </div>
            
            <div className="stat-card" style={{ '--card-gradient': 'var(--gradient-warm)' }}>
              <div className="stat-value" style={{ fontSize: '3rem' }}>
                {stats.totalPosts ? stats.totalPosts.toLocaleString() : 0}
              </div>
              <div className="stat-label">Total Community Posts</div>
            </div>

            <div className="stat-card" style={{ '--card-gradient': 'linear-gradient(135deg, #1e293b, #0f172a)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="stat-value" style={{ fontSize: '2rem', color: '#94a3b8' }}>
                ~${(stats.totalItineraries * 0.0015).toFixed(2)}
              </div>
              <div className="stat-label" style={{ color: '#64748b' }}>Est. Gemini API Cost</div>
            </div>
          </div>

          {/* Graphical Analytics Component */}
          <div className="glass-card fade-in" style={{ padding: 24, margin: '2rem 24px', display: 'flex', flexWrap: 'wrap', gap: 32 }}>
            <div style={{ flex: '1 1 400px' }}>
               <h3 style={{ marginBottom: 16, fontSize: '1.1rem' }}> API Engine Utilization (Estimated Itineraries)</h3>
               <div style={{ height: 250 }}>
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[
                      { name: 'Week 1', count: Math.max(0, stats.totalItineraries - 20) },
                      { name: 'Week 2', count: Math.max(0, stats.totalItineraries - 10) },
                      { name: 'Week 3', count: Math.max(0, stats.totalItineraries - 5) },
                      { name: 'This Week', count: stats.totalItineraries }
                    ]}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="name" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b' }} />
                      <Area type="monotone" dataKey="count" stroke="#10b981" fillOpacity={1} fill="url(#colorCount)" />
                    </AreaChart>
                 </ResponsiveContainer>
               </div>
            </div>

            <div style={{ flex: '1 1 400px' }}>
               <h3 style={{ marginBottom: 16, fontSize: '1.1rem' }}> Platform Engagement</h3>
               <div style={{ height: 250 }}>
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'Users', amount: stats.totalUsers },
                      { name: 'Discussions', amount: stats.totalPosts },
                      { name: 'Plans', amount: stats.totalItineraries }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="name" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b' }} />
                      <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                 </ResponsiveContainer>
               </div>
            </div>
          </div>

          <div className="recent-users-section fade-in">
            <h2> Recent Signups</h2>
            <div style={{ overflowX: 'auto' }}>
              <table className="user-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentUsers.map(u => (
                    <tr key={u._id}>
                      <td><strong style={{ color: 'var(--text-primary)' }}>{u.fullName}</strong></td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`role-badge role-${u.role}`}>
                          {u.role}
                        </span>
                      </td>
                      <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td>
                        {/* {u.role === 'user' && (
                          <button 
                            className="btn-admin-action btn-admin-promote"
                            onClick={() => handlePromoteUser(u._id, u.fullName)}
                          >
                            👑 Promote
                          </button>
                        )} */}
                        <button 
                          className="btn-admin-action btn-admin-delete"
                          onClick={() => handleDeleteUser(u._id, u.fullName)}
                          disabled={user.id === u._id}
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="recent-users-section fade-in" style={{ marginTop: '2rem' }}>
            <h2> Community Moderation</h2>
            <div style={{ overflowX: 'auto' }}>
              <table className="user-table">
                <thead>
                  <tr>
                    <th>Author</th>
                    <th>Post Content</th>
                    <th>Date Posted</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentPosts && stats.recentPosts.length > 0 ? stats.recentPosts.map(post => (
                    <tr key={post._id}>
                      <td><strong style={{ color: 'var(--text-primary)' }}>{post.user?.fullName || 'Deleted User'}</strong> <br/> <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{post.user?.email || ''}</span></td>
                      <td style={{ maxWidth: 350, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{post.content}</td>
                      <td>{new Date(post.createdAt).toLocaleDateString()}</td>
                      <td>
                        <button 
                          className="btn-admin-action btn-admin-delete"
                          onClick={() => handleDeletePost(post._id)}
                        >
                          🗑️ Wipe Post
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>No community posts found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="recent-users-section fade-in" style={{ marginTop: '2rem' }}>
            <h2> Support Inbox</h2>
            <div style={{ display: 'flex', gap: '24px', minHeight: '400px' }}>
              
              <div style={{ flex: 1, borderRight: '1px solid var(--glass-border)', paddingRight: '16px' }}>
                {inbox.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No messages from users.</p> : null}
                {inbox.map(thread => (
                  <div 
                    key={thread._id._id} 
                    onClick={() => openAdminChat(thread._id)}
                    style={{ 
                      padding: 16, borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer',
                      background: activeChatUser?._id === thread._id._id ? 'rgba(255,255,255,0.05)' : 'transparent',
                      borderRadius: 8
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong>{thread._id.fullName}</strong>
                      {thread.unreadCount > 0 && <span style={{ background: 'var(--primary-color)', color: 'white', padding: '2px 8px', borderRadius: 12, fontSize: '0.8rem' }}>{thread.unreadCount} New</span>}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {thread.latestMessage}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ flex: 2, display: 'flex', flexDirection: 'column' }}>
                {activeChatUser ? (
                  <>
                    <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: 12, marginBottom: 12 }}>
                      Chat with {activeChatUser.fullName}
                    </h3>
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16, maxHeight: '300px', paddingRight: 8 }}>
                      {adminMessages.map(msg => (
                        <div key={msg._id} className={`chat-message ${msg.senderRole === 'admin' ? 'msg-user' : 'msg-admin'}`}>
                          {msg.text}
                          <span className="msg-time">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      ))}
                    </div>
                    <form style={{ display: 'flex', gap: 8 }} onSubmit={handleAdminReply}>
                      <input 
                        type="text" 
                        style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: 20, padding: '10px 16px', color: 'white', outline: 'none' }}
                        placeholder="Type reply..."
                        value={adminReplyText}
                        onChange={e => setAdminReplyText(e.target.value)}
                      />
                      <button type="submit" style={{ background: 'var(--primary-color)', border: 'none', color: 'white', borderRadius: 20, padding: '0 20px', cursor: 'pointer' }}>Send</button>
                    </form>
                  </>
                ) : (
                  <div style={{ margin: 'auto', color: 'var(--text-muted)' }}>Select a user to chat</div>
                )}
              </div>

            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
