import { useState, useEffect, useRef } from 'react'
import { validateGame } from '../utils/validators'

const RAWG_KEY = import.meta.env.VITE_RAWG_KEY

const GENRES = ['RPG', 'Action Adventure', 'FPS', 'Strategy', 'Indie', 'Sports', 'Horror', 'Platformer', 'Simulation', 'Fighting']

const STATUS_OPTIONS = [
  { value: 'playing',   label: 'Playing',   tooltip: 'Currently actively playing this game' },
  { value: 'backlog',   label: 'Backlog',   tooltip: 'Own it or plan to play it, but haven\'t started yet' },
  { value: 'completed', label: 'Completed', tooltip: 'Finished the main story or reached your personal goal' },
  { value: 'dropped',   label: 'Dropped',   tooltip: 'Started but decided to stop playing' },
]

const mapGenre = (rawgGenres) => {
  if (!rawgGenres?.length) return ''

  const dictionary = {
    'role-playing-games-rpg': 'RPG',
    'rpg': 'RPG',
    'action-rpg': 'RPG',
    'action': 'Action Adventure',
    'adventure': 'Action Adventure',
    'shooter': 'FPS',
    'fps': 'FPS',
    'strategy': 'Strategy',
    'indie': 'Indie',
    'sports': 'Sports',
    'horror': 'Horror',
    'platformer': 'Platformer',
    'platform': 'Platformer',
    'simulation': 'Simulation',
    'fighting': 'Fighting',
  }

  const found = new Set()

  for (const genre of rawgGenres) {
    const slug = String(genre.slug || '').toLowerCase().trim()
    const name = String(genre.name || '').toLowerCase().trim()

    if (dictionary[slug]) found.add(dictionary[slug])
    if (dictionary[name]) found.add(dictionary[name])
  }

  if (found.has('Indie')) return 'Indie'
  if (found.has('RPG')) return 'RPG'
  if (found.has('FPS')) return 'FPS'
  if (found.has('Platformer')) return 'Platformer'
  if (found.has('Strategy')) return 'Strategy'
  if (found.has('Horror')) return 'Horror'
  if (found.has('Sports')) return 'Sports'
  if (found.has('Simulation')) return 'Simulation'
  if (found.has('Fighting')) return 'Fighting'
  if (found.has('Action Adventure')) return 'Action Adventure'

  return ''
}

export default function GameForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState({
    title: initial?.title || '',
    genre: initial?.genre || '',
    status: initial?.status || 'backlog',
    hours: initial?.hours || 0,
    estimatedPlaytime: initial?.estimatedPlaytime || '',
    coverUrl: initial?.coverUrl || '',
  })
  const [errors, setErrors] = useState({})
  const [hoveredStatus, setHoveredStatus] = useState(null)
  const [query, setQuery] = useState(initial?.title || '')
  const [suggestions, setSuggestions] = useState([])
  const [searching, setSearching] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchTimeout = useRef(null)
  const wrapperRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!query || query.length < 2) { setSuggestions([]); return }
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(
          `https://api.rawg.io/api/games?key=${RAWG_KEY}&search=${encodeURIComponent(query)}&page_size=6`
        )
        const data = await res.json()
        setSuggestions(data.results || [])
        setShowSuggestions(true)
      } catch {
        setSuggestions([])
      } finally {
        setSearching(false)
      }
    }, 400)
    return () => clearTimeout(searchTimeout.current)
  }, [query])

  const selectGame = async (game) => {
    setShowSuggestions(false)
    setQuery(game.name)
    let playtime = game.playtime || ''
    let selectedGenre = mapGenre(game.genres)
    try {
      const res = await fetch(`https://api.rawg.io/api/games/${game.id}?key=${RAWG_KEY}`)
      const detail = await res.json()
      playtime = detail.playtime || playtime
      selectedGenre = mapGenre(detail.genres || game.genres)
    } catch {}
    setForm(prev => ({
      ...prev,
      title: game.name,
      coverUrl: game.background_image || '',
      genre: selectedGenre,
      estimatedPlaytime: playtime,
    }))
    setErrors(prev => ({ ...prev, title: '', genre: '' }))
  }

  const update = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const handleSave = () => {
    const e = validateGame(form)
    if (Object.keys(e).length > 0) { setErrors(e); return }
    onSave({
      ...form,
      hours: Number(form.hours) || 0,
      estimatedPlaytime: Number(form.estimatedPlaytime) || 0,
    })
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">{initial ? 'Edit Game' : 'Add Game'}</div>

        <div className="form-group" ref={wrapperRef} style={{ position: 'relative' }}>
          <label className="form-label">Title</label>
          <div style={{ position: 'relative' }}>
            <input
              className={`input ${errors.title ? 'input-error' : ''}`}
              placeholder="Search for a game..."
              value={query}
              onChange={e => { setQuery(e.target.value); update('title', e.target.value) }}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              autoComplete="off"
            />
            {searching && (
              <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 12 }}>
                Searching...
              </div>
            )}
          </div>
          {errors.title && <div className="form-error">{errors.title}</div>}

          {showSuggestions && suggestions.length > 0 && (
            <div className="rawg-suggestions">
              {suggestions.map(game => (
                <div key={game.id} className="rawg-suggestion" onMouseDown={() => selectGame(game)}>
                  {game.background_image && (
                    <img src={game.background_image} alt="" className="rawg-suggestion-img" />
                  )}
                  <div>
                    <div className="rawg-suggestion-title">{game.name}</div>
                    <div className="rawg-suggestion-meta">
                      {game.genres?.map(g => g.name).join(', ')} · {game.released?.slice(0, 4)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Genre</label>
          <select
            className={`input ${errors.genre ? 'input-error' : ''}`}
            value={form.genre}
            onChange={e => update('genre', e.target.value)}
          >
            <option value="">Select genre...</option>
            {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          {errors.genre && <div className="form-error">{errors.genre}</div>}
        </div>

        <div className="form-group">
          <label className="form-label">Status</label>
          <div className="status-options">
            {STATUS_OPTIONS.map(opt => (
              <div key={opt.value} className="status-option-wrap"
                onMouseEnter={() => setHoveredStatus(opt.value)}
                onMouseLeave={() => setHoveredStatus(null)}
              >
                <button
                  className={`status-option ${form.status === opt.value ? 'selected' : ''} status-${opt.value}`}
                  onClick={() => update('status', opt.value)}
                  type="button"
                >
                  {opt.label}
                </button>
                {hoveredStatus === opt.value && (
                  <div className="status-tooltip">{opt.tooltip}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Hours played</label>
            <input
              className={`input ${errors.hours ? 'input-error' : ''}`}
              type="number" min="0" placeholder="0"
              value={form.hours}
              onChange={e => update('hours', e.target.value)}
            />
            {errors.hours && <div className="form-error">{errors.hours}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">Est. playtime (h)</label>
            <input
              className="input" type="number" min="0" placeholder="Auto-filled"
              value={form.estimatedPlaytime}
              onChange={e => update('estimatedPlaytime', e.target.value)}
            />
          </div>
        </div>

        {form.coverUrl && (
          <div className="form-group">
            <label className="form-label">Cover</label>
            <img src={form.coverUrl} alt="cover"
              style={{ height: 80, borderRadius: 8, objectFit: 'cover' }}
              onError={e => e.target.style.display = 'none'}
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>
            {initial ? 'Save changes' : 'Add game'}
          </button>
        </div>
      </div>
    </div>
  )
}
