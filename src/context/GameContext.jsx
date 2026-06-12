import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './AuthContext'

export const GameContext = createContext(null)

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api`
const WS_URL = import.meta.env.VITE_WS_URL ||
  (import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/^http/, 'ws') + '/ws'
    : 'ws://localhost:4000/ws')
const PAGE_SIZE = 100

const request = async (path, init = {}) => {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error || `Request failed: ${response.status}`)
  }

  if (response.status === 204) return null
  return response.json()
}

const createLocalId = (prefix) => `${prefix}_local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

export function GameProvider({ children }) {
  const { currentUser, token } = useAuth()
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {}
  const [games, setGames] = useState([])
  const [sessions, setSessions] = useState([])
  const [offline, setOffline] = useState(!navigator.onLine)
  const [syncing, setSyncing] = useState(false)
  const queueRef = useRef([])
  // Bumped on every successful write. hydrateAll skips its setGames if a write
  // happened during its fetch — prevents stale snapshots from wiping new entries.
  const writeSeq = useRef(0)

  const queueOperation = (op) => {
    queueRef.current.push(op)
  }

  const tryOnline = (onlineOp, offlineOp) => {
    if (offline) {
      offlineOp()
      return
    }

    onlineOp().catch(() => {
      setOffline(true)
      offlineOp()
    })
  }

  const calcGameHoursFromSessions = (allSessions, gameId) => {
    const totalMins = allSessions
      .filter(s => s.gameId === gameId)
      .reduce((sum, s) => sum + (Number(s.duration) || 0), 0)
    return Math.round(totalMins / 60)
  }

  const hydrateAll = async () => {
    const seqBefore = writeSeq.current
    const gamePayload = await request(`/games?page=1&pageSize=${PAGE_SIZE}`, {
      headers: { ...authHeaders },
    })
    if (writeSeq.current !== seqBefore) return  // a write happened during the fetch — bail
    setGames(gamePayload.items)

    const allSessions = []
    for (const game of gamePayload.items) {
      const sessionPayload = await request(`/games/${game.id}/sessions?page=1&pageSize=${PAGE_SIZE}`, {
        headers: { ...authHeaders },
      })
      allSessions.push(...sessionPayload.items)
    }
    if (writeSeq.current !== seqBefore) return
    setSessions(allSessions)
  }

  const flushQueue = async () => {
    if (queueRef.current.length === 0) return

    const pending = [...queueRef.current]
    queueRef.current = []
    for (const op of pending) {
      try {
        await request(op.path, op.init)
      } catch {
        queueRef.current.unshift(op)
        setOffline(true)
        return
      }
    }

    await hydrateAll()
  }

  useEffect(() => {
    const load = async () => {
      if (!currentUser) {
        setGames([])
        setSessions([])
        return
      }

      try {
        await hydrateAll()
        setOffline(false)
      } catch {
        setOffline(true)
      }
    }

    load()
  }, [currentUser?.id])

  useEffect(() => {
    const onOnline = async () => {
      setOffline(false)
      try {
        await flushQueue()
      } catch {
        setOffline(true)
      }
    }

    const onOffline = () => setOffline(true)

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  useEffect(() => {
    if (!offline) return
    const interval = setInterval(async () => {
      try {
        await fetch(`${API_BASE}/health`)
        setOffline(false)
        await flushQueue()
        await hydrateAll()
      } catch {}
    }, 3000)
    return () => clearInterval(interval)
  }, [offline])

  useEffect(() => {
    if (offline) return
    let intentionallyClosed = false
    const ws = new WebSocket(WS_URL)
    ws.onmessage = async (event) => {
      try {
        const payload = JSON.parse(event.data)
        if (payload.type === 'games_generated') {
          await hydrateAll()
        }
      } catch {}
    }
    ws.onerror = () => { if (!intentionallyClosed) setOffline(true) }
    return () => {
      intentionallyClosed = true
      ws.close()
    }
  }, [offline])

  const addGame = (userId, gameData) => {
    const payload = { userId, ...gameData }
    const init = { method: 'POST', body: JSON.stringify(payload), headers: { ...authHeaders } }

    // Offline path — synchronous so callers can read the returned game immediately.
    if (offline) {
      const localGame = { id: createLocalId('g'), userId, ...gameData, addedAt: new Date().toISOString() }
      setGames(prev => [localGame, ...prev])
      queueOperation({ path: '/games', init })
      return localGame
    }

    // Online path — returns a Promise.
    return request('/games', init).then(serverGame => {
      writeSeq.current++
      setGames(prev => prev.some(g => g.id === serverGame.id) ? prev : [serverGame, ...prev])
      return serverGame
    }).catch(() => {
      setOffline(true)
      const localGame = { id: createLocalId('g'), userId, ...gameData, addedAt: new Date().toISOString() }
      setGames(prev => [localGame, ...prev])
      queueOperation({ path: '/games', init })
      return localGame
    })
  }

  const updateGame = (gameId, updates) => {
    writeSeq.current++
    setGames(prev => prev.map(g => (g.id === gameId ? { ...g, ...updates } : g)))

    const queuePatch = () => queueOperation({ path: `/games/${gameId}`, init: { method: 'PATCH', body: JSON.stringify(updates), headers: { ...authHeaders } } })

    if (String(gameId).includes('_local_')) {
      return
    }

    tryOnline(
      async () => request(`/games/${gameId}`, { method: 'PATCH', body: JSON.stringify(updates), headers: { ...authHeaders } }),
      queuePatch
    )
  }

  const deleteGame = (gameId) => {
    writeSeq.current++
    setGames(prev => prev.filter(g => g.id !== gameId))
    setSessions(prev => prev.filter(s => s.gameId !== gameId))

    if (String(gameId).includes('_local_')) {
      return
    }

    tryOnline(
      async () => request(`/games/${gameId}`, { method: 'DELETE', headers: { ...authHeaders } }),
      () => queueOperation({ path: `/games/${gameId}`, init: { method: 'DELETE', headers: { ...authHeaders } } })
    )
  }

  const getGameById = (gameId) => games.find(g => g.id === gameId)

  const getGamesByUser = (userId) => games.filter(g => g.userId === userId)

  const addSession = (userId, gameId, sessionData) => {
    const duration = Number(sessionData.duration) || 0
    const newSession = {
      id: createLocalId('s'),
      userId,
      gameId,
      ...sessionData,
      duration,
    }

    setSessions(prev => {
      const next = [...prev, newSession]
      setGames(prevGames => prevGames.map(g => (g.id === gameId ? { ...g, hours: calcGameHoursFromSessions(next, gameId) } : g)))
      return next
    })

    const payload = { userId, ...sessionData, duration }

    if (String(gameId).includes('_local_')) {
      return newSession
    }

    tryOnline(
      async () => {
        const created = await request(`/games/${gameId}/sessions`, {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: { ...authHeaders },
        })
        setSessions(prev => prev.map(s => (s.id === newSession.id ? created : s)))
        await hydrateAll()
      },
      () => {
        queueOperation({ path: `/games/${gameId}/sessions`, init: { method: 'POST', body: JSON.stringify(payload), headers: { ...authHeaders } } })
      }
    )

    return newSession
  }

  const updateSession = (sessionId, updates) => {
    setSessions(prev => {
      const existing = prev.find(s => s.id === sessionId)
      if (!existing) return prev
      const next = prev.map(s => (s.id === sessionId ? { ...s, ...updates } : s))
      const targetGameId = (updates.gameId || existing.gameId)
      setGames(prevGames => prevGames.map(g => {
        if (g.id !== existing.gameId && g.id !== targetGameId) return g
        return { ...g, hours: calcGameHoursFromSessions(next, g.id) }
      }))
      return next
    })

    if (String(sessionId).includes('_local_')) {
      return
    }

    tryOnline(
      async () => {
        await request(`/sessions/${sessionId}`, { method: 'PATCH', body: JSON.stringify(updates), headers: { ...authHeaders } })
        await hydrateAll()
      },
      () => queueOperation({ path: `/sessions/${sessionId}`, init: { method: 'PATCH', body: JSON.stringify(updates), headers: { ...authHeaders } } })
    )
  }

  const deleteSession = (sessionId) => {
    setSessions(prev => {
      const existing = prev.find(s => s.id === sessionId)
      if (!existing) return prev
      const next = prev.filter(s => s.id !== sessionId)
      setGames(prevGames => prevGames.map(g => (g.id === existing.gameId ? { ...g, hours: calcGameHoursFromSessions(next, existing.gameId) } : g)))
      return next
    })

    if (String(sessionId).includes('_local_')) {
      return
    }

    tryOnline(
      async () => {
        await request(`/sessions/${sessionId}`, { method: 'DELETE', headers: { ...authHeaders } })
        await hydrateAll()
      },
      () => queueOperation({ path: `/sessions/${sessionId}`, init: { method: 'DELETE', headers: { ...authHeaders } } })
    )
  }

  const getSessionsByGame = (gameId) =>
    sessions
      .filter(s => s.gameId === gameId)
      .sort((a, b) => new Date(b.date) - new Date(a.date))

  const getSessionsByUser = (userId) => sessions.filter(s => s.userId === userId)

  const getStatsByUser = (userId) => {
    const userGames = getGamesByUser(userId)
    const totalGames = userGames.length
    const totalHours = userGames.reduce((sum, g) => sum + (g.hours || 0), 0)
    const completed = userGames.filter(g => g.status === 'completed').length
    const completionRate = totalGames > 0 ? Math.round((completed / totalGames) * 100) : 0

    const byStatus = {
      playing: userGames.filter(g => g.status === 'playing').length,
      backlog: userGames.filter(g => g.status === 'backlog').length,
      completed,
      dropped: userGames.filter(g => g.status === 'dropped').length,
    }

    const byGenre = userGames.reduce((acc, g) => {
      if (!acc[g.genre]) acc[g.genre] = { games: 0, hours: 0 }
      acc[g.genre].games += 1
      acc[g.genre].hours += g.hours || 0
      return acc
    }, {})

    return { totalGames, totalHours, completionRate, byStatus, byGenre }
  }

  // --- Achievements (skill ranking) ---
  // Keyed by game title; the server normalizes to lowercase. These hit the
  // network directly (the catalog comes from RAWG), so they return Promises.
  const getAchievementCatalog = (title, rawgId) => {
    const q = rawgId ? `?rawgId=${encodeURIComponent(rawgId)}` : ''
    return request(`/achievements/${encodeURIComponent(title)}${q}`, { headers: { ...authHeaders } })
      .then(r => r.items)
      .catch(() => [])
  }

  const getMyAchievements = (title) =>
    request(`/achievements/${encodeURIComponent(title)}/me`, { headers: { ...authHeaders } })
      .then(r => r.achievementIds)
      .catch(() => [])

  const setMyAchievements = (title, achievementIds) =>
    request(`/achievements/${encodeURIComponent(title)}/me`, {
      method: 'PUT',
      body: JSON.stringify({ achievementIds }),
      headers: { ...authHeaders },
    }).then(r => r.achievementIds)

  const getAchievementRanking = (title) =>
    request(`/achievements/${encodeURIComponent(title)}/ranking`, { headers: { ...authHeaders } })
      .catch(() => ({ totalCount: 0, maxScore: 0, rankings: [] }))

  const getGlobalLeaderboard = () =>
    request('/achievements/leaderboard', { headers: { ...authHeaders } })
      .then(r => r.items)
      .catch(() => [])

  const getUserRating = (userId) =>
    request(`/achievements/rating/${encodeURIComponent(userId)}`, { headers: { ...authHeaders } })
      .catch(() => ({ rating: 0, rank: null, total: 0, achievementsEarned: 0, gamesRanked: 0 }))

  const getLeaderboard = () => {
    const allUserIds = [...new Set(games.map(g => g.userId))]
    return allUserIds
      .map(userId => ({ userId, ...getStatsByUser(userId) }))
      .sort((a, b) => b.totalHours - a.totalHours)
  }

  const value = useMemo(() => ({
    games,
    sessions,
    isOnline: !offline,
    offline,
    syncQueue: queueRef.current,
    syncPending: syncing,
    addGame,
    updateGame,
    deleteGame,
    getGameById,
    getGamesByUser,
    addSession,
    updateSession,
    deleteSession,
    getSessionsByGame,
    getSessionsByUser,
    getStatsByUser,
    getLeaderboard,
    getAchievementCatalog,
    getMyAchievements,
    setMyAchievements,
    getAchievementRanking,
    getGlobalLeaderboard,
    getUserRating,
    refreshFromServer: hydrateAll,
    forceSync: async () => {
      setSyncing(true)
      try {
        await flushQueue()
        await hydrateAll()
      } finally {
        setSyncing(false)
      }
    },
  }), [games, sessions, offline, syncing])

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  return useContext(GameContext)
}

export function useGames() {
  return useContext(GameContext)
}
