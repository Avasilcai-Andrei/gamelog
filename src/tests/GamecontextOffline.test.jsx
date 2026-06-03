import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { GameProvider, useGames } from '../context/GameContext'
import { AuthProvider, useAuth } from '../context/AuthContext'

const TEST_USER = { id: 'offline_user', username: 'offline', email: 'off@x.com', joinedAt: 't', avatar: '' }

const setLoggedIn = () => {
  localStorage.setItem('gamelog_current_user', JSON.stringify(TEST_USER))
}

const wrapper = ({ children }) => (
  <AuthProvider>
    <GameProvider>{children}</GameProvider>
  </AuthProvider>
)

describe('GameContext - offline / online flows', () => {
  let originalFetch

  beforeEach(() => {
    localStorage.clear()
    originalFetch = global.fetch
    setLoggedIn()
    global.WebSocket = class {
      constructor() { setTimeout(() => this.onerror?.({}), 0) }
      close() {}
    }
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('falls back to offline mode when fetch rejects', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down'))

    const { result } = renderHook(() => useGames(), { wrapper })

    await waitFor(() => expect(result.current.offline).toBe(true))
  })

  it('queues operations when offline and reports queue length', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down'))
    const { result } = renderHook(() => useGames(), { wrapper })

    await waitFor(() => expect(result.current.offline).toBe(true))

    act(() => {
      result.current.addGame('offline_user', {
        title: 'Offline Game',
        genre: 'RPG',
        status: 'playing',
        hours: 0,
        estimatedPlaytime: 5,
        coverUrl: '',
      })
    })

    expect(result.current.games.find(g => g.title === 'Offline Game')).toBeTruthy()
    expect(result.current.syncQueue.length).toBeGreaterThan(0)
  })

  it('addSession optimistically updates hours while offline', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down'))
    const { result } = renderHook(() => useGames(), { wrapper })

    await waitFor(() => expect(result.current.offline).toBe(true))

    let createdId
    act(() => {
      const created = result.current.addGame('offline_user', {
        title: 'Hours Game',
        genre: 'RPG',
        status: 'playing',
        hours: 0,
        estimatedPlaytime: 5,
        coverUrl: '',
      })
      createdId = created.id
    })

    act(() => {
      result.current.addSession('offline_user', createdId, {
        date: '2025-01-01',
        duration: 120,
        notes: 'logged offline',
      })
    })

    const updated = result.current.games.find(g => g.id === createdId)
    expect(updated.hours).toBe(2)
    expect(result.current.getSessionsByGame(createdId)).toHaveLength(1)
  })

  it('updates and deletes a local game without queuing server ops', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down'))
    const { result } = renderHook(() => useGames(), { wrapper })

    await waitFor(() => expect(result.current.offline).toBe(true))

    let createdId
    act(() => {
      const created = result.current.addGame('offline_user', {
        title: 'Local Game',
        genre: 'RPG',
        status: 'playing',
        hours: 0,
        estimatedPlaytime: 5,
        coverUrl: '',
      })
      createdId = created.id
    })

    const initialQueue = result.current.queuedOperations

    act(() => {
      result.current.updateGame(createdId, { status: 'completed' })
    })

    expect(result.current.games.find(g => g.id === createdId).status).toBe('completed')
    expect(result.current.queuedOperations).toBe(initialQueue)

    act(() => {
      result.current.deleteGame(createdId)
    })

    expect(result.current.games.find(g => g.id === createdId)).toBeUndefined()
    expect(result.current.queuedOperations).toBe(initialQueue)
  })
})
