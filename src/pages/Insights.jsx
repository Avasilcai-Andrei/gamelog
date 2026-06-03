import { useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useGames } from '../context/GameContext'
import { useActivity } from '../context/ActivityContext'
import GameForm from '../components/GameForm'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'

const STATUS_COLORS = {
  playing: '#4caf50',
  backlog: '#ff9800',
  completed: '#4a90d9',
  dropped: '#f44336',
}

export default function Insights() {
  const { currentUser } = useAuth()
  const { getGamesByUser, addGame, updateGame, deleteGame } = useGames()
  const { activity, topRoutes } = useActivity()

  const [query, setQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editGame, setEditGame] = useState(null)

  const games = getGamesByUser(currentUser.id)

  const filtered = games.filter(g => g.title.toLowerCase().includes(query.toLowerCase()))

  const pieData = useMemo(() => {
    const counts = {
      playing: filtered.filter(g => g.status === 'playing').length,
      backlog: filtered.filter(g => g.status === 'backlog').length,
      completed: filtered.filter(g => g.status === 'completed').length,
      dropped: filtered.filter(g => g.status === 'dropped').length,
    }

    return Object.entries(counts)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name, value }))
  }, [filtered])

  const barData = useMemo(() => {
    return [...filtered]
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 8)
      .map(game => ({
        name: game.title.length > 14 ? `${game.title.slice(0, 14)}...` : game.title,
        hours: game.hours || 0,
      }))
  }, [filtered])

  const handleAdd = (data) => {
    addGame(currentUser.id, data)
    setShowForm(false)
  }

  const handleEdit = (data) => {
    updateGame(editGame.id, data)
    setEditGame(null)
  }

  return (
    <div className="page">
      <div className="insights-head">
        <h1 className="page-title">Live Insights</h1>
        <div className="insights-head-actions">
          <input className="input" placeholder="Filter games..." value={query} onChange={e => setQuery(e.target.value)} />
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add Game</button>
        </div>
      </div>

      <div className="insights-grid">
        <div className="card insights-table-card">
          <div className="insights-section-title">Tabular View</div>
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Hours</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="table-empty">No games match this filter.</td>
                </tr>
              ) : filtered.map(game => (
                <tr key={game.id}>
                  <td className="text-strong">{game.title}</td>
                  <td><span className={`status-badge status-${game.status} text-capitalize`}>{game.status}</span></td>
                  <td>{game.hours}h</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditGame(game)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteGame(game.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="insights-right-stack">
          <div className="card">
            <div className="insights-section-title">Status Distribution</div>
            {pieData.length === 0 ? (
              <div className="table-empty">No chart data yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={52} outerRadius={80}>
                    {pieData.map(item => <Cell key={item.name} fill={STATUS_COLORS[item.name]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card">
            <div className="insights-section-title">Hours by Game</div>
            {barData.length === 0 ? (
              <div className="table-empty">No chart data yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} layout="vertical" margin={{ left: 16, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={110} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                  <Bar dataKey="hours" fill="var(--accent-blue)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card">
            <div className="insights-section-title">Cookie Activity Monitor</div>
            <div className="insights-activity-grid">
              <div className="stat-card">
                <div>
                  <div className="stat-card-label">Page Views</div>
                  <div className="stat-card-value">{activity.totalViews}</div>
                </div>
              </div>
              <div className="stat-card">
                <div>
                  <div className="stat-card-label">Last Route</div>
                  <div className="stat-card-value" style={{ fontSize: 18 }}>{activity.lastPath}</div>
                </div>
              </div>
            </div>
            <div className="insights-route-list">
              {topRoutes.map(([route, count]) => (
                <div key={route} className="insights-route-row">
                  <span>{route}</span>
                  <span>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showForm && <GameForm onSave={handleAdd} onClose={() => setShowForm(false)} />}
      {editGame && <GameForm initial={editGame} onSave={handleEdit} onClose={() => setEditGame(null)} />}
    </div>
  )
}
