import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useGames } from '../context/GameContext'

export default function Navbar() {
  const { currentUser, logout, isAdmin } = useAuth()
  const games = useGames()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    setMenuOpen(false)
    logout()
    navigate('/')
  }

  const isActive = (path) => location.pathname === path ? 'active' : ''

  const offline = games?.offline
  const queued = games?.queuedOperations || 0

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const tabs = [
    { to: '/library', label: 'MyLibrary' },
    { to: '/gamelist', label: 'GameList' },
    { to: '/stats', label: 'Stats' },
    { to: '/insights', label: 'Insights' },
    { to: '/chat', label: 'Chat' },
    ...(isAdmin ? [{ to: '/admin', label: 'Admin' }] : []),
  ]

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">GameLog</Link>

      {currentUser ? (
        <>
          <div className="navbar-tabs">
            {tabs.map(t => (
              <Link key={t.to} to={t.to} className={`navbar-tab ${isActive(t.to)}`}>{t.label}</Link>
            ))}
          </div>

          <div className="navbar-right">
            <span className={`sync-status ${offline ? 'offline' : 'online'}`}>
              {offline ? `Offline · queued ${queued}` : 'Online'}
            </span>
            <span className="navbar-user">{currentUser.username}</span>
            <button className="btn btn-ghost navbar-logout" onClick={handleLogout}>
              Logout
            </button>
          </div>

          <button
            className="navbar-hamburger"
            aria-label="Menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(o => !o)}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {menuOpen && (
            <>
              <div className="nav-drawer-overlay" onClick={() => setMenuOpen(false)} />
              <aside className="nav-drawer">
                <div className="nav-drawer-tabs">
                  {tabs.map(t => (
                    <Link
                      key={t.to}
                      to={t.to}
                      className={`nav-drawer-link ${isActive(t.to)}`}
                      onClick={() => setMenuOpen(false)}
                    >
                      {t.label}
                    </Link>
                  ))}
                </div>
                <div className="nav-drawer-footer">
                  <span className={`sync-status ${offline ? 'offline' : 'online'}`}>
                    {offline ? `Offline · queued ${queued}` : 'Online'}
                  </span>
                  <span className="nav-drawer-user">{currentUser.username}</span>
                  <button className="btn btn-ghost nav-drawer-logout" onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              </aside>
            </>
          )}
        </>
      ) : (
        <div className="navbar-auth-links">
          <Link to="/login" className={`navbar-tab ${isActive('/login')}`}>Login</Link>
          <Link to="/register" className={`navbar-tab ${isActive('/register')}`}>Register</Link>
        </div>
      )}
    </nav>
  )
}
