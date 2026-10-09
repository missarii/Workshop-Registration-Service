import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Shield, Plus, XCircle, Loader2 } from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import type { User } from '../types'
import { getErrorMessage } from '../types'

const userSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters').optional().or(z.literal('')),
  role: z.enum(['ADMIN', 'MANAGER', 'STAFF']),
  active: z.boolean().optional(),
})
type UserFormData = z.infer<typeof userSchema>

export default function UsersPage() {
  const { user: currentUser } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [modal, setModal] = useState<{ mode: 'create' } | { mode: 'edit'; user: User } | null>(null)
  const [formError, setFormError] = useState('')

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data),
  })

  const {
    register: registerField,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({ resolver: zodResolver(userSchema) })

  const openCreate = () => {
    setFormError('')
    reset({ name: '', email: '', password: '', role: 'STAFF', active: true })
    setModal({ mode: 'create' })
  }

  const openEdit = (u: User) => {
    setFormError('')
    reset({ name: u.name, email: u.email, password: '', role: u.role, active: u.active })
    setModal({ mode: 'edit', user: u })
  }

  const saveMutation = useMutation({
    mutationFn: (data: UserFormData): Promise<unknown> => {
      if (modal?.mode === 'edit') {
        const payload: Record<string, unknown> = {
          name: data.name,
          role: data.role,
          active: data.active,
        }
        if (data.password) payload.password = data.password
        return api.patch(`/users/${modal.user.id}`, payload)
      }
      return api.post('/users', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      showToast(modal?.mode === 'edit' ? 'User updated' : 'User created', 'success')
      setModal(null)
      setFormError('')
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  })

  const onSubmit = (data: UserFormData) => {
    setFormError('')
    saveMutation.mutate(data)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">Manage staff accounts and permissions.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} />
          Create User
        </button>
      </div>

      {isLoading ? (
        <div className="loading-page">
          <div className="loading-spinner" />
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="user-avatar" style={{ width: 32, height: 32, fontSize: '0.75rem' }}>
                        {u.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 500 }}>{u.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Shield size={14} color={u.role === 'ADMIN' ? '#f59e0b' : u.role === 'MANAGER' ? '#3b82f6' : '#10b981'} />
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{u.role}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${u.active ? 'badge-success' : 'badge-danger'}`}>
                      {u.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.875rem' }}>
                      {format(new Date(u.createdAt), 'MMM d, yyyy')}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => openEdit(u)}
                      disabled={currentUser?.id === u.id}
                      title={currentUser?.id === u.id ? 'You cannot edit your own account here' : 'Edit user'}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit User Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{modal.mode === 'edit' ? `Edit ${modal.user.name}` : 'Create User'}</h2>
              <button className="btn btn-ghost" onClick={() => setModal(null)}><XCircle size={20} /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {formError && <div className="alert alert-error">{formError}</div>}
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className="form-input" {...registerField('name')} />
                  {errors.name && <span className="form-error">{errors.name.message}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input
                    className="form-input"
                    type="email"
                    disabled={modal.mode === 'edit'}
                    {...registerField('email')}
                  />
                  {errors.email && <span className="form-error">{errors.email.message}</span>}
                </div>
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Role *</label>
                    <select className="form-select" {...registerField('role')}>
                      <option value="ADMIN">ADMIN</option>
                      <option value="MANAGER">MANAGER</option>
                      <option value="STAFF">STAFF</option>
                    </select>
                    {errors.role && <span className="form-error">{errors.role.message}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Password {modal.mode === 'create' ? '*' : '(leave blank to keep)'}</label>
                    <input className="form-input" type="password" autoComplete="new-password" {...registerField('password')} />
                    {errors.password && <span className="form-error">{errors.password.message}</span>}
                  </div>
                </div>
                {modal.mode === 'edit' && (
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        defaultChecked={modal.user.active}
                        onChange={(e) => setValue('active', e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)' }}
                      />
                      <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Account active</span>
                    </label>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting || saveMutation.isPending}>
                  {(isSubmitting || saveMutation.isPending) && <Loader2 size={16} className="spin" />}
                  {modal.mode === 'edit' ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
