import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { useGames } from '../context/GameContext'
import { Trophy, Pencil, X } from 'lucide-react'
import { scaleIn, staggerContainer, SPRING } from '../motion/tokens'

const M = motion
const MAX = 5

const titleCase = (key) => String(key || '').replace(/\b\w/g, c => c.toUpperCase())

const rarityClass = (percent) => {
  if (percent < 5) return 'ach-rarity-legendary'
  if (percent < 20) return 'ach-rarity-rare'
  if (percent < 50) return 'ach-rarity-uncommon'
  return 'ach-rarity-common'
}

function TrophyTile({ a }) {
  return (
    <M.div className="trophy-tile" variants={scaleIn} whileHover={{ y: -3, transition: SPRING }}>
      {a.image
        ? <img src={a.image} alt="" className="trophy-img" onError={e => e.target.style.display = 'none'} />
        : <div className="trophy-img trophy-img-ph"><Trophy size={18} /></div>}
      <div className="trophy-body">
        <div className="trophy-name">{a.name}</div>
        <div className="trophy-game">{titleCase(a.gameKey)}</div>
      </div>
      <span className={`ach-rarity ${rarityClass(a.percent)}`}>
        {a.percent < 100 ? `${a.percent.toFixed(1)}%` : '100%'}
      </span>
    </M.div>
  )
}

export default function TrophyCabinet({ userId, isOwn }) {
  const { getTrophies, getEarnedAchievements, setTrophies } = useGames()

  const [trophies, setTrophiesState] = useState(null)
  const [editing, setEditing] = useState(false)
  const [earned, setEarned] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    getTrophies(userId).then(t => { if (active) setTrophiesState(t) })
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const openEditor = async () => {
    const list = await getEarnedAchievements(userId)
    setEarned(list)
    setSelected(new Set((trophies || []).map(t => t.id)))
    setEditing(true)
  }

  const toggle = (id) => setSelected(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else if (next.size < MAX) next.add(id)
    return next
  })

  const save = async () => {
    setSaving(true)
    try {
      const saved = await setTrophies([...selected])
      setTrophiesState(saved)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (trophies === null) return null
  // Hide entirely on other people's empty cabinets; show a CTA on your own.
  if (trophies.length === 0 && !isOwn) return null

  return (
    <div className="trophy-cabinet">
      <div className="trophy-cabinet-head">
        <h2 className="trophy-cabinet-title"><Trophy size={16} color="var(--accent-orange)" /> Trophy Cabinet</h2>
        {isOwn && (
          <button className="btn btn-ghost btn-sm" onClick={openEditor}>
            <Pencil size={13} /> Edit
          </button>
        )}
      </div>

      {trophies.length === 0 ? (
        <div className="trophy-empty">
          Pin your proudest achievements here — click <strong>Edit</strong> to choose up to {MAX}.
        </div>
      ) : (
        <M.div className="trophy-grid" variants={staggerContainer} initial="hidden" animate="show">
          {trophies.map(a => <TrophyTile key={a.id} a={a} />)}
        </M.div>
      )}

      {editing && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditing(false)}>
          <div className="modal">
            <button className="wrapped-close" onClick={() => setEditing(false)} aria-label="Close"><X size={18} /></button>
            <div className="modal-title">Choose your trophies</div>
            <div className="trophy-pick-count">{selected.size} / {MAX} selected — rarest achievements make the best brag.</div>

            {earned.length === 0 ? (
              <div className="trophy-empty">
                You haven't earned any achievements yet. Tick what you've completed on a game's page first.
              </div>
            ) : (
              <div className="trophy-pick-list">
                {earned.map(a => {
                  const checked = selected.has(a.id)
                  const disabled = !checked && selected.size >= MAX
                  return (
                    <label key={a.id} className={`trophy-pick-row ${checked ? 'trophy-pick-checked' : ''} ${disabled ? 'trophy-pick-disabled' : ''}`}>
                      <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggle(a.id)} />
                      {a.image && <img src={a.image} alt="" className="trophy-pick-img" onError={e => e.target.style.display = 'none'} />}
                      <div className="trophy-body">
                        <div className="trophy-name">{a.name}</div>
                        <div className="trophy-game">{titleCase(a.gameKey)}</div>
                      </div>
                      <span className={`ach-rarity ${rarityClass(a.percent)}`}>
                        {a.percent < 100 ? `${a.percent.toFixed(1)}%` : '100%'}
                      </span>
                    </label>
                  )
                })}
              </div>
            )}

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save cabinet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
