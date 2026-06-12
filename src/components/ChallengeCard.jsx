import { useEffect, useState } from 'react'
import { useGames } from '../context/GameContext'
import { useAuth } from '../context/AuthContext'
import { Flame, Clock, Plus, Trash2, X } from 'lucide-react'

const ruleText = (c) =>
  c.kind === 'rarity_under'
    ? `Earn achievements under ${c.threshold}% rarity`
    : `Earn ${c.threshold} achievements`

function timeLeft(endsAt) {
  const ms = new Date(endsAt) - new Date()
  if (ms <= 0) return 'ended'
  const d = Math.floor(ms / 86400000)
  const h = Math.floor((ms % 86400000) / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  if (d > 0) return `${d}d ${h}h left`
  if (h > 0) return `${h}h ${m}m left`
  return `${m}m left`
}

function AdminForm({ onCreate, onClose }) {
  const [form, setForm] = useState({ title: '', description: '', kind: 'rarity_under', threshold: 10, durationDays: 7 })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const submit = async () => {
    if (!form.title.trim()) { setError('Title is required'); return }
    setSaving(true)
    try {
      await onCreate({ ...form, threshold: Number(form.threshold), durationDays: Number(form.durationDays) })
      onClose()
    } catch (e) {
      setError(e.message || 'Failed to create challenge')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="wrapped-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <div className="modal-title">New challenge</div>
        <div className="form-group">
          <label className="form-label">Title</label>
          <input className="input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Rarity Rush" />
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea className="input" rows={2} value={form.description} onChange={e => set('description', e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Rule</label>
            <select className="input" value={form.kind} onChange={e => set('kind', e.target.value)}>
              <option value="rarity_under">Rarity under threshold</option>
              <option value="count_any">Count any achievements</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">{form.kind === 'rarity_under' ? 'Max rarity %' : 'Goal count'}</label>
            <input className="input" type="number" min="1" max="100" value={form.threshold} onChange={e => set('threshold', e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Duration (days)</label>
          <input className="input" type="number" min="1" max="60" value={form.durationDays} onChange={e => set('durationDays', e.target.value)} />
        </div>
        {error && <div className="form-error">{error}</div>}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? 'Creating…' : 'Create'}</button>
        </div>
      </div>
    </div>
  )
}

export default function ChallengeCard() {
  const { getCurrentChallenge, createChallenge, deleteChallenge } = useGames()
  const { isAdmin, currentUser } = useAuth()

  const [data, setData] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [, forceTick] = useState(0)

  const load = () => getCurrentChallenge().then(setData)

  useEffect(() => {
    load()
    // Refresh the countdown each minute.
    const t = setInterval(() => forceTick(n => n + 1), 60000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (data === null) return null

  const c = data.challenge

  const handleCreate = async (form) => {
    await createChallenge(form)
    await load()
  }
  const handleDelete = async () => {
    await deleteChallenge(c.id)
    await load()
  }

  // count_any has a goal bar; rarity_under just counts qualifying unlocks.
  const goal = c && c.kind === 'count_any' ? c.threshold : null
  const pct = goal ? Math.min(100, Math.round((data.myScore / goal) * 100)) : null

  return (
    <div className="challenge-card">
      <div className="challenge-head">
        <div className="challenge-kicker"><Flame size={15} /> Weekly Challenge</div>
        {isAdmin && (
          <div className="challenge-admin">
            <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(true)}><Plus size={13} /> New</button>
            {c && <button className="btn btn-danger btn-sm" onClick={handleDelete}><Trash2 size={13} /></button>}
          </div>
        )}
      </div>

      {!c ? (
        <div className="challenge-empty">
          No active challenge right now.{isAdmin ? ' Create one with “New”.' : ' Check back soon!'}
        </div>
      ) : (
        <>
          <div className="challenge-title">{c.title}</div>
          <div className="challenge-desc">{c.description}</div>
          <div className="challenge-meta">
            <span className="challenge-rule">{ruleText(c)}</span>
            <span className="challenge-time"><Clock size={12} /> {timeLeft(c.endsAt)}</span>
          </div>

          <div className="challenge-you">
            <span>Your progress: <strong>{data.myScore}</strong>{goal ? ` / ${goal}` : ''}</span>
            {pct !== null && (
              <div className="challenge-bar"><div className="challenge-bar-fill" style={{ width: `${pct}%` }} /></div>
            )}
          </div>

          <div className="challenge-board">
            {data.leaderboard.length === 0 ? (
              <div className="challenge-empty">No qualifying achievements yet — be the first!</div>
            ) : data.leaderboard.map((row, i) => (
              <div key={row.userId} className={`challenge-row ${row.userId === currentUser?.id ? 'challenge-row-me' : ''}`}>
                <span className="challenge-rank">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</span>
                <span className="challenge-name">{row.username}</span>
                <span className="challenge-score">{row.score}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {showForm && <AdminForm onCreate={handleCreate} onClose={() => setShowForm(false)} />}
    </div>
  )
}
