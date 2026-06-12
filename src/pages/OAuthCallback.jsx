import { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function OAuthCallback() {
  const { loginWithOAuthToken } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    if (token) {
      loginWithOAuthToken(token)
      navigate('/library', { replace: true })
    }
  }, [])

  const params = new URLSearchParams(window.location.search)
  if (!params.get('token')) {
    return (
      <div className="auth-page">
        <div className="auth-bg" />
        <div className="auth-card">
          <div className="auth-brand">Vauntd</div>
          <div className="auth-error">OAuth login failed. No token received.</div>
          <Link to="/login" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
            Back to Login
          </Link>
        </div>
      </div>
    )
  }

  return null
}
