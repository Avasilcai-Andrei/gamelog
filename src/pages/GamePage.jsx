import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGames } from '../context/GameContext'
import { useAuth } from '../context/AuthContext'
import { ChevronLeft, Clock, CheckCircle, Gamepad2, Network, Trophy } from 'lucide-react'

export default function GamePage() {
  const { title } = useParams()
  const navigate = useNavigate()
  const { games, getAchievementRanking } = useGames()
  const { getUsers, currentUser } = useAuth()

  const decodedTitle = decodeURIComponent(title)
  const users = getUsers()

  const [ranking, setRanking] = useState({ totalCount: 0, maxScore: 0, rankings: [] })

  useEffect(() => {
    let active = true
    getAchievementRanking(decodedTitle).then(r => { if (active) setRanking(r) })
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decodedTitle])

  const entries = games.filter(g =>
    g.title.toLowerCase().trim() === decodedTitle.toLowerCase().trim()
  )

  if (entries.length === 0) return (
    <div className="page">
      <button className="btn btn-ghost btn-inline-back"
        onClick={() => navigate('/gamelist')}>
        <ChevronLeft size={16} /> Game List
      </button>
      <p className="text-muted">Game not found.</p>
    </div>
  )

  const representative = entries.find(e => e.coverUrl) || entries[0]

  const getUserName = (userId) => {
    const u = users.find(u => u.id === userId)
    if (u) return u.username
    if (userId === currentUser?.id) return currentUser.username
    if (userId === 'mock_user_1') return 'Player1'
    if (userId === 'mock_user_2') return 'Player2'
    return userId
  }

  // Skill-based ranking: order players by achievement score (Σ rarity weights),
  // not hours. Ties / players with no achievements fall back to hours.
  const scoreByUser = new Map(ranking.rankings.map(r => [r.userId, r]))
  const ranked = [...entries].sort((a, b) => {
    const sa = scoreByUser.get(a.userId)?.score || 0
    const sb = scoreByUser.get(b.userId)?.score || 0
    if (sb !== sa) return sb - sa
    return (b.hours || 0) - (a.hours || 0)
  })

  const totalPlayers = entries.length
  const totalHours = entries.reduce((sum, e) => sum + (e.hours || 0), 0)
  const avgHours = totalPlayers > 0 ? Math.round(totalHours / totalPlayers) : 0
  const avgProgress = entries.filter(e => e.estimatedPlaytime > 0).length > 0
    ? Math.round(
        entries
            .filter(e => e.estimatedPlaytime > 0)
            .reduce((sum, e) => sum + Math.min(100, (e.hours / e.estimatedPlaytime) * 100), 0) /
        entries.filter(e => e.estimatedPlaytime > 0).length
        )
    : 0

  return (
    <div className="page">
      <button className="btn btn-ghost btn-inline-back"
        onClick={() => navigate('/gamelist')}>
        <ChevronLeft size={16} /> Game List
      </button>

      <div className="gamepage-header">
        {representative.coverUrl && (
          <img src={representative.coverUrl} alt={decodedTitle}
            className="gamepage-cover"
            onError={e => e.target.style.display = 'none'} />
        )}
        <div className="gamepage-main">
          <h1 className="gamepage-title">{decodedTitle}</h1>
          <div className="gamepage-genre">
            {representative.genre}
          </div>

          <button
            className="btn btn-primary gamepage-lore-btn"
            onClick={() => navigate(`/games/${encodeURIComponent(decodedTitle)}/lore`)}
          >
            <Network size={14} /> Open Lore Map
          </button>

          <div className="gamepage-stats-grid">
            <div className="gamepage-statbox">
              <Gamepad2 size={18} color="var(--accent-blue)" />
              <div className="gamepage-stat-value">{totalPlayers}</div>
              <div className="gamepage-stat-label">Players</div>
            </div>
            <div className="gamepage-statbox">
              <Clock size={18} color="var(--accent-blue)" />
              <div className="gamepage-stat-value">{totalHours}h</div>
              <div className="gamepage-stat-label">Total Hours</div>
            </div>
            <div className="gamepage-statbox">
              <Clock size={18} color="var(--accent-orange)" />
              <div className="gamepage-stat-value">{avgHours}h</div>
              <div className="gamepage-stat-label">Avg Hours</div>
            </div>
            <div className="gamepage-statbox">
              <CheckCircle size={18} color="var(--accent-green)" />
              <div className="gamepage-stat-value">{avgProgress}%</div>
              <div className="gamepage-stat-label">Avg Progress</div>
            </div>
          </div>
        </div>
      </div>

      <h2 className="gamepage-subtitle">
        <Trophy size={18} /> Skill Rankings
        <span className="gamepage-subtitle-note">ranked by achievement difficulty, not hours</span>
      </h2>
      <div className="card gamepage-table-card">
        <table className="table">
          <thead>
            <tr>
              <th className="col-cover">#</th>
              <th>Player</th>
              <th>Skill Score</th>
              <th>Achievements</th>
              <th>Status</th>
              <th>Hours</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((entry, i) => {
              const username = getUserName(entry.userId)
              const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1
              const stat = scoreByUser.get(entry.userId)
              const score = stat?.score || 0
              const pct = ranking.totalCount > 0
                ? Math.round(((stat?.unlockedCount || 0) / ranking.totalCount) * 100)
                : 0
              return (
                <tr key={entry.userId + entry.id}
                  className="clickable-row"
                  onClick={() => navigate(`/player/${entry.userId}`)}>
                  <td className="gamepage-rank" data-label="#">{medal}</td>
                  <td data-label="Player">
                    <div className="gamepage-player">
                      <div className="gamepage-avatar">
                        {username.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-strong">{username}</span>
                    </div>
                  </td>
                  <td data-label="Skill Score">
                    <span className="gamepage-score">{Math.round(score)}</span>
                    {ranking.maxScore > 0 && (
                      <span className="text-secondary"> / {Math.round(ranking.maxScore)}</span>
                    )}
                  </td>
                  <td data-label="Achievements">
                    {ranking.totalCount > 0 ? (
                      <div className="gamepage-progress-row">
                        <div className="gamepage-progress-track">
                          <div className="gamepage-progress-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-secondary">{stat?.unlockedCount || 0}/{ranking.totalCount}</span>
                      </div>
                    ) : '—'}
                  </td>
                  <td data-label="Status">
                    <span className={`status-badge status-${entry.status} text-capitalize`}>
                      {entry.status}
                    </span>
                  </td>
                  <td className="text-secondary" data-label="Hours">{entry.hours}h</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
