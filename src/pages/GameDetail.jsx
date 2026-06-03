import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useGames } from '../context/GameContext'
import { ChevronLeft } from 'lucide-react'
import { validateSession } from '../utils/validators'

const PAGE_SIZE = 3

function SessionForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState({
    date: initial?.date || new Date().toISOString().slice(0, 10),
    duration: initial?.duration || '',
    notes: initial?.notes || '',
  })
  const [errors, setErrors] = useState({})

  const update = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const handleSave = () => {
    const e = validateSession(form)
    if (Object.keys(e).length > 0) { setErrors(e); return }
    onSave({ ...form, duration: Number(form.duration) })
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
  const { getGameById, getSessionsByGame, addSession, updateSession, deleteSession } = useGames()

  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editSession, setEditSession] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const game = getGameById(id)
  const sessions = getSessionsByGame(id)

  if (!game) return (
    <div className="page">
      <p className="text-muted">Game not found.</p>
    </div>
  )

  const totalPages = Math.max(1, Math.ceil(sessions.length / PAGE_SIZE))
  const paginated = sessions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleAdd = (data) => {
    addSession(currentUser.id, id, data)
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

  return (
    <div className="page">
      <button
        className="btn btn-ghost btn-inline-back"
        onClick={() => navigate('/library')}
      >
        <ChevronLeft size={16} /> MyLibrary
      </button>

      <div className="detail-layout">
        <div className="detail-left">
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
        </div>

        <div className="detail-right">
          <div className="detail-session-header">Session Log</div>

          {paginated.length === 0 ? (
            <div className="empty-block">
              No sessions yet — log your first one!
            </div>
          ) : paginated.map(session => (
            <div key={session.id} className="session-card">
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
            </div>
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
        </div>
      </div>

      {showForm && <SessionForm onSave={handleAdd} onClose={() => setShowForm(false)} />}
      {editSession && <SessionForm initial={editSession} onSave={handleEdit} onClose={() => setEditSession(null)} />}

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
