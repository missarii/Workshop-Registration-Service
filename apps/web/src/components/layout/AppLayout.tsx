import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  BookOpen,
  Users,
  ClipboardList,
  ScrollText,
  LogOut,
  GraduationCap,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

export function AppLayout() {
  const { user, logout, hasRole } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const initials = user?.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const roleColor = {
    ADMIN: '#f59e0b',
    MANAGER: '#3b82f6',
    STAFF: '#10b981',
  }[user?.role || 'STAFF']

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <GraduationCap size={20} color="white" />
          </div>
          <div>
            <div className="sidebar-logo-text">Workshop Hub</div>
            <div className="sidebar-logo-sub">Registration Service</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {hasRole('MANAGER', 'STAFF') && (
            <>
              <span className="nav-section-label">Overview</span>
              <NavLink
                to="/"
                end
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <LayoutDashboard size={17} />
                Dashboard
              </NavLink>
            </>
          )}

          {hasRole('MANAGER', 'STAFF') && (
            <>
              <span className="nav-section-label">Management</span>
              <NavLink
                to="/workshops"
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <BookOpen size={17} />
                Workshops
              </NavLink>
              <NavLink
                to="/registrations"
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <ClipboardList size={17} />
                Registrations
              </NavLink>
            </>
          )}

          {hasRole('ADMIN', 'MANAGER') && (
            <>
              <span className="nav-section-label">Admin</span>
              {hasRole('ADMIN') && (
                <NavLink
                  to="/users"
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <Users size={17} />
                  Users
                </NavLink>
              )}
              <NavLink
                to="/audit"
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <ScrollText size={17} />
                Audit Log
              </NavLink>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name}
              </div>
              <div className="user-role" style={{ color: roleColor }}>
                {user?.role}
              </div>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleLogout}
              title="Logout"
              style={{ padding: '6px', minWidth: 0 }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <main className="main-content">
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
