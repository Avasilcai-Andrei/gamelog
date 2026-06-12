import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ForgotPassword() {
  const { requestPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async () => {
    if (!email.trim()) { setError('Email is required'); return }
    setError('')
    const result = await requestPasswordReset(email.trim())
    if (result.ok) {
      setSent(true)
    } else {
      setError(result.error || 'Something went wrong')
    }
  }

  if (sent) {
    return (
      <div className="auth-page">
        <div className="auth-bg" />
        <div className="auth-card">
          <div className="auth-brand">Vauntd</div>
          <div className="auth-subtitle">Check your email</div>
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
            If an account with that email exists, a password reset link has been sent.
          </p>
          <Link to="/login" className="btn btn-ghost" style={{ width: '100%' }}>
            Back to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <div className="auth-card">
        <div className="auth-brand">Vauntd</div>
        <div className="auth-subtitle">Reset your password</div>

        {error && <div className="auth-error">{error}</div>}

        <div className="form-group">
          <label className="form-label">Email address</label>
          <input
            className={`input ${error ? 'input-error' : ''}`}
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => { setEmail(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        <button className="btn btn-primary" style={{ width: '100%', marginBottom: '0.5rem' }} onClick={handleSubmit}>
          Send reset link
        </button>

        <div className="auth-switch">
          <Link to="/login">Back to Login</Link>
        </div>
      </div>
    </div>
  )
}
