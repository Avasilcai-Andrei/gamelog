import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGames } from '../context/GameContext'
import { useAuth } from '../context/AuthContext'
import { ChevronLeft, Clock, Gamepad2, CheckCircle, Trophy } from 'lucide-react'
import TrophyCabinet from '../components/TrophyCabinet'

export default function PlayerProfile() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const { getGamesByUser, getStatsByUser, getUserRating } = useGames()
  const { getUsers, currentUser } = useAuth()

  const users = getUsers()
  const user = users.find(u => u.id === userId)
  const username = user?.username || (userId === currentUser?.id ? currentUser.username : 'Unknown Player')

  const games = getGamesByUser(userId)
  const stats = getStatsByUser(userId)

  const [rating, setRating] = useState(null)
  useEffect(() => {
    let active = true
    getUserRating(userId).then(r => { if (active) setRating(r) })
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const isOwnProfile = userId === currentUser?.id

  return (
    <div className="page">
      <button className="btn btn-ghost"
        style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24, padding: '6px 12px' }}
        onClick={() => navigate('/gamelist')}>
        <ChevronLeft size={16} /> GameList
      </button>

      <div className="profile-header">
        <div className="profile-avatar">{username.slice(0, 2).toUpperCase()}</div>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>
            {username} {isOwnProfile && <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 400 }}>(you)</span>}
          </h1>
          {user?.joinedAt && (
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              Joined {new Date(user.joinedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
          )}
        </div>
      </div>

      {rating && rating.rating > 0 && (
        <div className="profile-rating-card" onClick={() => navigate('/leaderboard')}>
          <Trophy size={26} color="var(--accent-orange)" />
          <div>
            <div className="stat-card-label">Vauntd Rating</div>
            <div className="profile-rating-value">{rating.rating}</div>
          </div>
          {rating.rank && (
            <div className="profile-rating-rank">
              <span className="profile-rating-rankbig">#{rating.rank}</span>
              <span className="stat-card-label">of {rating.total}</span>
            </div>
          )}
        </div>
      )}

      <div className="stat-cards" style={{ marginBottom: 28 }}>
        <div className="stat-card">
          <div>
            <div className="stat-card-label">Total Games</div>
            <div className="stat-card-value">{stats.totalGames}</div>
          </div>
          <Gamepad2 size={28} color="var(--accent-blue)" />
        </div>
        <div className="stat-card">
          <div>
            <div className="stat-card-label">Hours Logged</div>
            <div className="stat-card-value">{stats.totalHours}</div>
          </div>
          <Clock size={28} color="var(--accent-blue)" />
        </div>
        <div className="stat-card">
          <div>
            <div className="stat-card-label">Completion Rate</div>
            <div className="stat-card-value">{stats.completionRate}%</div>
          </div>
          <CheckCircle size={28} color="var(--accent-blue)" />
        </div>
      </div>

      <TrophyCabinet userId={userId} isOwn={isOwnProfile} />

      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Game Library</h2>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 48 }}></th>
              <th>Title</th>
              <th>Genre</th>
              <th>Status</th>
              <th>Hours</th>
            </tr>
          </thead>
          <tbody>
            {games.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
                  No games in library
                </td>
              </tr>
            ) : games.map(game => (
              <tr key={game.id}>
                <td>
                  {game.coverUrl
                    ? <img src={game.coverUrl} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }} onError={e => e.target.style.display='none'} />
                    : <div style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--bg-secondary)' }} />
                  }
                </td>
                <td style={{ fontWeight: 500 }} data-label="Title">{game.title}</td>
                <td style={{ color: 'var(--text-secondary)' }} data-label="Genre">{game.genre}</td>
                <td data-label="Status"><span className={`status-badge status-${game.status}`} style={{ textTransform: 'capitalize' }}>{game.status}</span></td>
                <td data-label="Hours">{game.hours}h</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
