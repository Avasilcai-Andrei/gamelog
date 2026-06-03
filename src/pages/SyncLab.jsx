import { useState, useEffect, useRef, useCallback } from 'react'
import { useGame } from '../context/GameContext'

export default function SyncLab() {
  const { games, syncQueue, isOnline, syncPending, forceSync } = useGame()
  const [displayedGames, setDisplayedGames] = useState([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const observerRef = useRef()

  const PAGE_SIZE = 10

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return
    setLoading(true)
    
    const start = (page - 1) * PAGE_SIZE
    const end = start + PAGE_SIZE
    const newGames = games.slice(start, end)
    
    if (newGames.length < PAGE_SIZE) {
      setHasMore(false)
    }
    
    setDisplayedGames(prev => [...prev, ...newGames])
    setPage(prev => prev + 1)
    setLoading(false)
  }, [games, page, loading, hasMore])

  useEffect(() => {
    setDisplayedGames([])
    setPage(1)
    setHasMore(true)
  }, [games.length])

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )
    observerRef.current = observer
    return () => observer.disconnect()
  }, [loadMore, hasMore, loading])

  const lastElementRef = useCallback(node => {
    if (loading) return
    if (observerRef.current) observerRef.current.observe(node)
  }, [loading])

  return (
    <div className="sync-lab">
      <h1>Sync Lab</h1>
      
      <div className="sync-status">
        <div className={`status-indicator ${isOnline ? 'online' : 'offline'}`}>
          {isOnline ? '🟢 Online' : '🔴 Offline'}
        </div>
        <div className="queue-status">
          Pending: {syncQueue.length}
          {syncPending && <span className="syncing"> (Syncing...)</span>}
        </div>
        {!isOnline && syncQueue.length > 0 && (
          <button onClick={forceSync} disabled={syncPending}>
            Sync Now
          </button>
        )}
      </div>

      <div className="infinite-scroll-demo">
        <h2>Infinite Scroll ({displayedGames.length} of {games.length})</h2>
        <div className="game-grid">
          {displayedGames.map((game, index) => (
            <div 
              key={game.id} 
              className="game-card"
              ref={index === displayedGames.length - 1 ? lastElementRef : null}
            >
              <h3>{game.title}</h3>
              <p>{game.genre}</p>
              <span className={`status ${game.status}`}>{game.status}</span>
            </div>
          ))}
        </div>
        {loading && <div className="loading">Loading...</div>}
        {!hasMore && <div className="end-message">No more games</div>}
      </div>
    </div>
  )
}