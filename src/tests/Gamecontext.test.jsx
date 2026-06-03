import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { GameProvider, useGames } from '../context/GameContext'
import { AuthProvider } from '../context/AuthContext'

const wrapper = ({ children }) => (
  <AuthProvider>
    <GameProvider>{children}</GameProvider>
  </AuthProvider>
)

import React from 'react'

const jsonResponse = (status, data) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => data,
})

beforeEach(() => {
  localStorage.clear()
  // Start offline so addGame returns localGame synchronously (no async fetch needed).
  Object.defineProperty(navigator, 'onLine', { value: false, configurable: true, writable: true })
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
})

afterEach(() => {
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true })
  vi.restoreAllMocks()
})

describe('GameContext - Game CRUD', () => {
  it('addGame adds a game to the list', () => {
    const { result } = renderHook(() => useGames(), { wrapper })

    act(() => {
      result.current.addGame('user1', {
        title: 'Test Game',
        genre: 'RPG',
        status: 'playing',
        hours: 10,
        estimatedPlaytime: 50,
        coverUrl: '',
      })
    })

    const games = result.current.getGamesByUser('user1')
    expect(games.length).toBeGreaterThan(0)
    expect(games.some(g => g.title === 'Test Game')).toBe(true)
  })

  it('addGame sets correct userId and fields', () => {
    const { result } = renderHook(() => useGames(), { wrapper })

    act(() => {
      result.current.addGame('user42', {
        title: 'My Game',
        genre: 'FPS',
        status: 'backlog',
        hours: 0,
        estimatedPlaytime: 20,
        coverUrl: '',
      })
    })

    const games = result.current.getGamesByUser('user42')
    const game = games.find(g => g.title === 'My Game')
    expect(game).toBeDefined()
    expect(game.genre).toBe('FPS')
    expect(game.status).toBe('backlog')
    expect(game.userId).toBe('user42')
  })

  it('updateGame updates the correct fields', () => {
    const { result } = renderHook(() => useGames(), { wrapper })
    let gameId

    act(() => {
      const g = result.current.addGame('user1', {
        title: 'Old Title',
        genre: 'RPG',
        status: 'backlog',
        hours: 5,
        estimatedPlaytime: 30,
        coverUrl: '',
      })
      gameId = g.id
    })

    act(() => {
      result.current.updateGame(gameId, { title: 'New Title', status: 'playing' })
    })

    const updated = result.current.getGameById(gameId)
    expect(updated.title).toBe('New Title')
    expect(updated.status).toBe('playing')
    expect(updated.genre).toBe('RPG')
  })

  it('deleteGame removes the game', () => {
    const { result } = renderHook(() => useGames(), { wrapper })
    let gameId

    act(() => {
      const g = result.current.addGame('user1', {
        title: 'To Delete',
        genre: 'Indie',
        status: 'dropped',
        hours: 2,
        estimatedPlaytime: 10,
        coverUrl: '',
      })
      gameId = g.id
    })

    act(() => {
      result.current.deleteGame(gameId)
    })

    expect(result.current.getGameById(gameId)).toBeUndefined()
  })

  it('deleteGame also removes sessions for that game', () => {
    const { result } = renderHook(() => useGames(), { wrapper })
    let gameId

    act(() => {
      const g = result.current.addGame('user1', {
        title: 'Game With Sessions',
        genre: 'RPG',
        status: 'playing',
        hours: 0,
        estimatedPlaytime: 40,
        coverUrl: '',
      })
      gameId = g.id
    })

    act(() => {
      result.current.addSession('user1', gameId, {
        date: '2024-03-01',
        duration: 60,
        notes: 'First session',
      })
    })

    act(() => {
      result.current.deleteGame(gameId)
    })

    expect(result.current.getSessionsByGame(gameId).length).toBe(0)
  })

  it('getGamesByUser only returns games for that user', () => {
    const { result } = renderHook(() => useGames(), { wrapper })

    act(() => {
      result.current.addGame('userA', { title: 'Game A', genre: 'RPG', status: 'playing', hours: 5, estimatedPlaytime: 20, coverUrl: '' })
      result.current.addGame('userB', { title: 'Game B', genre: 'FPS', status: 'backlog', hours: 0, estimatedPlaytime: 10, coverUrl: '' })
    })

    const userAGames = result.current.getGamesByUser('userA')
    expect(userAGames.every(g => g.userId === 'userA')).toBe(true)
    expect(userAGames.some(g => g.title === 'Game A')).toBe(true)
    expect(userAGames.some(g => g.title === 'Game B')).toBe(false)
  })
})

describe('GameContext - Session CRUD', () => {
  it('addSession adds a session to the game', () => {
    const { result } = renderHook(() => useGames(), { wrapper })
    let gameId

    act(() => {
      const g = result.current.addGame('user1', {
        title: 'RPG Game',
        genre: 'RPG',
        status: 'playing',
        hours: 0,
        estimatedPlaytime: 50,
        coverUrl: '',
      })
      gameId = g.id
    })

    act(() => {
      result.current.addSession('user1', gameId, {
        date: '2024-03-10',
        duration: 90,
        notes: 'Great session',
      })
    })

    const sessions = result.current.getSessionsByGame(gameId)
    expect(sessions.length).toBe(1)
    expect(sessions[0].notes).toBe('Great session')
    expect(sessions[0].duration).toBe(90)
  })

  it('addSession updates game hours', () => {
    const { result } = renderHook(() => useGames(), { wrapper })
    let gameId

    act(() => {
      const g = result.current.addGame('user1', {
        title: 'Hours Test',
        genre: 'RPG',
        status: 'playing',
        hours: 0,
        estimatedPlaytime: 50,
        coverUrl: '',
      })
      gameId = g.id
    })

    act(() => {
      result.current.addSession('user1', gameId, {
        date: '2024-03-10',
        duration: 120,
        notes: 'Two hour session',
      })
    })

    const game = result.current.getGameById(gameId)
    expect(game.hours).toBe(2)
  })

  it('addSession accumulates hours across multiple sessions', () => {
    const { result } = renderHook(() => useGames(), { wrapper })
    let gameId

    act(() => {
      const g = result.current.addGame('user1', {
        title: 'Accumulator',
        genre: 'RPG',
        status: 'playing',
        hours: 0,
        estimatedPlaytime: 30,
        coverUrl: '',
      })
      gameId = g.id
    })

    act(() => {
      result.current.addSession('user1', gameId, {
        date: '2024-03-01',
        duration: 30,
        notes: 'Half hour',
      })
      result.current.addSession('user1', gameId, {
        date: '2024-03-02',
        duration: 90,
        notes: 'Hour and a half',
      })
    })

    const game = result.current.getGameById(gameId)
    expect(game.hours).toBe(2)
  })

  it('updateSession updates session fields', () => {
    const { result } = renderHook(() => useGames(), { wrapper })
    let gameId, sessionId

    act(() => {
      const g = result.current.addGame('user1', {
        title: 'Game', genre: 'RPG', status: 'playing', hours: 0, estimatedPlaytime: 20, coverUrl: '',
      })
      gameId = g.id
    })

    act(() => {
      const s = result.current.addSession('user1', gameId, {
        date: '2024-03-01', duration: 60, notes: 'Original notes',
      })
      sessionId = s.id
    })

    act(() => {
      result.current.updateSession(sessionId, { notes: 'Updated notes' })
    })

    const sessions = result.current.getSessionsByGame(gameId)
    const updated = sessions.find(s => s.id === sessionId)
    expect(updated.notes).toBe('Updated notes')
  })

  it('updateSession recalculates game hours when duration changes', () => {
    const { result } = renderHook(() => useGames(), { wrapper })
    let gameId
    let sessionId

    act(() => {
      const g = result.current.addGame('user1', {
        title: 'Duration Update',
        genre: 'RPG',
        status: 'playing',
        hours: 0,
        estimatedPlaytime: 20,
        coverUrl: '',
      })
      gameId = g.id
    })

    act(() => {
      const s = result.current.addSession('user1', gameId, {
        date: '2024-03-01',
        duration: 60,
        notes: 'One hour',
      })
      sessionId = s.id
    })

    act(() => {
      result.current.updateSession(sessionId, { duration: 150 })
    })

    const game = result.current.getGameById(gameId)
    expect(game.hours).toBe(3)
  })

  it('updateSession moving games updates hours for both games', () => {
    const { result } = renderHook(() => useGames(), { wrapper })
    let gameAId
    let gameBId
    let sessionId

    act(() => {
      const gameA = result.current.addGame('user1', {
        title: 'Game A', genre: 'RPG', status: 'playing', hours: 0, estimatedPlaytime: 20, coverUrl: '',
      })
      const gameB = result.current.addGame('user1', {
        title: 'Game B', genre: 'FPS', status: 'backlog', hours: 0, estimatedPlaytime: 20, coverUrl: '',
      })
      gameAId = gameA.id
      gameBId = gameB.id
    })

    act(() => {
      const s = result.current.addSession('user1', gameAId, {
        date: '2024-03-03', duration: 120, notes: 'Two hours',
      })
      sessionId = s.id
    })

    act(() => {
      result.current.updateSession(sessionId, { gameId: gameBId })
    })

    expect(result.current.getGameById(gameAId).hours).toBe(0)
    expect(result.current.getGameById(gameBId).hours).toBe(2)
  })

  it('deleteSession removes the session', () => {
    const { result } = renderHook(() => useGames(), { wrapper })
    let gameId, sessionId

    act(() => {
      const g = result.current.addGame('user1', {
        title: 'Game', genre: 'RPG', status: 'playing', hours: 0, estimatedPlaytime: 20, coverUrl: '',
      })
      gameId = g.id
    })

    act(() => {
      const s = result.current.addSession('user1', gameId, {
        date: '2024-03-01', duration: 60, notes: 'To delete',
      })
      sessionId = s.id
    })

    act(() => {
      result.current.deleteSession(sessionId)
    })

    expect(result.current.getSessionsByGame(gameId).length).toBe(0)
  })

  it('deleteSession reduces game hours', () => {
    const { result } = renderHook(() => useGames(), { wrapper })
    let gameId, sessionId

    act(() => {
      const g = result.current.addGame('user1', {
        title: 'Hours Game', genre: 'RPG', status: 'playing', hours: 0, estimatedPlaytime: 50, coverUrl: '',
      })
      gameId = g.id
    })

    act(() => {
      const s = result.current.addSession('user1', gameId, {
        date: '2024-03-01', duration: 120, notes: 'Two hours',
      })
      sessionId = s.id
    })

    act(() => {
      result.current.deleteSession(sessionId)
    })

    const game = result.current.getGameById(gameId)
    expect(game.hours).toBe(0)
  })

  it('getSessionsByGame returns sessions sorted by date descending', () => {
    const { result } = renderHook(() => useGames(), { wrapper })
    let gameId

    act(() => {
      const g = result.current.addGame('user1', {
        title: 'Sorted Sessions', genre: 'RPG', status: 'playing', hours: 0, estimatedPlaytime: 20, coverUrl: '',
      })
      gameId = g.id
    })

    act(() => {
      result.current.addSession('user1', gameId, {
        date: '2024-03-01', duration: 30, notes: 'Oldest',
      })
      result.current.addSession('user1', gameId, {
        date: '2024-03-10', duration: 30, notes: 'Newest',
      })
      result.current.addSession('user1', gameId, {
        date: '2024-03-05', duration: 30, notes: 'Middle',
      })
    })

    const sessions = result.current.getSessionsByGame(gameId)
    expect(sessions.map(s => s.notes)).toEqual(['Newest', 'Middle', 'Oldest'])
  })
})

describe('GameContext - Stats', () => {
  it('getStatsByUser returns correct totals', () => {
    const { result } = renderHook(() => useGames(), { wrapper })

    act(() => {
      result.current.addGame('statUser', { title: 'Game 1', genre: 'RPG', status: 'completed', hours: 20, estimatedPlaytime: 20, coverUrl: '' })
      result.current.addGame('statUser', { title: 'Game 2', genre: 'RPG', status: 'playing', hours: 10, estimatedPlaytime: 40, coverUrl: '' })
    })

    const stats = result.current.getStatsByUser('statUser')
    expect(stats.totalGames).toBe(2)
    expect(stats.totalHours).toBe(30)
    expect(stats.completionRate).toBe(50)
  })

  it('getStatsByUser returns status and genre breakdown', () => {
    const { result } = renderHook(() => useGames(), { wrapper })

    act(() => {
      result.current.addGame('breakdownUser', { title: 'RPG Done', genre: 'RPG', status: 'completed', hours: 12, estimatedPlaytime: 20, coverUrl: '' })
      result.current.addGame('breakdownUser', { title: 'RPG Play', genre: 'RPG', status: 'playing', hours: 6, estimatedPlaytime: 30, coverUrl: '' })
      result.current.addGame('breakdownUser', { title: 'FPS Backlog', genre: 'FPS', status: 'backlog', hours: 0, estimatedPlaytime: 15, coverUrl: '' })
      result.current.addGame('breakdownUser', { title: 'Indie Drop', genre: 'Indie', status: 'dropped', hours: 2, estimatedPlaytime: 10, coverUrl: '' })
    })

    const stats = result.current.getStatsByUser('breakdownUser')

    expect(stats.byStatus).toEqual({
      playing: 1,
      backlog: 1,
      completed: 1,
      dropped: 1,
    })
    expect(stats.byGenre.RPG).toEqual({ games: 2, hours: 18 })
    expect(stats.byGenre.FPS).toEqual({ games: 1, hours: 0 })
    expect(stats.byGenre.Indie).toEqual({ games: 1, hours: 2 })
  })

  it('getLeaderboard sorts users by total hours descending', () => {
    const { result } = renderHook(() => useGames(), { wrapper })

    act(() => {
      result.current.addGame('u1', { title: 'U1 Game', genre: 'RPG', status: 'playing', hours: 5, estimatedPlaytime: 20, coverUrl: '' })
      result.current.addGame('u2', { title: 'U2 Game', genre: 'FPS', status: 'playing', hours: 20, estimatedPlaytime: 20, coverUrl: '' })
      result.current.addGame('u3', { title: 'U3 Game', genre: 'Indie', status: 'playing', hours: 10, estimatedPlaytime: 20, coverUrl: '' })
    })

    const leaderboard = result.current.getLeaderboard()
    const customUsers = leaderboard.filter(row => ['u1', 'u2', 'u3'].includes(row.userId))
    expect(customUsers.map(row => row.userId)).toEqual(['u2', 'u3', 'u1'])
  })
})
