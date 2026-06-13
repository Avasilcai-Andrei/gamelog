import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { useGames } from '../context/GameContext'
import { useAuth } from '../context/AuthContext'
import { Trophy } from 'lucide-react'
import { genreOptions } from '../utils/genres'
import { fadeUp, SPRING } from '../motion/tokens'

const M = motion

const PAGE_SIZE = 12

// Card fetches its own skill ranking lazily (only the visible cards mount),
// surfacing the top player so the list doubles as a leaderboard.
function GameCard({ game, users, currentUser, onOpen }) {
  const { getAchievementRanking } = useGames()
  const [top, setTop] = useState(null)

  useEffect(() => {
    let active = true
    getAchievementRanking(game.title).then(r => {
      if (active) setTop(r.rankings?.[0] || null)
    })
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.title])

  const topName = top
    ? (users.find(u => u.id === top.userId)?.username
        || (top.userId === currentUser?.id ? currentUser.username : 'A player'))
    : null

  return (
    <M.div
      className="gamelist-card"
      onClick={onOpen}
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      whileHover={{ y: -4, transition: SPRING }}
    >
      {game.coverUrl ? (
        <img src={game.coverUrl} alt={game.title} className="gamelist-cover"
          onError={e => e.target.style.display = 'none'} />
      ) : (
        <div className="gamelist-cover gamelist-cover-placeholder" />
      )}
      <div className="gamelist-info">
        <div className="gamelist-title">{game.title}</div>
        <div className="gamelist-meta">{game.genre}</div>
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
          🎮 {game.entries.length} player{game.entries.length !== 1 ? 's' : ''}
        </div>
        {top && (
          <div className="gamelist-top">
            <Trophy size={12} /> {topName} · {Math.round(top.score)} pts
          </div>
        )}
      </div>
    </M.div>
  )
}

export default function GameList() {
  const { games } = useGames()
  const { getUsers, currentUser } = useAuth()
  const navigate = useNavigate()
  const users = getUsers()

  const [search, setSearch] = useState('')
  const [filterGenre, setFilterGenre] = useState('all')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const sentinelRef = useRef(null)

  const gameMap = {}
  for (const g of games) {
    const key = g.title.toLowerCase().trim()
    if (!gameMap[key]) {
      gameMap[key] = {
        title: g.title,
        genre: g.genre,
        coverUrl: g.coverUrl,
        entries: [],
      }
    }
    if (g.coverUrl && !gameMap[key].coverUrl) {
      gameMap[key].coverUrl = g.coverUrl
      gameMap[key].genre = g.genre
    }
    gameMap[key].entries.push(g)
  }

  const uniqueGames = Object.values(gameMap)

  const genres = ['all', ...genreOptions(uniqueGames.map(g => g.genre))]

  const filtered = uniqueGames.filter(g => {
    const matchSearch = g.title.toLowerCase().includes(search.toLowerCase())
    const matchGenre = filterGenre === 'all' || g.genre === filterGenre
    return matchSearch && matchGenre
  })

  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [search, filterGenre])

  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount(c => c + PAGE_SIZE)
      }
    }, { rootMargin: '160px' })
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, visibleCount])

  return (
    <div className="page">
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Game List</h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          className="input" style={{ maxWidth: 260 }}
          placeholder="Search games..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="input" style={{ maxWidth: 160 }} value={filterGenre}
          onChange={e => setFilterGenre(e.target.value)}>
          {genres.map(g => <option key={g} value={g}>{g === 'all' ? 'All Genres' : g}</option>)}
        </select>
      </div>

      <div className="gamelist-grid">
        {visible.map(game => (
          <GameCard
            key={game.title}
            game={game}
            users={users}
            currentUser={currentUser}
            onOpen={() => navigate(`/games/${encodeURIComponent(game.title)}`)}
          />
        ))}
        {visible.length === 0 && (
          <div style={{ color: 'var(--text-muted)', gridColumn: '1/-1', textAlign: 'center', padding: 40 }}>
            No games found
          </div>
        )}
      </div>

      <div ref={sentinelRef} style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', padding: '12px 0' }}>
        {hasMore ? 'Loading more...' : (filtered.length > 0 ? 'End of list' : '')}
      </div>
    </div>
  )
}
