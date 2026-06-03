import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { PASSWORD_REQUIREMENTS, validateRegister } from '../utils/validators'

const requirements = PASSWORD_REQUIREMENTS

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [showReqs, setShowReqs] = useState(false)

  const update = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const handleSubmit = async () => {
    const e = validateRegister(form)
    if (Object.keys(e).length > 0) { setErrors(e); return }
    const result = await register(form.username, form.email, form.password)
    if (!result.success) { setServerError(result.error); return }
    navigate('/library')
  }

  const allMet = requirements.every(r => r.test(form.password))

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <div className="auth-card">
        <div className="auth-brand">GameLog</div>
        <div className="auth-subtitle">Create your account</div>

        {serverError && <div className="auth-error">{serverError}</div>}

        <div className="form-group">
          <label className="form-label">Username</label>
          <input
            className={`input ${errors.username ? 'input-error' : ''}`}
            placeholder="Username"
            value={form.username}
            onChange={e => update('username', e.target.value)}
          />
          {errors.username && <div className="form-error">{errors.username}</div>}
        </div>

        <div className="form-group">
          <label className="form-label">Email</label>
          <input
            className={`input ${errors.email ? 'input-error' : ''}`}
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={e => update('email', e.target.value)}
          />
          {errors.email && <div className="form-error">{errors.email}</div>}
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            className={`input ${errors.password ? 'input-error' : ''}`}
            placeholder="Password"
            type="password"
            value={form.password}
            onChange={e => update('password', e.target.value)}
            onFocus={() => setShowReqs(true)}
          />
          {errors.password && <div className="form-error">{errors.password}</div>}

          {showReqs && form.password.length > 0 && (
            <div className={`pwd-reqs ${allMet ? 'pwd-reqs-done' : ''}`}>
              {requirements.map((req, i) => (
                <div key={i} className={`pwd-req ${req.test(form.password) ? 'met' : ''}`}>
                  <span className="pwd-req-icon">{req.test(form.password) ? '✓' : '○'}</span>
                  {req.label}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Confirm password</label>
          <input
            className={`input ${errors.confirm ? 'input-error' : ''}`}
            placeholder="Confirm password"
            type="password"
            value={form.confirm}
            onChange={e => update('confirm', e.target.value)}
          />
          {errors.confirm && <div className="form-error">{errors.confirm}</div>}
        </div>

        <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleSubmit}>
          Register
        </button>

        <div className="auth-switch">
          Already have an account? <Link to="/login">Login here</Link>
        </div>
      </div>
    </div>
  )
}
