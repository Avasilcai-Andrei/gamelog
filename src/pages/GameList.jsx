import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGames } from '../context/GameContext'

const PAGE_SIZE = 12

export default function GameList() {
  const { games } = useGames()
  const navigate = useNavigate()

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

  const genres = ['all', ...new Set(uniqueGames.map(g => g.genre).filter(Boolean))]

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
          <div
            key={game.title}
            className="gamelist-card"
            onClick={() => navigate(`/games/${encodeURIComponent(game.title)}`)}>
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
            </div>
          </div>
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
