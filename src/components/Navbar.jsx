import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { useAuth } from '../context/AuthContext'
import { useGames } from '../context/GameContext'
import { SPRING, SPRING_SOFT, EASE } from '../motion/tokens'
import Logo from './Logo'

const M = motion

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
    { to: '/leaderboard', label: 'Leaderboard' },
    { to: '/stats', label: 'Stats' },
    { to: '/chat', label: 'Chat' },
    ...(isAdmin ? [{ to: '/admin', label: 'Admin' }] : []),
  ]

  return (
    <M.nav className="navbar" initial={{ y: -100 }} animate={{ y: 0 }} transition={SPRING_SOFT}>
      <Link to="/" className="navbar-brand"><Logo size={30} withText tile /></Link>

      {currentUser ? (
        <>
          <div className="navbar-tabs">
            {tabs.map(t => {
              const active = location.pathname === t.to
              return (
                // Active state is a single pill that slides between tabs via the
                // shared layoutId (instead of a per-tab background toggle).
                <Link key={t.to} to={t.to} className="navbar-tab">
                  {active && <M.span layoutId="navPill" className="navbar-tab-pill" transition={SPRING} />}
                  <span className="navbar-tab-label">{t.label}</span>
                </Link>
              )
            })}
          </div>

          <div className="navbar-right">
            <span className={`sync-status ${offline ? 'offline' : 'online'}`}>
              {offline ? `Offline · queued ${queued}` : 'Online'}
            </span>
            <Link to={`/player/${currentUser.id}`} className="navbar-user" title="View your profile">{currentUser.username}</Link>
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

          <AnimatePresence>
          {menuOpen && (
            <>
              <M.div className="nav-drawer-overlay" onClick={() => setMenuOpen(false)}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} />
              <M.aside className="nav-drawer" style={{ animation: 'none' }}
                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={SPRING_SOFT}>
                <M.div className="nav-drawer-tabs"
                  initial="hidden" animate="show"
                  variants={{ show: { transition: { staggerChildren: 0.05, delayChildren: 0.08 } } }}>
                  {tabs.map(t => (
                    <M.div key={t.to}
                      variants={{ hidden: { opacity: 0, x: 20 }, show: { opacity: 1, x: 0, transition: { ease: EASE } } }}>
                      <Link
                        to={t.to}
                        className={`nav-drawer-link ${isActive(t.to)}`}
                        onClick={() => setMenuOpen(false)}
                      >
                        {t.label}
                      </Link>
                    </M.div>
                  ))}
                </M.div>
                <div className="nav-drawer-footer">
                  <span className={`sync-status ${offline ? 'offline' : 'online'}`}>
                    {offline ? `Offline · queued ${queued}` : 'Online'}
                  </span>
                  <Link
                    to={`/player/${currentUser.id}`}
                    className="nav-drawer-user"
                    onClick={() => setMenuOpen(false)}
                  >
                    {currentUser.username}
                  </Link>
                  <button className="btn btn-ghost nav-drawer-logout" onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              </M.aside>
            </>
          )}
          </AnimatePresence>
        </>
      ) : (
        <div className="navbar-auth-links">
          <Link to="/login" className={`navbar-tab ${isActive('/login')}`}>Login</Link>
          <Link to="/register" className={`navbar-tab ${isActive('/register')}`}>Register</Link>
        </div>
      )}
    </M.nav>
  )
}
