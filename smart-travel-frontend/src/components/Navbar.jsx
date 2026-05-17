import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const NAV_GROUPS = [
  {
    group: 'PLANING',
    groupIcon: '',
    items: [
      { label: 'Itinerary Generator', path: '/itinerary', icon: <img src="/itinerary.png" alt="Currency" style={{ width: '28px', height: '28px', objectFit: 'contain' }} /> },
      { label: 'Trip History',        path: '/history',   icon: <img src="/history.png" alt="Currency" style={{ width: '28px', height: '28px', objectFit: 'contain' }} /> },
      { label: 'Smart Recommend',     path: '/recommend', icon: <img src="/ai.png" alt="Currency" style={{ width: '28px', height: '28px', objectFit: 'contain' }} /> },
    ]
  },
  {
    group: 'BUDGET & CURRENCY',
    groupIcon: '',
    items: [
      { label: 'Budget Tracker',     path: '/budget',  icon: <img src="/budget.png" alt="Currency" style={{ width: '28px', height: '28px', objectFit: 'contain' }} /> },
      { label: 'Currency Converter', path: '/currency', icon: <img src="/currency.png" alt="Currency" style={{ width: '28px', height: '28px', objectFit: 'contain' }} /> },
    ]
  },
  {
    group: 'COMMUNITY',
    groupIcon: '',
    items: [
      { label: 'Community Hub', path: '/community', icon: <img src="/community.png" alt="Currency" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />  },
    ]
  },
  {
    group: 'ACCOUNT',
    groupIcon: '',
    items: [
      { label: 'My Statistics', path: '/stats',    icon: <img src="/statistics.png" alt="Currency" style={{ width: '28px', height: '28px', objectFit: 'contain' }} /> },
      { label: 'Profile',       path: '/profile',icon: <img src="/profile.png" alt="Currency" style={{ width: '28px', height: '28px', objectFit: 'contain' }} /> },
    ]
  },
];

const ADMIN_GROUPS = [
  {
    group: 'ADMIN',
    groupIcon: '👑',
    items: [
      { label: 'Admin Dashboard', path: '/admin',     icon: '📋' },
      { label: 'Community Hub',   path: '/community', icon: '🌍' },
    ]
  }
];

export default function Navbar() {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => { logoutUser(); navigate('/'); };
  const groups = user?.role === 'admin' ? ADMIN_GROUPS : NAV_GROUPS;

  const toggleSidebar = () => {
    const next = !sidebarOpen;
    setSidebarOpen(next);
    document.body.style.paddingLeft = next ? '220px' : '54px';
  };

  return (
    <>
      {/* ── TOP NAVBAR ── */}
      <header className="topbar">
        {/* Left: Hamburger only */}
        <div className="topbar-left">
          {user && (
            <button className="topbar-toggle" onClick={toggleSidebar} title="Toggle Sidebar">
              <span className={`hamburger ${sidebarOpen ? 'open' : ''}`}>
                <span /><span /><span />
              </span>
            </button>
          )}
        </div>

        {/* Center: Logo always centered */}
        <Link to={user ? '/dashboard' : '/'} className="topbar-brand-center">
          <img src="/logo.png" alt="SmartTravel" style={{ height: 50, width: 'auto', objectFit: 'contain' }} />
        </Link>

        {/* Right: Avatar + Logout */}
        <div className="topbar-right">
          {user ? (
            <>
              <Link to="/profile" className="topbar-avatar" title={user.fullName}>
                {user.fullName?.charAt(0).toUpperCase()}
              </Link>
              <button className="topbar-logout" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="topbar-link">Login</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
            </>
          )}
        </div>
      </header>

      {/* ── LEFT SIDEBAR ── */}
      {user && (
        <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
          <nav className="sidebar-nav">
            {groups.map((group) => {
              const groupActive = group.items.some(i => i.path === location.pathname);
              return (
                <div key={group.group} className="sidebar-group">

                  {/* Collapsed: show one group icon with tooltip */}
                  {!sidebarOpen ? (
                    <div className={`sidebar-group-icon-btn ${groupActive ? 'group-icon-active' : ''}`} title={group.group}>
                      <span>{group.groupIcon}</span>
                    </div>
                  ) : (
                    /* Expanded: show group label */
                    <div className="sidebar-group-label">
                      <span>{group.groupIcon}</span> {group.group}
                    </div>
                  )}

                  {/* Items — always render but hidden when collapsed */}
                  {sidebarOpen && group.items.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`sidebar-item ${isActive ? 'sidebar-item-active' : ''}`}
                      >
                        <span className="sidebar-item-icon">{item.icon}</span>
                        <span className="sidebar-item-label">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </nav>
        </aside>
      )}
    </>
  );
}
