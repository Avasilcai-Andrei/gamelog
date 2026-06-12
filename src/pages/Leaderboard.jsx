import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGames } from '../context/GameContext'
import { useAuth } from '../context/AuthContext'
import { Trophy } from 'lucide-react'
import ChallengeCard from '../components/ChallengeCard'

// Rating → tier label/flair, purely cosmetic.
function tierOf(rating) {
  if (rating >= 1500) return { name: 'Diamond', color: 'var(--accent-blue)' }
  if (rating >= 800) return { name: 'Platinum', color: '#b9c2d0' }
  if (rating >= 400) return { name: 'Gold', color: 'var(--accent-orange)' }
  if (rating >= 150) return { name: 'Silver', color: '#9aa6b2' }
  return { name: 'Bronze', color: '#b08d57' }
}

export default function Leaderboard() {
  const navigate = useNavigate()
  const { getGlobalLeaderboard } = useGames()
  const { currentUser } = useAuth()

  const [board, setBoard] = useState(null)

  useEffect(() => {
    let active = true
    getGlobalLeaderboard().then(b => { if (active) setBoard(b) })
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="page">
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Trophy size={22} color="var(--accent-orange)" /> Leaderboard
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14 }}>
        Vauntd Rating = the combined difficulty of every achievement you've earned, across all games.
        Skill, not hours.
      </p>

      <ChallengeCard />

      {board === null ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          Loading rankings…
        </div>
      ) : board.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          No rated players yet — tick the achievements you've earned on a game's page to get on the board.
        </div>
      ) : (
        <div className="card gamepage-table-card">
          <table className="table">
            <thead>
              <tr>
                <th className="col-cover">#</th>
                <th>Player</th>
                <th>Vauntd Rating</th>
                <th>Tier</th>
                <th>Achievements</th>
                <th>Games</th>
              </tr>
            </thead>
            <tbody>
              {board.map(row => {
                const medal = row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : row.rank
                const tier = tierOf(row.rating)
                const isMe = row.userId === currentUser?.id
                return (
                  <tr key={row.userId}
                    className={`clickable-row ${isMe ? 'leaderboard-me' : ''}`}
                    onClick={() => navigate(`/player/${row.userId}`)}>
                    <td className="gamepage-rank" data-label="#">{medal}</td>
                    <td data-label="Player">
                      <div className="gamepage-player">
                        <div className="gamepage-avatar">{row.username.slice(0, 2).toUpperCase()}</div>
                        <span className="text-strong">{row.username}{isMe && <span className="text-secondary"> (you)</span>}</span>
                      </div>
                    </td>
                    <td data-label="Vauntd Rating"><span className="leaderboard-rating">{row.rating}</span></td>
                    <td data-label="Tier"><span className="leaderboard-tier" style={{ color: tier.color }}>{tier.name}</span></td>
                    <td className="text-secondary" data-label="Achievements">{row.achievementsEarned}</td>
                    <td className="text-secondary" data-label="Games">{row.gamesRanked}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
