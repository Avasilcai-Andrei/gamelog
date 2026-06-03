import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'
import Navbar from '../components/Navbar'
import { AuthProvider } from '../context/AuthContext'
import { GameContext } from '../context/GameContext'

const FakeGameProvider = ({ children, value }) => (
  <GameContext.Provider value={value}>{children}</GameContext.Provider>
)

const renderWith = ({ user = null, gameValue = null } = {}) => {
  if (user) {
    const stored = {
      id: `u_${user.username}`,
      username: user.username,
      email: user.email,
      avatar: '',
      joinedAt: new Date().toISOString(),
    }
    localStorage.setItem('gamelog_current_user', JSON.stringify(stored))
  }
  return render(
    <MemoryRouter>
      <AuthProvider>
        <FakeGameProvider value={gameValue}>
          <Navbar />
        </FakeGameProvider>
      </AuthProvider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  localStorage.clear()
  // Stub fetch — AuthProvider hits /api/users on mount
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => [],
  })))
})

describe('Navbar', () => {
  it('shows brand link', () => {
    renderWith()
    expect(screen.getByText('GameLog')).toBeInTheDocument()
  })

  it('shows Login and Register links when logged out', () => {
    renderWith()
    expect(screen.getByText('Login')).toBeInTheDocument()
    expect(screen.getByText('Register')).toBeInTheDocument()
  })

  it('shows nav tabs when logged in', () => {
    renderWith({
      user: { username: 'navuser', email: 'nav@test.com' },
      gameValue: { offline: false, queuedOperations: 0 },
    })
    expect(screen.getByText('MyLibrary')).toBeInTheDocument()
    expect(screen.getByText('GameList')).toBeInTheDocument()
    expect(screen.getByText('Stats')).toBeInTheDocument()
    expect(screen.getByText('Insights')).toBeInTheDocument()
    expect(screen.getByText('navuser')).toBeInTheDocument()
  })

  it('shows Online status when not offline', () => {
    renderWith({
      user: { username: 'onlineuser', email: 'on@test.com' },
      gameValue: { offline: false, queuedOperations: 0 },
    })
    expect(screen.getByText('Online')).toBeInTheDocument()
  })

  it('shows Offline status with queued count when offline', () => {
    renderWith({
      user: { username: 'offuser', email: 'off@test.com' },
      gameValue: { offline: true, queuedOperations: 4 },
    })
    expect(screen.getByText(/Offline/i)).toBeInTheDocument()
    expect(screen.getByText(/queued 4/i)).toBeInTheDocument()
  })

  it('logout button clears the user', () => {
    renderWith({
      user: { username: 'logoutuser', email: 'lo@test.com' },
      gameValue: { offline: false, queuedOperations: 0 },
    })

    const button = screen.getByRole('button', { name: /logout/i })
    fireEvent.click(button)

    expect(screen.queryByText('logoutuser')).not.toBeInTheDocument()
    expect(screen.getByText('Login')).toBeInTheDocument()
  })
})
