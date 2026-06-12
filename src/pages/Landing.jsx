import { Link } from 'react-router-dom'
import { Gamepad2, NotebookPen, BarChart2 } from 'lucide-react'
import Logo from '../components/Logo'

const COVERS = [
  'https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/header.jpg',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/1593500/header.jpg',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/1174180/header.jpg',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/header.jpg',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/292030/header.jpg',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/1237970/header.jpg',
]

export default function Landing() {
  return (
    <div className="landing">
      <div className="landing-left">
        <div className="cover-grid">
          {COVERS.map((url, i) => (
            <div key={i} className="cover-cell">
              <img src={url} alt="" />
            </div>
          ))}
        </div>
        <div className="landing-left-overlay" />
      </div>

      <div className="landing-divider" />

      <div className="landing-right">
        <div className="landing-content">
          <h1 className="landing-title">
            <Logo size={44} className="landing-logo-mark" /> Vauntd
          </h1>
          <p className="landing-tagline">Earn the brag. Rank by skill, not hours.</p>
          <p className="landing-desc">
            Track your games, log your sessions, and climb each game's leaderboard by
            completing achievements — the rarer the feat, the higher you rank.
          </p>
          <Link to="/register" className="btn btn-primary landing-cta">
            Get started
          </Link>

          <div className="landing-features">
            <div className="feature-card">
              <Gamepad2 className="feature-icon" />
              <div>
                <div className="feature-title">Track games</div>
                <div className="feature-desc">Add games to your list and see details about each of them</div>
              </div>
            </div>
            <div className="feature-card">
              <NotebookPen className="feature-icon" />
              <div>
                <div className="feature-title">Log sessions</div>
                <div className="feature-desc">After each gaming session, write your thoughts about your experience</div>
              </div>
            </div>
            <div className="feature-card">
              <BarChart2 className="feature-icon" />
              <div>
                <div className="feature-title">Review progress</div>
                <div className="feature-desc">Go back to the early days and check how far you've come</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
