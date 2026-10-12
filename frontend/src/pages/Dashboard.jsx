import { useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import { Shield, Inbox, Send, Settings, LogOut, Home, ChevronLeft, ChevronRight } from 'lucide-react';
import DashboardHome from './dashboard/Home';
import InboxPage from './dashboard/Inbox';
import ComposePage from './dashboard/Compose';
import SettingsPage from './dashboard/Settings';

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { path: '/dashboard', icon: <Home size={18} />, label: 'Home', exact: true },
    { path: '/dashboard/inbox', icon: <Inbox size={18} />, label: 'Inbox' },
    { path: '/dashboard/compose', icon: <Send size={18} />, label: 'Compose' },
    { path: '/dashboard/settings', icon: <Settings size={18} />, label: 'Settings' },
  ];

  const isActive = (path, exact = false) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  return (
    <div className="dashboard-layout">
      {/* Mobile Top Header (<= 768px) */}
      <header className="dashboard-mobile-header">
        <div 
          onClick={() => navigate('/dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
        >
          <Logo size={22} />
          <span style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>QSecureMail</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,212,255,0.15)', border: '1px solid rgba(0,212,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#00d4ff' }}>{user?.email?.charAt(0).toUpperCase()}</span>
          </div>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            title="Logout"
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* Desktop Sidebar (> 768px) */}
      <aside className={`dashboard-sidebar-desktop ${collapsed ? 'dashboard-sidebar-collapsed' : ''}`}>
        {/* Logo */}
        <div 
          onClick={() => navigate('/dashboard')}
          style={{ padding: collapsed ? '24px 0' : '24px 20px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.06)', justifyContent: collapsed ? 'center' : 'flex-start', cursor: 'pointer' }}
        >
          <Logo size={24} />
          {!collapsed && (
            <div>
              <p style={{ fontWeight: 700, fontSize: 14, color: '#fff', lineHeight: 1.2 }}>QSecureMail</p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em' }}>QUANTUM-SAFE</p>
            </div>
          )}
        </div>

        {/* User */}
        {!collapsed && (
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,212,255,0.15)', border: '1px solid rgba(0,212,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#00d4ff' }}>{user?.email?.charAt(0).toUpperCase()}</span>
            </div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', marginTop: 2 }}>AUTHENTICATED</p>
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {menuItems.map(item => {
            const active = isActive(item.path, item.exact);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                title={collapsed ? item.label : ''}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: collapsed ? '10px 0' : '10px 12px',
                  borderRadius: 8, border: active ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
                  background: active ? 'rgba(255,255,255,0.07)' : 'transparent',
                  color: active ? '#fff' : 'rgba(255,255,255,0.4)',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  transition: 'all 0.2s ease', width: '100%',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'transparent'; } }}
              >
                {item.icon}
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div style={{ padding: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: collapsed ? '10px 0' : '10px 12px', borderRadius: 8, border: '1px solid transparent', background: 'transparent', color: 'rgba(255,255,255,0.35)', fontSize: 13, cursor: 'pointer', width: '100%', justifyContent: collapsed ? 'center' : 'flex-start', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(248,113,113,0.06)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <LogOut size={18} />{!collapsed && <span>Logout</span>}
          </button>
          <button
            onClick={() => setCollapsed(c => !c)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '8px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: 'rgba(255,255,255,0.3)', fontSize: 12, cursor: 'pointer', width: '100%', transition: 'all 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
          >
            {collapsed ? <ChevronRight size={14} /> : <><ChevronLeft size={14} /><span>Collapse</span></>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="dashboard-main-content">
        <Routes>
          <Route path="/" element={<DashboardHome />} />
          <Route path="/inbox" element={<InboxPage />} />
          <Route path="/compose" element={<ComposePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>

      {/* Mobile Bottom Navigation Bar (<= 768px) */}
      <nav className="dashboard-bottom-bar">
        {menuItems.map(item => {
          const active = isActive(item.path, item.exact);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                background: 'transparent',
                border: 'none',
                color: active ? '#00d4ff' : 'rgba(255,255,255,0.4)',
                cursor: 'pointer',
                padding: '6px 12px',
                borderRadius: 8,
                transition: 'all 0.15s ease'
              }}
            >
              {item.icon}
              <span style={{ fontSize: 10, fontWeight: active ? 600 : 500, letterSpacing: '0.02em' }}>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
