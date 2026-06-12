import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api`

export default function Admin() {
  const { currentUser, token } = useAuth()
  const [users, setUsers] = useState([])
  const [logs, setLogs] = useState([])
  const [observations, setObservations] = useState([])
  const [tableSummary, setTableSummary] = useState([])
  const [openTable, setOpenTable] = useState(null)
  const [tableRows, setTableRows] = useState({})
  const [error, setError] = useState('')
  const [generatorMsg, setGeneratorMsg] = useState('')

  const adminHeaders = token ? { Authorization: `Bearer ${token}` } : {}

  const loadAll = async () => {
    try {
      const [u, l, o, t] = await Promise.all([
        fetch(`${API_BASE}/users`).then(r => r.ok ? r.json() : []),
        fetch(`${API_BASE}/logs?pageSize=50`, { headers: adminHeaders }).then(r => r.ok ? r.json() : { items: [] }),
        fetch(`${API_BASE}/observations`, { headers: adminHeaders }).then(r => r.ok ? r.json() : { items: [] }),
        fetch(`${API_BASE}/db/tables`, { headers: adminHeaders }).then(r => r.ok ? r.json() : { tables: [] }),
      ])
      setUsers(u)
      setLogs(l.items || [])
      setObservations(o.items || [])
      setTableSummary(t.tables || [])
    } catch (e) {
      setError(e.message)
    }
  }

  const loadTableRows = async (name) => {
    if (openTable === name) {
      setOpenTable(null)
      return
    }
    setOpenTable(name)
    if (!tableRows[name]) {
      const res = await fetch(`${API_BASE}/db/tables/${name}?limit=200`, { headers: adminHeaders })
      if (res.ok) {
        const data = await res.json()
        setTableRows(prev => ({ ...prev, [name]: data.items }))
      }
    }
  }

  useEffect(() => {
    loadAll()
    const t = setInterval(loadAll, 5000)
    return () => clearInterval(t)
  }, [currentUser?.id])

  const resolveObservation = async (id) => {
    await fetch(`${API_BASE}/observations/${id}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...adminHeaders },
    })
    await loadAll()
  }

  const callGenerator = async (action) => {
    setGeneratorMsg('')
    try {
      const res = await fetch(`${API_BASE}/generator/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser?.id || '',
        },
        body: JSON.stringify({}),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setGeneratorMsg(`Error: ${data.error || res.statusText}`)
      } else {
        setGeneratorMsg(`Generator ${action}: ok`)
      }
    } catch (e) {
      setGeneratorMsg(`Network error: ${e.message}`)
    }
  }

  const adminCount = users.filter(u => u.role?.name === 'admin').length
  const userCount = users.filter(u => u.role?.name === 'user').length

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 8 }}>Admin Dashboard</h1>
      <div style={{ color: '#888', marginBottom: 24 }}>
        Logged in as <strong>{currentUser?.username}</strong> · role <strong>{currentUser?.role?.name}</strong>
      </div>

      {error && <div className="auth-error" style={{ marginBottom: 16 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <div style={statBox}>
          <div style={statLabel}>Total users</div>
          <div style={statValue}>{users.length}</div>
        </div>
        <div style={statBox}>
          <div style={statLabel}>Admins</div>
          <div style={statValue}>{adminCount}</div>
        </div>
        <div style={statBox}>
          <div style={statLabel}>Normal users</div>
          <div style={statValue}>{userCount}</div>
        </div>
      </div>

      <h2 style={{ marginTop: 24 }}>Generator control</h2>
      <p style={{ color: '#888', marginBottom: 12 }}>Requires <code>generator:control</code> permission.</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary" onClick={() => callGenerator('start')}>Start</button>
        <button className="btn btn-ghost" onClick={() => callGenerator('stop')}>Stop</button>
      </div>
      {generatorMsg && <div style={{ marginTop: 12, color: generatorMsg.startsWith('Error') ? '#e55' : '#5c5' }}>{generatorMsg}</div>}

      <h2 style={{ marginTop: 32 }}>Users</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #333', textAlign: 'left' }}>
            <th style={cellStyle}>Username</th>
            <th style={cellStyle}>Email</th>
            <th style={cellStyle}>Role</th>
            <th style={cellStyle}>Permissions</th>
            <th style={cellStyle}>Joined</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} style={{ borderBottom: '1px solid #222' }}>
              <td style={cellStyle}>{u.username}</td>
              <td style={cellStyle}>{u.email}</td>
              <td style={cellStyle}>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: u.role?.name === 'admin' ? '#5c2' : '#37a',
                  color: '#fff',
                  fontSize: 12,
                }}>
                  {u.role?.name || '—'}
                </span>
              </td>
              <td style={{ ...cellStyle, fontSize: 12, color: '#aaa' }}>
                {(u.permissions || []).join(', ') || '—'}
              </td>
              <td style={cellStyle}>{u.joinedAt?.slice(0, 10)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ marginTop: 32 }}>Observation List</h2>
      <p style={{ color: '#888', marginBottom: 12 }}>
        Users flagged by the anomaly detector for unusual activity rates.
      </p>
      {observations.length === 0 ? (
        <div style={{ color: '#666', padding: 12, fontStyle: 'italic' }}>No observations.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #333', textAlign: 'left' }}>
              <th style={cellStyle}>User</th>
              <th style={cellStyle}>Reason</th>
              <th style={cellStyle}>Window count</th>
              <th style={cellStyle}>Flagged at</th>
              <th style={cellStyle}>Status</th>
              <th style={cellStyle}></th>
            </tr>
          </thead>
          <tbody>
            {observations.map(o => (
              <tr key={o.id} style={{ borderBottom: '1px solid #222', background: o.resolved ? 'transparent' : 'rgba(229,82,82,0.08)' }}>
                <td style={cellStyle}>{o.user?.username || o.userId}</td>
                <td style={{ ...cellStyle, fontSize: 13 }}>{o.reason}</td>
                <td style={cellStyle}>{o.windowCount}</td>
                <td style={cellStyle}>{o.flaggedAt?.slice(0, 19).replace('T', ' ')}</td>
                <td style={cellStyle}>
                  <span style={{ color: o.resolved ? '#5c5' : '#e55', fontWeight: 'bold' }}>
                    {o.resolved ? 'resolved' : 'open'}
                  </span>
                </td>
                <td style={cellStyle}>
                  {!o.resolved && (
                    <button className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 8px' }} onClick={() => resolveObservation(o.id)}>
                      Resolve
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 style={{ marginTop: 32 }}>Database Inspector</h2>
      <p style={{ color: '#888', marginBottom: 12 }}>
        Live view of every SQL table in the database. Click a table to expand the rows.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {tableSummary.map(t => (
          <button
            key={t.name}
            className="btn btn-ghost"
            onClick={() => loadTableRows(t.name)}
            style={{
              padding: '6px 12px',
              fontFamily: 'monospace',
              background: openTable === t.name ? '#37a' : 'transparent',
              color: openTable === t.name ? '#fff' : 'inherit',
            }}
          >
            {t.name} <span style={{ color: '#888', marginLeft: 6 }}>({t.count})</span>
          </button>
        ))}
      </div>
      {openTable && tableRows[openTable] && (
        <div style={{ maxHeight: 400, overflow: 'auto', border: '1px solid #333', borderRadius: 8, marginBottom: 24 }}>
          {tableRows[openTable].length === 0 ? (
            <div style={{ padding: 16, color: '#888', fontStyle: 'italic' }}>(table is empty)</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'monospace' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#1a1a1a' }}>
                <tr style={{ borderBottom: '1px solid #333', textAlign: 'left' }}>
                  {Object.keys(tableRows[openTable][0]).map(col => (
                    <th key={col} style={cellStyle}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows[openTable].map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #222' }}>
                    {Object.keys(tableRows[openTable][0]).map(col => (
                      <td key={col} style={{ ...cellStyle, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={String(row[col] ?? '')}>
                        {row[col] === null ? <span style={{ color: '#666' }}>null</span> :
                         typeof row[col] === 'boolean' ? String(row[col]) :
                         String(row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <h2 style={{ marginTop: 32 }}>Action Log</h2>
      <p style={{ color: '#888', marginBottom: 12 }}>Most recent actions performed by logged-in users.</p>
      <div style={{ maxHeight: 400, overflow: 'auto', border: '1px solid #333', borderRadius: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead style={{ position: 'sticky', top: 0, background: '#1a1a1a' }}>
            <tr style={{ borderBottom: '1px solid #333', textAlign: 'left' }}>
              <th style={cellStyle}>Timestamp</th>
              <th style={cellStyle}>User ID</th>
              <th style={cellStyle}>Role</th>
              <th style={cellStyle}>Action</th>
              <th style={cellStyle}>Target</th>
              <th style={cellStyle}>Status</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(l => (
              <tr key={l.id} style={{ borderBottom: '1px solid #222' }}>
                <td style={cellStyle}>{l.timestamp?.slice(11, 19)}</td>
                <td style={{ ...cellStyle, fontFamily: 'monospace', fontSize: 11 }}>{l.userId.slice(0, 12)}</td>
                <td style={cellStyle}>{l.roleName}</td>
                <td style={{ ...cellStyle, fontFamily: 'monospace' }}>{l.action}</td>
                <td style={{ ...cellStyle, fontFamily: 'monospace' }}>{l.target || '—'}</td>
                <td style={cellStyle}>{l.statusCode}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const cellStyle = { padding: '8px 12px' }
const statBox = { flex: 1, padding: 16, background: '#1a1a1a', borderRadius: 8, border: '1px solid #333' }
const statLabel = { color: '#888', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }
const statValue = { fontSize: 28, fontWeight: 'bold', marginTop: 4 }
