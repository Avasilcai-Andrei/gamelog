import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGames } from '../context/GameContext'
import { useAuth } from '../context/AuthContext'
import { ChevronLeft, Clock, CheckCircle, Gamepad2, Network, Trophy, TrendingUp } from 'lucide-react'

export default function GamePage() {
  const { title } = useParams()
  const navigate = useNavigate()
  const { games, getAchievementRanking, getAchievementCatalog, getMyAchievements } = useGames()
  const { getUsers, currentUser } = useAuth()

  const decodedTitle = decodeURIComponent(title)
  const users = getUsers()

  const [ranking, setRanking] = useState({ totalCount: 0, maxScore: 0, rankings: [] })
  const [catalog, setCatalog] = useState([])
  const [myUnlocked, setMyUnlocked] = useState(new Set())

  useEffect(() => {
    let active = true
    getAchievementRanking(decodedTitle).then(r => { if (active) setRanking(r) })
    Promise.all([
      getAchievementCatalog(decodedTitle),
      getMyAchievements(decodedTitle),
    ]).then(([cat, mine]) => {
      if (!active) return
      setCatalog(cat)
      setMyUnlocked(new Set(mine))
    })
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

  // "Climb the ranking": for the viewer, find the player directly above them and
  // the fewest top-value achievements that would close the gap.
  const myId = currentUser?.id
  const ownsGame = entries.some(e => e.userId === myId)
  const sortedRanks = ranking.rankings
  const myIdx = sortedRanks.findIndex(r => r.userId === myId)
  const myScore = myIdx >= 0 ? sortedRanks[myIdx].score : 0
  const rival = myIdx > 0
    ? sortedRanks[myIdx - 1]
    : (myIdx === -1 && sortedRanks.length > 0 ? sortedRanks[sortedRanks.length - 1] : null)
  const gap = rival ? rival.score - myScore : 0
  const unearned = catalog.filter(a => !myUnlocked.has(a.id)).sort((a, b) => b.weight - a.weight)

  const chasePicks = []
  let chaseAcc = 0
  if (rival && gap > 0) {
    for (const a of unearned) {
      chasePicks.push(a)
      chaseAcc += a.weight
      if (chaseAcc > gap) break
    }
  }
  const overtakes = chaseAcc > gap

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

      {ownsGame && catalog.length > 0 && (
        <div className="climb-card">
          <div className="climb-head"><TrendingUp size={16} /> Climb the ranking</div>
          {unearned.length === 0 ? (
            <div className="climb-msg">🏆 You've earned every achievement on this game. Untouchable.</div>
          ) : myIdx === 0 ? (
            <div className="climb-msg">👑 You're #1 here — defend your crown. Hardest one still open: <strong>{unearned[0].name}</strong> (+{unearned[0].weight}).</div>
          ) : rival && overtakes ? (
            <>
              <div className="climb-msg">
                Overtake <strong>{getUserName(rival.userId)}</strong> (you need <strong>+{Math.round(gap + 0.5)}</strong>) by earning:
              </div>
              <div className="climb-picks">
                {chasePicks.map(a => (
                  <div key={a.id} className="climb-pick">
                    <span className="climb-pick-name">{a.name}</span>
                    <span className="climb-pick-sub">{a.percent < 100 ? a.percent.toFixed(1) : 100}% have it</span>
                    <span className="climb-pts">+{a.weight}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="climb-msg">Earn more achievements to climb — every rare one moves you up.</div>
          )}
        </div>
      )}

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
