import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { useAuth } from '../context/AuthContext'
import { useGames } from '../context/GameContext'
import { ChevronLeft, Trophy, Target } from 'lucide-react'
import { validateSession } from '../utils/validators'
import AchievementChecklist from '../components/AchievementChecklist'
import Reveal from '../motion/Reveal'
import CountUp from '../motion/CountUp'
import { fadeUp } from '../motion/tokens'

const M = motion

const PAGE_SIZE = 3

function SessionForm({ initial, catalog, initialSelected, onSave, onClose }) {
  const [form, setForm] = useState({
    date: initial?.date || new Date().toISOString().slice(0, 10),
    duration: initial?.duration || '',
    notes: initial?.notes || '',
  })
  const [errors, setErrors] = useState({})
  const [showAch, setShowAch] = useState(false)
  // Seed with the user's already-unlocked set so saving the session merges
  // (rather than wipes) their achievements.
  const [selected, setSelected] = useState(() => new Set(initialSelected || []))

  const update = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const toggle = (id) => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const handleSave = () => {
    const e = validateSession(form)
    if (Object.keys(e).length > 0) { setErrors(e); return }
    onSave({ ...form, duration: Number(form.duration) }, [...selected])
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">{initial ? 'Edit Session' : 'Add Session'}</div>

        <div className="form-group">
          <label className="form-label">Date</label>
          <input
            className={`input ${errors.date ? 'input-error' : ''}`}
            type="date"
            value={form.date}
            onChange={e => update('date', e.target.value)}
          />
          {errors.date && <div className="form-error">{errors.date}</div>}
        </div>

        <div className="form-group">
          <label className="form-label">Duration (minutes)</label>
          <input
            className={`input ${errors.duration ? 'input-error' : ''}`}
            type="number" min="1" placeholder="e.g. 90"
            value={form.duration}
            onChange={e => update('duration', e.target.value)}
          />
          {errors.duration && <div className="form-error">{errors.duration}</div>}
        </div>

        <div className="form-group">
          <label className="form-label">Session notes</label>
          <textarea
            className={`input session-notes-input ${errors.notes ? 'input-error' : ''}`}
            placeholder="What happened in this session? Any progress, discoveries, thoughts..."
            rows={4}
            value={form.notes}
            onChange={e => update('notes', e.target.value)}
          />
          {errors.notes && <div className="form-error">{errors.notes}</div>}
        </div>

        {catalog.length > 0 && (
          <div className="form-group">
            <button type="button" className="btn btn-ghost btn-sm ach-toggle-btn"
              onClick={() => setShowAch(s => !s)}>
              <Trophy size={14} /> Achievements unlocked ({selected.size}/{catalog.length})
              <span className="ach-toggle-caret">{showAch ? '▲' : '▼'}</span>
            </button>
            {showAch && (
              <div className="ach-modal-list">
                <AchievementChecklist catalog={catalog} selected={selected} onToggle={toggle} />
              </div>
            )}
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>
            {initial ? 'Save changes' : 'Add session'}
          </button>
        </div>
      </div>
    </div>
  )
}

function formatDuration(minutes) {
  if (!minutes) return '0m'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
}

export default function GameDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const {
    getGameById, getSessionsByGame, addSession, updateSession, deleteSession,
    getAchievementCatalog, getMyAchievements, setMyAchievements,
  } = useGames()

  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editSession, setEditSession] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  // Achievement state, loaded once we know the game.
  const [catalog, setCatalog] = useState([])
  const [unlocked, setUnlocked] = useState(new Set())
  const [panelSelected, setPanelSelected] = useState(new Set())
  const [savingAch, setSavingAch] = useState(false)
  const [achDirty, setAchDirty] = useState(false)

  const game = getGameById(id)

  useEffect(() => {
    if (!game) return
    let active = true
    Promise.all([
      getAchievementCatalog(game.title, game.rawgId),
      getMyAchievements(game.title),
    ]).then(([cat, mine]) => {
      if (!active) return
      setCatalog(cat)
      const set = new Set(mine)
      setUnlocked(set)
      setPanelSelected(new Set(set))
    })
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.id, game?.title, game?.rawgId])

  if (!game) return (
    <div className="page">
      <p className="text-muted">Game not found.</p>
    </div>
  )

  const sessions = getSessionsByGame(id)
  const totalPages = Math.max(1, Math.ceil(sessions.length / PAGE_SIZE))
  const paginated = sessions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const skillScore = catalog
    .filter(a => unlocked.has(a.id))
    .reduce((sum, a) => sum + a.weight, 0)
  const maxScore = catalog.reduce((sum, a) => sum + a.weight, 0)

  // Highest-value achievements you haven't earned yet — your best skill upside.
  const chase = catalog
    .filter(a => !unlocked.has(a.id))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)

  const persistAchievements = async (ids) => {
    setSavingAch(true)
    try {
      const saved = await setMyAchievements(game.title, ids)
      const set = new Set(saved)
      setUnlocked(set)
      setPanelSelected(new Set(set))
      setAchDirty(false)
    } finally {
      setSavingAch(false)
    }
  }

  const handleAdd = (data, achievementIds) => {
    addSession(currentUser.id, id, data)
    if (achievementIds) persistAchievements(achievementIds)
    setShowForm(false)
    setPage(1)
  }

  const handleEdit = (data) => {
    updateSession(editSession.id, data)
    setEditSession(null)
  }

  const handleDelete = (sessionId) => {
    deleteSession(sessionId)
    setDeleteConfirm(null)
  }

  const togglePanel = (achId) => {
    setPanelSelected(prev => {
      const next = new Set(prev)
      next.has(achId) ? next.delete(achId) : next.add(achId)
      return next
    })
    setAchDirty(true)
  }

  return (
    <div className="page">
      <button
        className="btn btn-ghost btn-inline-back"
        onClick={() => navigate('/library')}
      >
        <ChevronLeft size={16} /> MyLibrary
      </button>

      <div className="detail-layout">
        <Reveal className="detail-left">
          {game.coverUrl ? (
            <img src={game.coverUrl} alt={game.title} className="detail-cover" />
          ) : (
            <div className="detail-cover detail-cover-placeholder" />
          )}
          <h2 className="detail-title">{game.title}</h2>

          <div className="detail-stat-card">
            <div className="detail-stat-label">Hours</div>
            <div className="detail-stat-value">{game.hours}h</div>
          </div>

          <div className="detail-stat-card">
            <div className="detail-stat-label">Estimated Playtime</div>
            <div className="detail-stat-value">{game.estimatedPlaytime ? `${game.estimatedPlaytime}h` : '—'}</div>
          </div>

          <div className="detail-stat-card detail-status-row">
            <span className="detail-stat-label detail-label-inline">Status:</span>
            <span className={`status-badge status-${game.status} text-capitalize`}>
              {game.status}
            </span>
          </div>

          {catalog.length > 0 && (
            <div className="detail-stat-card ach-score-card">
              <div className="detail-stat-label"><Trophy size={13} /> Skill Score</div>
              <div className="detail-stat-value">
                <CountUp as="span" value={Math.round(skillScore)} duration={0.8} /><span className="ach-score-max"> / {Math.round(maxScore)}</span>
              </div>
              <div className="ach-score-sub">{unlocked.size}/{catalog.length} achievements</div>
            </div>
          )}
        </Reveal>

        <div className="detail-right">
          <div className="detail-session-header">Session Log</div>

          {paginated.length === 0 ? (
            <div className="empty-block">
              No sessions yet — log your first one!
            </div>
          ) : paginated.map(session => (
            <M.div key={session.id} className="session-card"
              variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
              <div className="session-meta">
                <div className="session-date">{formatDate(session.date)}</div>
                <div className="session-duration">{formatDuration(session.duration)}</div>
              </div>
              <p className="session-notes">{session.notes}</p>
              <div className="session-actions">
                <button className="btn btn-ghost btn-sm"
                  onClick={() => setEditSession(session)}>Edit</button>
                <button className="btn btn-danger btn-sm"
                  onClick={() => setDeleteConfirm(session)}>Delete</button>
              </div>
            </M.div>
          ))}

          {totalPages > 1 && (
            <div className="pagination pagination-left">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  className={`page-btn ${page === i + 1 ? 'active' : ''}`}
                  onClick={() => setPage(i + 1)}
                >
                  Page {i + 1}
                </button>
              ))}
            </div>
          )}

          <button
            className="btn btn-primary detail-add-session"
            onClick={() => setShowForm(true)}
          >
            + Add Session
          </button>

          {chase.length > 0 && (
            <Reveal className="chase-card">
              <div className="chase-head"><Target size={15} /> Next feats to chase</div>
              {chase.map(a => (
                <div key={a.id} className="chase-row">
                  <div className="chase-info">
                    <div className="chase-name">{a.name}</div>
                    <div className="chase-sub">only {a.percent < 100 ? a.percent.toFixed(1) : 100}% of players have it</div>
                  </div>
                  <span className="chase-pts">+{a.weight}</span>
                </div>
              ))}
            </Reveal>
          )}

          {/* Standalone achievements panel — for marking what you've completed
              without logging a session. */}
          {catalog.length > 0 && (
            <div className="ach-panel">
              <div className="detail-session-header ach-panel-header">
                <span><Trophy size={16} /> Achievements</span>
                <button
                  className="btn btn-primary btn-sm"
                  disabled={!achDirty || savingAch}
                  onClick={() => persistAchievements([...panelSelected])}
                >
                  {savingAch ? 'Saving…' : 'Save achievements'}
                </button>
              </div>
              <p className="ach-panel-hint">
                Tick everything you've completed — rarer achievements are worth more skill points.
              </p>
              <AchievementChecklist
                catalog={catalog}
                selected={panelSelected}
                onToggle={togglePanel}
              />
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <SessionForm
          catalog={catalog}
          initialSelected={[...unlocked]}
          onSave={handleAdd}
          onClose={() => setShowForm(false)}
        />
      )}
      {editSession && (
        <SessionForm
          initial={editSession}
          catalog={[]}
          initialSelected={[]}
          onSave={handleEdit}
          onClose={() => setEditSession(null)}
        />
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal modal-compact" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Delete session?</div>
            <p className="confirm-copy">
              Are you sure you want to delete the session from <strong className="text-primary">{formatDate(deleteConfirm.date)}</strong>?
            </p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm.id)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
