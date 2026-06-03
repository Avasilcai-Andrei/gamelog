import { createContext, useCallback, useContext, useEffect, useState } from 'react'

const AuthContext = createContext(null)

const CURRENT_USER_KEY = 'gamelog_current_user'
const TOKEN_KEY = 'gamelog_auth_token'
const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api`
const INACTIVITY_MS = Number(import.meta.env.VITE_INACTIVITY_MS || 30 * 60 * 1000)

const readJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

const apiCall = async (path, body) => {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      const error = typeof data?.error === 'string' ? data.error : 'Request failed'
      return { ok: false, error }
    }
    return { ok: true, data }
  } catch (err) {
    return { ok: false, error: err.message || 'Network error' }
  }
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => readJSON(CURRENT_USER_KEY, null))
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [users, setUsers] = useState([])

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser))
    } else {
      localStorage.removeItem(CURRENT_USER_KEY)
    }
  }, [currentUser])

  useEffect(() => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
  }, [token])

  const logout = useCallback(() => {
    setCurrentUser(null)
    setToken(null)
  }, [])

  // Inactivity logout
  useEffect(() => {
    if (!currentUser) return
    let timer
    const reset = () => {
      clearTimeout(timer)
      timer = setTimeout(logout, INACTIVITY_MS)
    }
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach(e => window.addEventListener(e, reset))
    reset()
    return () => {
      clearTimeout(timer)
      events.forEach(e => window.removeEventListener(e, reset))
    }
  }, [currentUser?.id, logout])

  const refreshUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/users`)
      if (!res.ok) return
      const data = await res.json()
      setUsers(data)
    } catch {}
  }

  useEffect(() => { refreshUsers() }, [])

  const getUsers = () => users

  const register = async (username, email, password) => {
    const result = await apiCall('/users/register', { username, email, password })
    if (!result.ok) return { success: false, error: result.error }
    const { token: tok, ...user } = result.data
    setCurrentUser(user)
    setToken(tok)
    await refreshUsers()
    return { success: true }
  }

  const login = async (username, password) => {
    const result = await apiCall('/users/login', { username, password })
    if (!result.ok) return { success: false, error: result.error }
    const { token: tok, ...user } = result.data
    setCurrentUser(user)
    setToken(tok)
    return { success: true }
  }

  const loginAsGuest = () => {
    setCurrentUser({
      id: 'guest',
      username: 'Guest',
      email: '',
      joinedAt: new Date().toISOString(),
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=Guest`,
      role: { id: 'guest', name: 'guest', description: 'Anonymous guest' },
      permissions: ['games:read'],
    })
    setToken(null)
  }

  const loginWithOAuthToken = (jwt) => {
    try {
      const payload = JSON.parse(atob(jwt.split('.')[1]))
      setCurrentUser({
        id: payload.userId,
        username: payload.username,
        email: '',
        joinedAt: new Date().toISOString(),
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(payload.username)}`,
        role: { id: '', name: payload.roleName, description: '' },
        permissions: payload.permissions || [],
      })
      setToken(jwt)
    } catch {}
  }

  const requestPasswordReset = async (email) => {
    const result = await apiCall('/auth/password-reset/request', { email })
    if (!result.ok) return { ok: false, error: result.error }
    return { ok: true }
  }

  const resetPassword = async (token, password) => {
    const result = await apiCall('/auth/password-reset/confirm', { token, password })
    if (!result.ok) return { ok: false, error: result.error }
    return { ok: true }
  }

  const hasPermission = (name) =>
    Array.isArray(currentUser?.permissions) && currentUser.permissions.includes(name)

  const isAdmin = currentUser?.role?.name === 'admin'

  return (
    <AuthContext.Provider value={{
      currentUser, token, register, login, loginAsGuest, logout,
      loginWithOAuthToken, requestPasswordReset, resetPassword,
      getUsers, hasPermission, isAdmin,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
