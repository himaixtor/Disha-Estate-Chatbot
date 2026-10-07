import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import dishaMark from '../assets/disha-mark.svg';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: 'grid', permission: 'can_access_dashboard', end: true },
  { to: '/leads', label: 'Leads & Chats', icon: 'chat', permission: 'can_view_all_chats' },
  { to: '/categories', label: 'Categories', icon: 'layers', permission: 'can_manage_categories' },
  { to: '/property-configurations', label: 'Property Configuration', icon: 'settings', permission: 'can_manage_categories' },
  { to: '/service-sectors', label: 'Service Sectors', icon: 'pin', permission: null },
  { to: '/users', label: 'Users', icon: 'users', permission: 'can_manage_users' },
  { to: '/roles', label: 'Roles', icon: 'shield', permission: 'can_manage_roles' },
  { to: '/licenses', label: 'Licenses', icon: 'key', permission: 'can_access_license_management' },
];

function NavIcon({ name }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    chat: <path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.7 8.7 0 0 1-3.5-.75L4 20l1.5-4A7.5 7.5 0 1 1 20 11.5Z"/>,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 16 9 5 9-5"/></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    key: <><circle cx="7.5" cy="15.5" r="4.5"/><path d="m11 12 9-9M16 3l5 5M18 5l-3 3"/></>,
    shield: <path d="M12 3 4 6.5v5.2c0 4.6 3.2 8.6 8 9.8 4.8-1.2 8-5.2 8-9.8V6.5L12 3Z"/>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1a1.8 1.8 0 0 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3 .9v.2a1.8 1.8 0 0 1-3.6 0v-.2a1.8 1.8 0 0 0-3-.9l-.1.1a1.8 1.8 0 0 1-2.5-2.5l.1-.1a1.8 1.8 0 0 0-.9-3h-.2a1.8 1.8 0 0 1 0-3.6h.2a1.8 1.8 0 0 0 .9-3l-.1-.1a1.8 1.8 0 0 1 2.5-2.5l.1.1a1.8 1.8 0 0 0 3-.9v-.2a1.8 1.8 0 0 1 3.6 0v.2a1.8 1.8 0 0 0 3 .9l.1-.1a1.8 1.8 0 0 1 2.5 2.5l-.1.1a1.8 1.8 0 0 0 .9 3h.2a1.8 1.8 0 0 1 0 3.6h-.2a1.8 1.8 0 0 0-.9 3Z"/></>,
  };
  return <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">{paths[name]}</svg>;
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const visibleItems = NAV_ITEMS.filter((item) => !item.permission || user?.permissions?.[item.permission]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><img className="brand-mark" src={dishaMark} alt="" /><span>Disha <small>ADMIN</small></span></div>
        <div className="sidebar-label">Workspace</div>
        <nav>
          {visibleItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}><NavIcon name={item.icon} />{item.label}</NavLink>
          ))}
        </nav>
        <div className="user-box">
          <div className="user-avatar">{user?.name?.slice(0, 1)?.toUpperCase() || 'A'}</div>
          <div className="user-meta"><strong>{user?.name}</strong><span>{user?.role}</span></div>
          <button title="Sign out" aria-label="Sign out" onClick={() => { logout(); navigate('/login'); }}>↗</button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar"><div><span className="eyebrow">Disha Estate Management</span><span className="topbar-title">Operations portal</span></div><div className="topbar-date">{new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date())}</div></header>
        <Outlet />
      </main>
    </div>
  );
}
