import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'
import { AuthProvider, useAuth } from '../context/AuthContext'

const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>

// Per-test in-memory user store + fetch mock that emulates the server-side endpoints
// the AuthContext now talks to. This lets the AuthContext tests run in jsdom without
// a real backend, while still exercising the real async wiring.
let serverUsers = []

const jsonResponse = (status, data) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => data,
})

beforeEach(() => {
  serverUsers = []
  const fetchMock = vi.fn(async (url, init = {}) => {
    const u = String(url)
    const method = (init.method || 'GET').toUpperCase()
    const body = init.body ? JSON.parse(init.body) : null

    if (u.endsWith('/api/users') && method === 'GET') {
      return jsonResponse(200, serverUsers.map(({ password, ...rest }) => rest))
    }
    if (u.endsWith('/api/users/register') && method === 'POST') {
      if (serverUsers.find(x => x.username === body.username)) {
        return jsonResponse(409, { error: 'Username already taken' })
      }
      if (serverUsers.find(x => x.email === body.email)) {
        return jsonResponse(409, { error: 'Email already registered' })
      }
      const user = {
        id: `u_${serverUsers.length + 1}`,
        username: body.username,
        email: body.email,
        password: body.password,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${body.username}`,
        joinedAt: new Date().toISOString(),
      }
      serverUsers.push(user)
      const { password, ...safe } = user
      return jsonResponse(201, safe)
    }
    if (u.endsWith('/api/users/login') && method === 'POST') {
      const user = serverUsers.find(x => x.username === body.username && x.password === body.password)
      if (!user) return jsonResponse(401, { error: 'Invalid username or password' })
      const { password, ...safe } = user
      return jsonResponse(200, safe)
    }
    return jsonResponse(404, { error: 'not mocked' })
  })
  vi.stubGlobal('fetch', fetchMock)
})

describe('AuthContext - Register', () => {
  it('registers a new user successfully', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      const res = await result.current.register('testuser', 'test@test.com', 'Password1!')
      expect(res.success).toBe(true)
    })

    expect(result.current.currentUser).not.toBeNull()
    expect(result.current.currentUser.username).toBe('testuser')
  })

  it('auto-logs in after register', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.register('autouser', 'auto@test.com', 'Password1!')
    })

    expect(result.current.currentUser).not.toBeNull()
    expect(result.current.currentUser.username).toBe('autouser')
  })

  it('rejects duplicate username', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.register('dupuser', 'first@test.com', 'Password1!')
    })

    await act(async () => {
      const res = await result.current.register('dupuser', 'second@test.com', 'Password1!')
      expect(res.success).toBe(false)
      expect(res.error).toMatch(/username/i)
    })
  })

  it('rejects duplicate email', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.register('user1', 'same@test.com', 'Password1!')
    })

    await act(async () => {
      const res = await result.current.register('user2', 'same@test.com', 'Password1!')
      expect(res.success).toBe(false)
      expect(res.error).toMatch(/email/i)
    })
  })

  it('does not store password in currentUser', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.register('safeuser', 'safe@test.com', 'Password1!')
    })

    expect(result.current.currentUser.password).toBeUndefined()
  })
})

describe('AuthContext - Login', () => {
  it('logs in with correct credentials', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.register('loginuser', 'login@test.com', 'Password1!')
      result.current.logout()
    })

    await act(async () => {
      const res = await result.current.login('loginuser', 'Password1!')
      expect(res.success).toBe(true)
    })

    expect(result.current.currentUser.username).toBe('loginuser')
  })

  it('rejects wrong password', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.register('wrongpass', 'wp@test.com', 'Password1!')
      result.current.logout()
    })

    await act(async () => {
      const res = await result.current.login('wrongpass', 'wrongpassword')
      expect(res.success).toBe(false)
      expect(res.error).toMatch(/invalid/i)
    })
  })

  it('rejects non-existent user', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      const res = await result.current.login('nobody', 'Password1!')
      expect(res.success).toBe(false)
    })
  })
})

describe('AuthContext - Logout', () => {
  it('clears currentUser on logout', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.register('logoutuser', 'lo@test.com', 'Password1!')
    })

    act(() => { result.current.logout() })

    expect(result.current.currentUser).toBeNull()
  })
})
