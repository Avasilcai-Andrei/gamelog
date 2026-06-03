import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useGames } from '../context/GameContext'

export default function Navbar() {
  const { currentUser, logout, isAdmin } = useAuth()
  const games = useGames()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const isActive = (path) => location.pathname === path ? 'active' : ''

  const offline = games?.offline
  const queued = games?.queuedOperations || 0

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">GameLog</Link>

      {currentUser ? (
        <>
          <div className="navbar-tabs">
            <Link to="/library"  className={`navbar-tab ${isActive('/library')}`}>MyLibrary</Link>
            <Link to="/gamelist" className={`navbar-tab ${isActive('/gamelist')}`}>GameList</Link>
            <Link to="/stats"    className={`navbar-tab ${isActive('/stats')}`}>Stats</Link>
            <Link to="/insights" className={`navbar-tab ${isActive('/insights')}`}>Insights</Link>
            <Link to="/chat" className={`navbar-tab ${isActive('/chat')}`}>Chat</Link>
            {isAdmin && (
              <Link to="/admin" className={`navbar-tab ${isActive('/admin')}`}>Admin</Link>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className={`sync-status ${offline ? 'offline' : 'online'}`}>
              {offline ? `Offline · queued ${queued}` : 'Online'}
            </span>
            <span className="navbar-user">{currentUser.username}</span>
            <button className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: 12 }} onClick={handleLogout}>
              Logout
            </button>
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/login"    className={`navbar-tab ${isActive('/login')}`}>Login</Link>
          <Link to="/register" className={`navbar-tab ${isActive('/register')}`}>Register</Link>
        </div>
      )}
    </nav>
  )
}
