import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api`

export default function AdminLogs() {
  const { token } = useAuth()
  const [logs, setLogs] = useState([])
  const [observations, setObservations] = useState([])
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {}

  useEffect(() => {
    if (!token) return
    fetch(`${API_BASE}/logs?pageSize=100`, { headers: authHeaders })
      .then(r => r.ok ? r.json() : { items: [] })
      .then(d => setLogs(d.items || []))
      .catch(() => {})
    fetch(`${API_BASE}/observations?resolved=false`, { headers: authHeaders })
      .then(r => r.ok ? r.json() : { items: [] })
      .then(d => setObservations(d.items || []))
      .catch(() => {})
  }, [token])

  const resolve = async (id) => {
    await fetch(`${API_BASE}/observations/${id}/resolve`, { method: 'POST', headers: authHeaders })
    setObservations(prev => prev.filter(o => o.id !== id))
  }

  return (
    <div className="page">
      <h1 className="page-title">Audit Logs</h1>
      <div className="card" style={{ marginTop: 16, padding: 0, overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Action</th>
              <th>Status</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr><td colSpan={5} className="table-empty">No logs.</td></tr>
            ) : logs.map(log => (
              <tr key={log.id}>
                <td data-label="User">{log.userId}</td>
                <td data-label="Role">{log.roleName}</td>
                <td data-label="Action">{log.action}</td>
                <td data-label="Status">{log.statusCode}</td>
                <td data-label="Timestamp">{new Date(log.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2 className="gamepage-subtitle">Flagged Users</h2>
        {observations.length === 0 ? (
          <div className="text-muted">No suspicious users.</div>
        ) : (
          <ul>
            {observations.map(o => (
              <li key={o.id} style={{ marginBottom: 8 }}>
                <strong>{o.user?.username || o.userId}</strong> — {o.reason}
                {' '}
                <button className="btn btn-sm" onClick={() => resolve(o.id)}>Resolve</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
