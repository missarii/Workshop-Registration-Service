import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { GraduationCap, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import api from '../lib/api'
import type { AuthResponse } from '../types'
import { getErrorMessage } from '../types'

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setServerError('')
    try {
      const res = await api.post<AuthResponse>('/auth/login', data)
      login(res.data.accessToken, res.data.user)
      navigate('/')
    } catch (err) {
      setServerError(getErrorMessage(err))
    }
  }

  return (
    <div className="login-page">
      <div className="login-bg-gradient" />

      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">
            <GraduationCap size={28} color="white" />
          </div>
          <h1 className="login-title">Workshop Hub</h1>
          <p className="login-sub">Sign in to your staff account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email address</label>
              <input
                id="email"
                className="form-input"
                type="email"
                autoComplete="email"
                placeholder="you@workshop.local"
                {...register('email')}
              />
              {errors.email && (
                <span className="form-error">{errors.email.message}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  className="form-input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  style={{ paddingRight: '44px' }}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    display: 'flex',
                  }}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {errors.password && (
                <span className="form-error">{errors.password.message}</span>
              )}
            </div>

            {serverError && (
              <div className="alert alert-error">{serverError}</div>
            )}

            <button
              id="login-submit"
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={isSubmitting}
              style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </div>
        </form>

        <div className="divider" />

        <div
          style={{
            background: 'var(--color-surface-2)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            fontSize: '0.8125rem',
          }}
        >
          <div style={{ color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: '0.7rem' }}>
            Demo credentials
          </div>
          {[
            { role: 'Admin', email: 'admin@workshop.local', pw: 'Admin@123456' },
            { role: 'Manager', email: 'manager@workshop.local', pw: 'Manager@123456' },
            { role: 'Staff', email: 'alice@workshop.local', pw: 'Staff@123456' },
          ].map((cred) => (
            <div
              key={cred.role}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '4px 0',
                color: 'var(--text-secondary)',
              }}
            >
              <span style={{ color: 'var(--text-muted)' }}>{cred.role}</span>
              <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{cred.email}</span>
              <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--color-primary-light)' }}>{cred.pw}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
