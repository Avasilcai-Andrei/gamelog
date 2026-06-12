import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useGames } from '../context/GameContext'
import { X, Trophy, Clock, Gamepad2, Flame, CheckCircle2 } from 'lucide-react'
import Logo from './Logo'

// "Vauntd Wrapped" — a shareable recap card. Library stats render instantly;
// the skill highlight (hardest achievement earned, total skill score) is fetched
// best-effort from games that have a RAWG-linked achievement catalog.
export default function Wrapped({ onClose }) {
  const { currentUser } = useAuth()
  const { getGamesByUser, getSessionsByUser, getAchievementCatalog, getMyAchievements } = useGames()

  const games = getGamesByUser(currentUser.id)
  const sessions = getSessionsByUser(currentUser.id)

  const stats = useMemo(() => {
    const totalHours = games.reduce((s, g) => s + (g.hours || 0), 0)
    const completed = games.filter(g => g.status === 'completed').length
    const byGenre = {}
    for (const g of games) byGenre[g.genre] = (byGenre[g.genre] || 0) + (g.hours || 0)
    const topGenre = Object.entries(byGenre).sort((a, b) => b[1] - a[1])[0]
    const mostPlayed = [...games].sort((a, b) => (b.hours || 0) - (a.hours || 0))[0]
    return {
      totalGames: games.length,
      totalHours,
      completed,
      completionRate: games.length ? Math.round((completed / games.length) * 100) : 0,
      topGenre: topGenre ? topGenre[0] : '—',
      mostPlayed,
      totalSessions: sessions.length,
    }
  }, [games, sessions])

  // null = still calculating; object once done.
  const [skill, setSkill] = useState(null)

  useEffect(() => {
    let active = true
    const withCatalog = games.filter(g => g.rawgId)
    if (withCatalog.length === 0) { setSkill({ best: null, total: 0, earned: 0 }); return }

    ;(async () => {
      let best = null
      let total = 0
      let earned = 0
      for (const g of withCatalog) {
        const [catalog, mine] = await Promise.all([
          getAchievementCatalog(g.title, g.rawgId),
          getMyAchievements(g.title),
        ])
        const mineSet = new Set(mine)
        for (const a of catalog) {
          if (!mineSet.has(a.id)) continue
          earned += 1
          total += a.weight
          if (!best || a.weight > best.weight) best = { ...a, game: g.title }
        }
      }
      if (active) setSkill({ best, total: Math.round(total), earned })
    })()

    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.id, games.length])

  const empty = stats.totalGames === 0

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="wrapped-card">
        <button className="wrapped-close" onClick={onClose} aria-label="Close"><X size={18} /></button>

        <div className="wrapped-header">
          <Logo size={34} tile />
          <div>
            <div className="wrapped-kicker">Vauntd Wrapped</div>
            <div className="wrapped-user">{currentUser.username}</div>
          </div>
        </div>

        {empty ? (
          <div className="wrapped-empty">
            Add a few games and log some sessions, then come back for your recap. 🎮
          </div>
        ) : (
          <>
            <div className="wrapped-hero">
              <div className="wrapped-hero-num">{stats.totalHours}<span>h</span></div>
              <div className="wrapped-hero-label">logged across {stats.totalGames} game{stats.totalGames !== 1 ? 's' : ''}</div>
            </div>

            <div className="wrapped-grid">
              <div className="wrapped-stat">
                <Gamepad2 size={16} className="wrapped-ic-blue" />
                <div className="wrapped-stat-num">{stats.totalGames}</div>
                <div className="wrapped-stat-lbl">Games tracked</div>
              </div>
              <div className="wrapped-stat">
                <CheckCircle2 size={16} className="wrapped-ic-green" />
                <div className="wrapped-stat-num">{stats.completionRate}%</div>
                <div className="wrapped-stat-lbl">Completion ({stats.completed} done)</div>
              </div>
              <div className="wrapped-stat">
                <Clock size={16} className="wrapped-ic-orange" />
                <div className="wrapped-stat-num">{stats.totalSessions}</div>
                <div className="wrapped-stat-lbl">Sessions logged</div>
              </div>
              <div className="wrapped-stat">
                <Flame size={16} className="wrapped-ic-orange" />
                <div className="wrapped-stat-num wrapped-stat-text">{stats.topGenre}</div>
                <div className="wrapped-stat-lbl">Top genre by hours</div>
              </div>
            </div>

            {stats.mostPlayed && (
              <div className="wrapped-highlight">
                {stats.mostPlayed.coverUrl && (
                  <img src={stats.mostPlayed.coverUrl} alt="" className="wrapped-cover"
                    onError={e => e.target.style.display = 'none'} />
                )}
                <div>
                  <div className="wrapped-highlight-lbl">Most played</div>
                  <div className="wrapped-highlight-title">{stats.mostPlayed.title}</div>
                  <div className="wrapped-highlight-sub">{stats.mostPlayed.hours || 0}h · {stats.mostPlayed.genre}</div>
                </div>
              </div>
            )}

            <div className="wrapped-skill">
              <div className="wrapped-skill-head"><Trophy size={15} /> Skill recap</div>
              {skill === null ? (
                <div className="wrapped-skill-loading">Crunching your achievements…</div>
              ) : skill.earned === 0 ? (
                <div className="wrapped-skill-empty">
                  Tick the achievements you've earned on a game's page to unlock your skill recap.
                </div>
              ) : (
                <>
                  <div className="wrapped-skill-score">
                    <span className="wrapped-skill-num">{skill.total}</span> skill points · {skill.earned} achievements earned
                  </div>
                  {skill.best && (
                    <div className="wrapped-feat">
                      <div className="wrapped-feat-lbl">🏅 Hardest feat</div>
                      <div className="wrapped-feat-name">{skill.best.name}</div>
                      <div className="wrapped-feat-sub">
                        {skill.best.game} · only {skill.best.percent < 100 ? skill.best.percent.toFixed(1) : 100}% of players have it
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}

        <div className="wrapped-footer">Earn the brag. — Vauntd</div>
      </div>
    </div>
  )
}
