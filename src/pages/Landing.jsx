import { Link } from 'react-router-dom'
import { Gamepad2, NotebookPen, BarChart2 } from 'lucide-react'
import { motion, useMotionValue, useSpring, useReducedMotion } from 'motion/react'
import Logo from '../components/Logo'
import MagneticButton from '../motion/MagneticButton'
import { EASE, SPRING_SOFT, staggerContainer, fadeUp } from '../motion/tokens'

// `M` is uppercase so the linter ignores it (no eslint-plugin-react); `motion`
// itself is "used" via this assignment.
const M = motion

const COVERS = [
  'https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/header.jpg',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/1593500/header.jpg',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/1174180/header.jpg',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/header.jpg',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/292030/header.jpg',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/1237970/header.jpg',
]

const TITLE = 'Vauntd'

export default function Landing() {
  const reduce = useReducedMotion()

  // Mouse parallax for the cover grid. The grid is scaled up slightly so the
  // translate never exposes the edges of its overflow-hidden container.
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const px = useSpring(mx, SPRING_SOFT)
  const py = useSpring(my, SPRING_SOFT)

  const onMove = (e) => {
    if (reduce) return
    const r = e.currentTarget.getBoundingClientRect()
    mx.set(((e.clientX - (r.left + r.width / 2)) / (r.width / 2)) * 16)
    my.set(((e.clientY - (r.top + r.height / 2)) / (r.height / 2)) * 16)
  }
  const onLeave = () => { mx.set(0); my.set(0) }

  return (
    <div className="landing">
      <div className="landing-left" onMouseMove={onMove} onMouseLeave={onLeave}>
        <M.div className="cover-grid" style={{ x: px, y: py, scale: reduce ? 1 : 1.08 }}>
          {COVERS.map((url, i) => (
            <M.div
              key={i}
              className="cover-cell cover-zoom"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08, duration: 0.55, ease: EASE }}
            >
              <img src={url} alt="" />
            </M.div>
          ))}
        </M.div>
        <div className="landing-left-overlay" />
      </div>

      <div className="landing-divider" />

      <div className="landing-right">
        <M.div
          className="landing-content"
          style={{ animation: 'none' }}
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          <h1 className="landing-title">
            <M.span
              style={{ display: 'inline-flex' }}
              initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
            >
              <Logo size={44} className="landing-logo-mark" />
            </M.span>
            <span style={{ display: 'inline-flex', marginLeft: 12 }}>
              {TITLE.split('').map((ch, i) => (
                <M.span
                  key={i}
                  style={{ display: 'inline-block' }}
                  initial={{ opacity: 0, y: '0.5em' }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18 + i * 0.05, duration: 0.5, ease: EASE }}
                >
                  {ch}
                </M.span>
              ))}
            </span>
          </h1>

          <M.p className="landing-tagline" variants={fadeUp}>Earn the brag. Rank by skill, not hours.</M.p>
          <M.p className="landing-desc" variants={fadeUp}>
            Track your games, log your sessions, and climb each game's leaderboard by
            completing achievements — the rarer the feat, the higher you rank.
          </M.p>

          <M.div variants={fadeUp}>
            <MagneticButton as="div" style={{ display: 'inline-block' }}>
              <Link to="/register" className="btn btn-primary landing-cta">
                Get started
              </Link>
            </MagneticButton>
          </M.div>

          <M.div className="landing-features" variants={staggerContainer}>
            <M.div className="feature-card lift-hover" variants={fadeUp}>
              <Gamepad2 className="feature-icon" />
              <div>
                <div className="feature-title">Track games</div>
                <div className="feature-desc">Add games to your list and see details about each of them</div>
              </div>
            </M.div>
            <M.div className="feature-card lift-hover" variants={fadeUp}>
              <NotebookPen className="feature-icon" />
              <div>
                <div className="feature-title">Log sessions</div>
                <div className="feature-desc">After each gaming session, write your thoughts about your experience</div>
              </div>
            </M.div>
            <M.div className="feature-card lift-hover" variants={fadeUp}>
              <BarChart2 className="feature-icon" />
              <div>
                <div className="feature-title">Review progress</div>
                <div className="feature-desc">Go back to the early days and check how far you've come</div>
              </div>
            </M.div>
          </M.div>
        </M.div>
      </div>
    </div>
  )
}
