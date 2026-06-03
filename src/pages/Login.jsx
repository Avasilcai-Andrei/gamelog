import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api`

export default function Login() {
  const { login, loginAsGuest } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const locationMessage = location.state?.message || ''

  const [form, setForm] = useState({ username: '', password: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')

  const update = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: '' }))
    setServerError('')
  }

  const validate = () => {
    const e = {}
    if (!form.username.trim()) e.username = 'Username is required'
    if (!form.password) e.password = 'Password is required'
    return e
  }

  const handleSubmit = async () => {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    const result = await login(form.username, form.password)
    if (!result.success) { setServerError(result.error); return }
    navigate('/library')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <div className="auth-card">
        <div className="auth-brand">GameLog</div>
        <div className="auth-subtitle">Welcome back</div>

        {locationMessage && <div style={{ color: 'var(--color-success, green)', textAlign: 'center', marginBottom: '0.75rem' }}>{locationMessage}</div>}
        {serverError && <div className="auth-error">{serverError}</div>}

        <div className="form-group">
          <label className="form-label">Username</label>
          <input
            className={`input ${errors.username ? 'input-error' : ''}`}
            placeholder="Username"
            value={form.username}
            onChange={e => update('username', e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {errors.username && <div className="form-error">{errors.username}</div>}
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            className={`input ${errors.password ? 'input-error' : ''}`}
            placeholder="Password"
            type="password"
            value={form.password}
            onChange={e => update('password', e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {errors.password && <div className="form-error">{errors.password}</div>}
          <div style={{ textAlign: 'right', marginTop: '0.25rem' }}>
            <Link to="/forgot-password" style={{ fontSize: '0.8rem' }}>Forgot password?</Link>
          </div>
        </div>

        <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleSubmit}>
          Login
        </button>

        <button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => { loginAsGuest(); navigate('/library') }}>
          Continue as Guest
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.5rem 0', color: 'var(--color-text-muted)' }}>
          <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--color-border)' }} />
          <span style={{ fontSize: '0.8rem' }}>or</span>
          <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--color-border)' }} />
        </div>

        <button
          className="btn btn-ghost"
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          onClick={() => { window.location.href = `${API_BASE}/auth/google` }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Sign in with Google
        </button>

        <div className="auth-switch">
          Don't have an account? <Link to="/register">Register here</Link>
        </div>
      </div>
    </div>
  )
}