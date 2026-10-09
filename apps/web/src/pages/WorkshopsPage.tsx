import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Search, Plus, Filter, MapPin, Clock, XCircle, Loader2 } from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import type { Workshop, Location } from '../types'
import { getErrorMessage } from '../types'

const workshopSchema = z.object({
  code: z.string().min(3, 'Code must be at least 3 characters'),
  title: z.string().min(3, 'Title is required'),
  description: z.string().optional(),
  instructor: z.string().min(2, 'Instructor is required'),
  locationId: z.string().min(1, 'Location is required'),
  startsAt: z.string().min(1, 'Start date/time is required'),
  endsAt: z.string().min(1, 'End date/time is required'),
  capacity: z.coerce.number().int().min(1, 'Capacity must be at least 1'),
})
type WorkshopFormData = z.infer<typeof workshopSchema>

export default function WorkshopsPage() {
  const { hasRole } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('SCHEDULED')
  const [filterLocation, setFilterLocation] = useState<string>('')
  const [filterAvail, setFilterAvail] = useState<boolean>(false)
  const [filterDateFrom, setFilterDateFrom] = useState<string>('')
  const [filterDateTo, setFilterDateTo] = useState<string>('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createError, setCreateError] = useState('')

  const {
    register: registerField,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<WorkshopFormData>({ resolver: zodResolver(workshopSchema) })

  const createMutation = useMutation({
    mutationFn: (data: WorkshopFormData) =>
      api.post('/workshops', {
        ...data,
        startsAt: new Date(data.startsAt).toISOString(),
        endsAt: new Date(data.endsAt).toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workshops'] })
      showToast('Workshop created', 'success')
      setShowCreateModal(false)
      setCreateError('')
      reset()
    },
    onError: (err) => setCreateError(getErrorMessage(err)),
  })

  const onCreateSubmit = (data: WorkshopFormData) => {
    setCreateError('')
    if (new Date(data.endsAt) <= new Date(data.startsAt)) {
      setCreateError('End date/time must be after start date/time')
      return
    }
    createMutation.mutate(data)
  }

  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: () => api.get('/workshops/locations').then((r) => r.data),
  })

  const { data: workshops = [], isLoading } = useQuery<Workshop[]>({
    queryKey: ['workshops', filterStatus, filterLocation, filterAvail, filterDateFrom, filterDateTo],
    queryFn: () => {
      const params = new URLSearchParams()
      if (filterStatus) params.append('status', filterStatus)
      if (filterLocation) params.append('locationId', filterLocation)
      if (filterAvail) params.append('hasAvailability', 'true')
      if (filterDateFrom) params.append('dateFrom', filterDateFrom)
      if (filterDateTo) params.append('dateTo', filterDateTo)
      return api.get(`/workshops?${params.toString()}`).then((r) => r.data)
    },
  })

  const filtered = workshops.filter(
    (w) =>
      w.title.toLowerCase().includes(search.toLowerCase()) ||
      w.code.toLowerCase().includes(search.toLowerCase()) ||
      w.instructor.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Workshops</h1>
          <p className="page-subtitle">Manage all workshop sessions and capacity.</p>
        </div>
        {hasRole('MANAGER') && (
          <button className="btn btn-primary" onClick={() => { setCreateError(''); reset(); setShowCreateModal(true) }}>
            <Plus size={16} />
            Create Workshop
          </button>
        )}
      </div>

      <div className="filters-bar">
        <div className="form-group" style={{ flex: 2, minWidth: '240px' }}>
          <div className="search-input-wrapper">
            <Search size={16} />
            <input
              type="text"
              className="form-input search-input"
              placeholder="Search by title, code or instructor..."
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
            <option value="SCHEDULED">Scheduled</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div className="form-group">
          <select
            className="form-select"
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
          >
            <option value="">All Locations</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ flex: 'none', minWidth: 0 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', height: '100%', padding: '0 12px' }}>
            <input
              type="checkbox"
              checked={filterAvail}
              onChange={(e) => setFilterAvail(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)' }}
            />
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Available only</span>
          </label>
        </div>
      </div>
      
      <div className="filters-bar" style={{ marginTop: '12px' }}>
        <div className="form-group">
          <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Date From</label>
          <input
            type="date"
            className="form-input"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Date To</label>
          <input
            type="date"
            className="form-input"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="loading-page">
          <div className="loading-spinner" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Filter className="empty-state-icon" />
          <h3 className="empty-state-title">No workshops found</h3>
          <p className="empty-state-text">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="grid-3">
          {filtered.map((w) => (
            <div
              key={w.id}
              className="workshop-card"
              onClick={() => navigate(`/workshops/${w.id}`)}
            >
              <div className="workshop-card-header">
                <span className="workshop-code">{w.code}</span>
                <span className={`badge ${w.status === 'SCHEDULED' ? 'badge-primary' : w.status === 'CANCELLED' ? 'badge-danger' : 'badge-muted'}`}>
                  {w.status}
                </span>
              </div>
              <h3 className="workshop-title">{w.title}</h3>
              
              <div className="workshop-meta" style={{ marginTop: '12px', marginBottom: '16px' }}>
                <div className="workshop-meta-item">
                  <Clock size={14} />
                  {format(new Date(w.startsAt), 'EEE, MMM d · h:mm a')}
                </div>
                <div className="workshop-meta-item">
                  <MapPin size={14} />
                  {w.location?.name || 'Unknown location'}
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.8125rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Capacity</span>
                  <span style={{ fontWeight: 600, color: w.availableSeats === 0 ? 'var(--color-danger)' : 'var(--text-primary)' }}>
                    {w.availableSeats === 0 ? 'Full' : `${w.availableSeats} available`}
                  </span>
                </div>
                <div className="capacity-bar">
                  <div 
                    className={`capacity-fill ${w.availableSeats === 0 ? 'capacity-high' : w.availableSeats <= 2 ? 'capacity-medium' : 'capacity-low'}`}
                    style={{ width: `${Math.max(0, Math.min(100, (w.reservedSeats / w.capacity) * 100))}%` }}
                  />
                </div>
              </div>

              <div className="workshop-footer">
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  By {w.instructor}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Workshop Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h2 className="modal-title">Create Workshop</h2>
              <button className="btn btn-ghost" onClick={() => setShowCreateModal(false)}><XCircle size={20} /></button>
            </div>
            <form onSubmit={handleSubmit(onCreateSubmit)}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {createError && <div className="alert alert-error">{createError}</div>}
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Workshop Code *</label>
                    <input className="form-input" placeholder="e.g. POT-010" {...registerField('code')} />
                    {errors.code && <span className="form-error">{errors.code.message}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Capacity (seats) *</label>
                    <input type="number" min={1} className="form-input" {...registerField('capacity')} />
                    {errors.capacity && <span className="form-error">{errors.capacity.message}</span>}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input className="form-input" placeholder="e.g. Beginner Pottery" {...registerField('title')} />
                  {errors.title && <span className="form-error">{errors.title.message}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-input" rows={2} {...registerField('description')} />
                </div>
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Instructor *</label>
                    <input className="form-input" placeholder="Instructor name" {...registerField('instructor')} />
                    {errors.instructor && <span className="form-error">{errors.instructor.message}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Location *</label>
                    <select className="form-select" {...registerField('locationId')}>
                      <option value="">Select location</option>
                      {locations.map((l) => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                    {errors.locationId && <span className="form-error">{errors.locationId.message}</span>}
                  </div>
                </div>
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Starts At *</label>
                    <input type="datetime-local" className="form-input" {...registerField('startsAt')} />
                    {errors.startsAt && <span className="form-error">{errors.startsAt.message}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ends At *</label>
                    <input type="datetime-local" className="form-input" {...registerField('endsAt')} />
                    {errors.endsAt && <span className="form-error">{errors.endsAt.message}</span>}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting || createMutation.isPending}>
                  {(isSubmitting || createMutation.isPending) && <Loader2 size={16} className="spin" />}
                  Create Workshop
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
