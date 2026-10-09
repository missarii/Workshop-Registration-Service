import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowLeft,
  MapPin,
  Clock,
  User,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import type { Workshop, Registration } from '../types'
import { getErrorMessage } from '../types'

const regSchema = z.object({
  attendeeName: z.string().min(2, 'Name is required'),
  attendeeEmail: z.string().email('Valid email is required'),
})
type RegFormData = z.infer<typeof regSchema>

export default function WorkshopDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { hasRole } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  
  const [showRegModal, setShowRegModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState<string | null>(null) // registrationId
  const [regError, setRegError] = useState('')

  const { data: workshop, isLoading } = useQuery<Workshop & { registrations: Registration[] }>({
    queryKey: ['workshop', id],
    queryFn: () => api.get(`/workshops/${id}`).then((r) => r.data),
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RegFormData>({ resolver: zodResolver(regSchema) })

  const registerMutation = useMutation({
    mutationFn: (data: RegFormData) => api.post(`/workshops/${id}/registrations`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workshop', id] })
      showToast('Registration successful', 'success')
      setShowRegModal(false)
      reset()
    },
    onError: (err) => setRegError(getErrorMessage(err)),
  })

  const cancelMutation = useMutation({
    mutationFn: (regId: string) => api.patch(`/workshops/${id}/registrations/${regId}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workshop', id] })
      showToast('Registration cancelled', 'info')
      setShowCancelModal(null)
    },
    onError: (err) => showToast(getErrorMessage(err), 'error'),
  })

  const onRegisterSubmit = (data: RegFormData) => {
    setRegError('')
    registerMutation.mutate(data)
  }

  if (isLoading) {
    return <div className="loading-page"><div className="loading-spinner" /></div>
  }

  if (!workshop) {
    return <div className="empty-state">Workshop not found</div>
  }

  const isFull = workshop.availableSeats === 0
  const canRegister = workshop.status === 'SCHEDULED' && !isFull && hasRole('MANAGER', 'STAFF')

  return (
    <div>
      <button
        className="btn btn-ghost"
        style={{ marginBottom: '24px', paddingLeft: 0 }}
        onClick={() => navigate('/workshops')}
      >
        <ArrowLeft size={16} /> Back to Workshops
      </button>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Main info */}
        <div style={{ flex: '1 1 500px' }}>
          <div className="card" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span className="workshop-code" style={{ fontSize: '0.875rem' }}>{workshop.code}</span>
              <span className={`badge ${workshop.status === 'SCHEDULED' ? 'badge-primary' : workshop.status === 'CANCELLED' ? 'badge-danger' : 'badge-muted'}`}>
                {workshop.status}
              </span>
            </div>
            
            <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>{workshop.title}</h1>
            
            {workshop.description && (
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '1rem', lineHeight: 1.6 }}>
                {workshop.description}
              </p>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: 'var(--color-surface-2)', padding: '20px', borderRadius: 'var(--radius-md)' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Schedule</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
                  <Clock size={16} color="var(--color-primary-light)" />
                  {format(new Date(workshop.startsAt), 'MMM d, yyyy')}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px', paddingLeft: '24px' }}>
                  {format(new Date(workshop.startsAt), 'h:mm a')} – {format(new Date(workshop.endsAt), 'h:mm a')}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Location</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
                  <MapPin size={16} color="var(--color-primary-light)" />
                  {workshop.location?.name}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px', paddingLeft: '24px' }}>
                  {workshop.location?.address}
                </div>
              </div>
              <div style={{ gridColumn: '1 / -1', marginTop: '8px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Instructor</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
                  <User size={16} color="var(--color-primary-light)" />
                  {workshop.instructor}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar / Actions */}
        <div style={{ flex: '0 0 320px' }}>
          <div className="card">
            <h3 style={{ fontSize: '1.125rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} /> Capacity & Registration
            </h3>
            
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1 }}>{workshop.reservedSeats}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>of {workshop.capacity} seats reserved</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, color: isFull ? 'var(--color-danger)' : 'var(--color-success)', fontSize: '1.125rem' }}>
                  {isFull ? 'Full' : `${workshop.availableSeats} Left`}
                </div>
              </div>
            </div>
            
            <div className="capacity-bar" style={{ height: '8px', marginBottom: '24px' }}>
              <div 
                className={`capacity-fill ${isFull ? 'capacity-high' : workshop.availableSeats <= 2 ? 'capacity-medium' : 'capacity-low'}`}
                style={{ width: `${Math.max(0, Math.min(100, (workshop.reservedSeats / workshop.capacity) * 100))}%` }}
              />
            </div>

            {hasRole('MANAGER', 'STAFF') && (
              <button 
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                disabled={!canRegister}
                onClick={() => { setRegError(''); setShowRegModal(true); }}
              >
                {isFull ? 'Workshop is Full' : workshop.status !== 'SCHEDULED' ? 'Not Accepting Registrations' : 'Register Attendee'}
              </button>
            )}

            {workshop.cancelReason && (
              <div className="alert alert-error" style={{ marginTop: '16px' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>Cancelled</div>
                  <div style={{ fontSize: '0.8125rem' }}>{workshop.cancelReason}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Registrations List */}
      <h2 style={{ fontSize: '1.25rem', marginTop: '32px', marginBottom: '16px' }}>Registration History</h2>
      
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Attendee</th>
              <th>Status</th>
              <th>Registered By</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {workshop.registrations?.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  No registrations yet
                </td>
              </tr>
            )}
            {workshop.registrations?.map((r) => (
              <tr key={r.id}>
                <td>
                  <div style={{ fontWeight: 500 }}>{r.attendeeName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.attendeeEmail}</div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {r.status === 'ACTIVE' ? (
                      <><CheckCircle2 size={14} color="var(--color-success)" /> <span style={{ color: 'var(--color-success)', fontWeight: 500 }}>Active</span></>
                    ) : (
                      <><XCircle size={14} color="var(--color-danger)" /> <span style={{ color: 'var(--text-muted)' }}>Cancelled</span></>
                    )}
                  </div>
                </td>
                <td>
                  <div style={{ fontSize: '0.875rem' }}>{r.registeredBy?.name || 'System'}</div>
                </td>
                <td>
                  <div style={{ fontSize: '0.875rem' }}>{format(new Date(r.registeredAt), 'MMM d, h:mm a')}</div>
                </td>
                <td>
                  {r.status === 'ACTIVE' && hasRole('MANAGER', 'STAFF') && (
                    <button 
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--color-danger)' }}
                      onClick={() => setShowCancelModal(r.id)}
                    >
                      Cancel Seat
                    </button>
                  )}
                  {r.status === 'CANCELLED' && r.cancelledBy && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      By {r.cancelledBy.name}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Registration Modal */}
      {showRegModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Register Attendee</h2>
              <button className="btn btn-ghost" onClick={() => setShowRegModal(false)}><XCircle size={20} /></button>
            </div>
            
            {regError && <div className="alert alert-error" style={{ marginBottom: '20px' }}>{regError}</div>}
            
            <form onSubmit={handleSubmit(onRegisterSubmit)}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Attendee Name</label>
                <input className="form-input" placeholder="e.g. John Smith" {...register('attendeeName')} autoFocus />
                {errors.attendeeName && <span className="form-error">{errors.attendeeName.message}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input className="form-input" type="email" placeholder="john@example.com" {...register('attendeeEmail')} />
                {errors.attendeeEmail && <span className="form-error">{errors.attendeeEmail.message}</span>}
              </div>
              
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowRegModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting || registerMutation.isPending}>
                  {(isSubmitting || registerMutation.isPending) ? <Loader2 className="loading-spinner" style={{ width: 16, height: 16 }} /> : 'Confirm Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {showCancelModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Cancel Registration</h2>
            </div>
            <div style={{ display: 'flex', gap: '12px', color: 'var(--color-warning)', background: 'var(--color-warning-bg)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
              <AlertCircle size={24} style={{ flexShrink: 0 }} />
              <p style={{ fontSize: '0.875rem', lineHeight: 1.5, color: 'var(--text-primary)' }}>
                Are you sure you want to cancel this registration? The seat will immediately become available for others. The record will be kept for history.
              </p>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowCancelModal(null)}>Go Back</button>
              <button 
                className="btn btn-danger"
                disabled={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate(showCancelModal)}
              >
                {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Registration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
