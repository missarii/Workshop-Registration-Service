import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Search, ClipboardList } from 'lucide-react'
import api from '../lib/api'
import type { Registration, Workshop } from '../types'

export default function RegistrationsPage() {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')

  const { data: registrations = [], isLoading } = useQuery<Registration[]>({
    queryKey: ['registrations', filterStatus],
    queryFn: () => {
      const params = new URLSearchParams()
      if (filterStatus) params.append('status', filterStatus)
      return api.get(`/registrations?${params.toString()}`).then((r) => r.data)
    },
  })

  const filtered = registrations.filter(
    (r) =>
      r.attendeeName.toLowerCase().includes(search.toLowerCase()) ||
      r.attendeeEmail.toLowerCase().includes(search.toLowerCase()) ||
      r.workshop?.code.toLowerCase().includes(search.toLowerCase()) ||
      r.workshop?.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Registrations</h1>
          <p className="page-subtitle">Global view of all workshop registrations across the centre.</p>
        </div>
      </div>

      <div className="filters-bar">
        <div className="form-group" style={{ flex: 2, minWidth: '240px' }}>
          <div className="search-input-wrapper">
            <Search size={16} />
            <input
              type="text"
              className="form-input search-input"
              placeholder="Search by attendee or workshop..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        
        <div className="form-group">
          <select
            className="form-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="CANCELLED">Cancelled Only</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="loading-page">
          <div className="loading-spinner" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <ClipboardList className="empty-state-icon" />
          <h3 className="empty-state-title">No registrations found</h3>
          <p className="empty-state-text">No records match your current filters.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Attendee</th>
                <th>Workshop</th>
                <th>Status</th>
                <th>Staff Record</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{r.attendeeName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.attendeeEmail}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="workshop-code" style={{ fontSize: '0.7rem' }}>{r.workshop?.code}</span>
                      <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{r.workshop?.title}</span>
                    </div>
                    {r.workshop && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {format(new Date(r.workshop.startsAt), 'MMM d, yyyy · h:mm a')}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${r.status === 'ACTIVE' ? 'badge-success' : 'badge-muted'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.8125rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Registered:</span> {r.registeredBy?.name || 'System'}
                    </div>
                    {r.status === 'CANCELLED' && r.cancelledBy && (
                      <div style={{ fontSize: '0.8125rem', marginTop: '2px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Cancelled:</span> {r.cancelledBy.name}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
