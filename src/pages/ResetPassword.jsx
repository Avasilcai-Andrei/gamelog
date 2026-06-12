import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ResetPassword() {
  const { resetPassword } = useAuth()
  const navigate = useNavigate()
  const token = new URLSearchParams(window.location.search).get('token') || ''

  const [form, setForm] = useState({ password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-bg" />
        <div className="auth-card">
          <div className="auth-brand">Vauntd</div>
          <div className="auth-error">Invalid or missing reset token.</div>
          <Link to="/forgot-password" className="btn btn-ghost" style={{ width: '100%', marginTop: '1rem' }}>
            Request a new link
          </Link>
        </div>
      </div>
    )
  }

  const validate = () => {
    const e = {}
    if (!form.password) e.password = 'Password is required'
    else if (form.password.length < 6) e.password = 'Password must be at least 6 characters'
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match'
    return e
  }

  const handleSubmit = async () => {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    const result = await resetPassword(token, form.password)
    if (!result.ok) { setServerError(result.error || 'Reset failed'); return }
    navigate('/login', { state: { message: 'Password updated — please log in.' } })
  }

  const update = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: '' }))
    setServerError('')
  }

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <div className="auth-card">
        <div className="auth-brand">Vauntd</div>
        <div className="auth-subtitle">Choose a new password</div>

        {serverError && <div className="auth-error">{serverError}</div>}

        <div className="form-group">
          <label className="form-label">New password</label>
          <input
            className={`input ${errors.password ? 'input-error' : ''}`}
            type="password"
            placeholder="At least 6 characters"
            value={form.password}
            onChange={e => update('password', e.target.value)}
          />
          {errors.password && <div className="form-error">{errors.password}</div>}
        </div>

        <div className="form-group">
          <label className="form-label">Confirm password</label>
          <input
            className={`input ${errors.confirm ? 'input-error' : ''}`}
            type="password"
            placeholder="Repeat your new password"
            value={form.confirm}
            onChange={e => update('confirm', e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
          {errors.confirm && <div className="form-error">{errors.confirm}</div>}
        </div>

        <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleSubmit}>
          Reset password
        </button>

        <div className="auth-switch">
          <Link to="/login">Back to Login</Link>
        </div>
      </div>
    </div>
  )
}
