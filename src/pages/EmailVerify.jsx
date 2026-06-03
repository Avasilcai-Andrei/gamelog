import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api`

export default function EmailVerify() {
  const token = new URLSearchParams(window.location.search).get('token') || ''
  const [status, setStatus] = useState('pending')

  useEffect(() => {
    if (!token) { setStatus('error'); return }
    fetch(`${API_BASE}/auth/email-verify/${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(data => setStatus(data.ok ? 'success' : 'error'))
      .catch(() => setStatus('error'))
  }, [token])

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <div className="auth-card">
        <div className="auth-brand">GameLog</div>

        {status === 'pending' && (
          <div className="auth-subtitle">Verifying your email...</div>
        )}

        {status === 'success' && (
          <>
            <div className="auth-subtitle">Email verified!</div>
            <p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
              Your email address has been confirmed.
            </p>
            <Link to="/library" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
              Go to Library
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="auth-error">Verification failed. The link may be invalid or expired.</div>
            <Link to="/login" className="btn btn-ghost" style={{ width: '100%', marginTop: '1rem' }}>
              Back to Login
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
