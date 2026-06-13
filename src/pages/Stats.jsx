import { useState } from 'react'
import { motion } from 'motion/react'
import { useAuth } from '../context/AuthContext'
import { useGames } from '../context/GameContext'
import { useActivity } from '../context/ActivityContext'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts'
import Reveal from '../motion/Reveal'
import CountUp from '../motion/CountUp'
import { fadeUp, staggerContainer } from '../motion/tokens'

const M = motion

const STATUS_COLORS = {
  playing:   '#4caf50',
  backlog:   '#ff9800',
  completed: '#4a90d9',
  dropped:   '#f44336',
}

export default function Stats() {
  const { currentUser } = useAuth()
  const { getStatsByUser, getGamesByUser } = useGames()
  const { getPreference, setPreference, activity, topRoutes } = useActivity()
  const [view, setView] = useState(() => getPreference('stats_view', 'visual'))

  const stats = getStatsByUser(currentUser.id)
  const games = getGamesByUser(currentUser.id)

  const pieData = Object.entries(stats.byStatus)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }))

  const barData = games
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 8)
    .map(g => ({
      name: g.title.length > 15 ? g.title.slice(0, 15) + '…' : g.title,
      hours: g.hours || 0
    }))

  const genreRows = Object.entries(stats.byGenre).map(([genre, data]) => ({
    genre,
    games: data.games,
    totalHours: data.hours,
    avgHours: data.games > 0 ? Math.round(data.hours / data.games) : 0,
    completionRate: Math.round(
      games
        .filter(g => g.genre === genre)
        .reduce((sum, g) => {
          if (!g.estimatedPlaytime || g.estimatedPlaytime <= 0) return sum
          return sum + Math.min(100, (g.hours / g.estimatedPlaytime) * 100)
        }, 0) / (data.games || 1)
    ),
  }))

  const setStatsView = (nextView) => {
    setView(nextView)
    setPreference('stats_view', nextView)
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Stats</h1>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className={`page-btn ${view === 'visual' ? 'active' : ''}`} onClick={() => setStatsView('visual')}>Visual</button>
          <button className={`page-btn ${view === 'table' ? 'active' : ''}`} onClick={() => setStatsView('table')}>Table</button>
        </div>
      </div>

      <M.div className="stat-cards"
        variants={staggerContainer} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}>
        <M.div className="stat-card lift-hover" variants={fadeUp}>
          <div>
            <div className="stat-card-label">Total Games</div>
            <CountUp as="div" className="stat-card-value" value={stats.totalGames} />
          </div>
          <span style={{ fontSize: 28 }}>🎮</span>
        </M.div>
        <M.div className="stat-card lift-hover" variants={fadeUp}>
          <div>
            <div className="stat-card-label">Hours Logged</div>
            <CountUp as="div" className="stat-card-value" value={stats.totalHours} />
          </div>
          <span style={{ fontSize: 28 }}>⏱️</span>
        </M.div>
        <M.div className="stat-card lift-hover" variants={fadeUp}>
          <div>
            <div className="stat-card-label">Completion %</div>
            <CountUp as="div" className="stat-card-value" value={stats.completionRate} format={(n) => `${Math.round(n)}%`} />
          </div>
          <span style={{ fontSize: 28 }}>🏆</span>
        </M.div>
      </M.div>

      {view === 'visual' ? (
        <div className="stats-charts">
          <Reveal className="card">
            <div style={{ fontWeight: 600, marginBottom: 16 }}>Game Status Breakdown</div>
            {pieData.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                    dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}>
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Reveal>

          <Reveal className="card" delay={0.08}>
            <div style={{ fontWeight: 600, marginBottom: 16 }}>Hours Logged per Game</div>
            {barData.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barData} layout="vertical" margin={{ left: 16, right: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={100} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                  <Bar dataKey="hours" fill="var(--accent-blue)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Reveal>
        </div>
      ) : (
        <Reveal className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Genre</th>
                <th>Games</th>
                <th>Total Hours</th>
                <th>Avg Hours</th>
                <th>Completion Rate</th>
              </tr>
            </thead>
            <tbody>
              {genreRows.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No data yet</td>
                </tr>
              ) : genreRows.map(row => (
                <tr key={row.genre}>
                  <td style={{ fontWeight: 500 }} data-label="Genre">{row.genre}</td>
                  <td data-label="Games">{row.games}</td>
                  <td data-label="Total Hours">{row.totalHours}h</td>
                  <td data-label="Avg Hours">{row.avgHours}h</td>
                  <td data-label="Completion Rate">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${row.completionRate}%`, height: '100%', background: 'var(--accent-blue)', borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 32 }}>{row.completionRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>
      )}

      {/* Cookie-based activity tracking — moved here from the old Insights page. */}
      <Reveal className="card" style={{ marginTop: 20 }}>
        <div style={{ fontWeight: 600, marginBottom: 16 }}>Cookie Activity Monitor</div>
        <div className="insights-activity-grid">
          <div className="stat-card">
            <div>
              <div className="stat-card-label">Page Views</div>
              <CountUp as="div" className="stat-card-value" value={activity.totalViews} />
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
      </Reveal>
    </div>
  )
}
