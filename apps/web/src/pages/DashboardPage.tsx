import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen,
  Users,
  CalendarCheck,
  AlertCircle,
  TrendingUp,
  ChevronRight,
  Clock,
} from 'lucide-react'
import { format } from 'date-fns'
import api from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import type { Workshop, Registration } from '../types'

function CapacityBar({ used, total }: { used: number; total: number }) {
  const pct = total > 0 ? (used / total) * 100 : 0
  const cls =
    pct >= 90 ? 'capacity-high' : pct >= 70 ? 'capacity-medium' : 'capacity-low'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div className="capacity-bar" style={{ flex: 1 }}>
        <div className={`capacity-fill ${cls}`} style={{ width: `${pct}%` }} />
      </div>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
        {used}/{total}
      </span>
    </div>
  )
}

export default function DashboardPage() {
  const { user, hasRole } = useAuth()
  const navigate = useNavigate()

  const workshopsQ = useQuery<Workshop[]>({
    queryKey: ['workshops'],
    queryFn: () => api.get('/workshops').then((r) => r.data),
    enabled: hasRole('MANAGER', 'STAFF'),
  })

  const registrationsQ = useQuery<Registration[]>({
    queryKey: ['registrations-all'],
    queryFn: () => api.get('/registrations').then((r) => r.data),
    enabled: hasRole('MANAGER', 'STAFF'),
  })

  const workshops = workshopsQ.data || []
  const registrations = registrationsQ.data || []

  const scheduled = workshops.filter((w) => w.status === 'SCHEDULED').length
  const totalActive = registrations.filter((r) => r.status === 'ACTIVE').length
  const fullWorkshops = workshops.filter(
    (w) => w.status === 'SCHEDULED' && w.availableSeats === 0
  ).length
  const thisWeek = workshops.filter((w) => {
    const d = new Date(w.startsAt)
    const now = new Date()
    const weekEnd = new Date(now)
    weekEnd.setDate(now.getDate() + 7)
    return d >= now && d <= weekEnd
  })

  const upcomingWithSeats = workshops
    .filter((w) => w.status === 'SCHEDULED' && w.availableSeats > 0)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .slice(0, 5)

  const recentRegistrations = registrations
    .sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime())
    .slice(0, 5)

  if (!hasRole('MANAGER', 'STAFF')) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Welcome, {user?.name}</h1>
            <p className="page-subtitle">Administrator account — manage users from the sidebar.</p>
          </div>
        </div>
        <div className="card" style={{ maxWidth: 480 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              className="stat-icon"
              style={{ background: 'var(--color-primary-glow)', color: 'var(--color-primary-light)' }}
            >
              <Users size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.0625rem' }}>User Management</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Create and manage staff accounts and roles
              </div>
            </div>
          </div>
          <button
            className="btn btn-primary"
            style={{ marginTop: '20px', width: '100%', justifyContent: 'center' }}
            onClick={() => navigate('/users')}
          >
            Manage Users
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Welcome back, {user?.name}. Here's what's happening today.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ background: 'var(--color-primary-glow)', color: 'var(--color-primary-light)' }}
          >
            <BookOpen size={22} />
          </div>
          <div className="stat-value">{scheduled}</div>
          <div className="stat-label">Scheduled Workshops</div>
        </div>
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}
          >
            <Users size={22} />
          </div>
          <div className="stat-value">{totalActive}</div>
          <div className="stat-label">Active Registrations</div>
        </div>
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)' }}
          >
            <CalendarCheck size={22} />
          </div>
          <div className="stat-value">{thisWeek.length}</div>
          <div className="stat-label">This Week</div>
        </div>
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}
          >
            <AlertCircle size={22} />
          </div>
          <div className="stat-value">{fullWorkshops}</div>
          <div className="stat-label">Full Workshops</div>
        </div>
      </div>

      {/* Two column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Upcoming with seats */}
        <div className="table-wrapper">
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
              <TrendingUp size={17} color="var(--color-primary-light)" />
              Upcoming — Seats Available
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate('/workshops?hasAvailability=true')}
            >
              View all
            </button>
          </div>
          {upcomingWithSeats.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px' }}>
              <div className="empty-state-title">No workshops with seats</div>
              <div className="empty-state-text">All upcoming workshops are full</div>
            </div>
          ) : (
            <div>
              {upcomingWithSeats.map((w) => (
                <div
                  key={w.id}
                  style={{
                    padding: '14px 20px',
                    borderBottom: '1px solid var(--color-border)',
                    cursor: 'pointer',
                    transition: 'background var(--transition)',
                  }}
                  onClick={() => navigate(`/workshops/${w.id}`)}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.background = 'var(--color-surface-2)')
                  }
                  onMouseOut={(e) => (e.currentTarget.style.background = '')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{w.title}</span>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <Clock size={12} />
                        {format(new Date(w.startsAt), 'EEE, MMM d · h:mm a')}
                      </div>
                    </div>
                    <span style={{ color: 'var(--color-success)', fontSize: '0.875rem', fontWeight: 600 }}>
                      {w.availableSeats} left
                    </span>
                  </div>
                  <CapacityBar used={w.reservedSeats} total={w.capacity} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent registrations */}
        <div className="table-wrapper">
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
              <Users size={17} color="var(--color-primary-light)" />
              Recent Registrations
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate('/registrations')}
            >
              View all <ChevronRight size={14} />
            </button>
          </div>
          {recentRegistrations.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px' }}>
              <div className="empty-state-title">No registrations yet</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Attendee</th>
                  <th>Workshop</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentRegistrations.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{r.attendeeName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {r.attendeeEmail}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem' }}>{r.workshop?.code}</span>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          r.status === 'ACTIVE' ? 'badge-success' : 'badge-muted'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
