import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useGames } from '../context/GameContext'
import { ChevronLeft, Plus, Link2, Save, X, Trash2, Pencil, MessageSquarePlus, ThumbsUp, Check, Image, Upload, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api`

const NODE_TYPES = [
  { value: 'boss', label: 'Bosses', color: 'var(--accent-red)' },
  { value: 'dungeon', label: 'Dungeons', color: '#c084fc' },
  { value: 'location', label: 'Locations', color: 'var(--accent-green)' },
  { value: 'shop', label: 'Shops', color: 'var(--accent-orange)' },
  { value: 'quest', label: 'Quests', color: 'var(--accent-blue)' },
  { value: 'item', label: 'Items', color: '#f7d154' },
]

const MAP_BACKDROPS = [
  'radial-gradient(circle at 20% 20%, rgba(74,144,217,0.18), transparent 45%), radial-gradient(circle at 80% 10%, rgba(244,67,54,0.15), transparent 40%), radial-gradient(circle at 50% 85%, rgba(76,175,80,0.14), transparent 45%), linear-gradient(165deg, #1d1812, #0f1118 60%)',
  'radial-gradient(circle at 75% 20%, rgba(74,144,217,0.18), transparent 40%), radial-gradient(circle at 20% 80%, rgba(255,152,0,0.16), transparent 45%), linear-gradient(165deg, #161712, #0c1018 60%)',
  'radial-gradient(circle at 35% 15%, rgba(76,175,80,0.16), transparent 45%), radial-gradient(circle at 80% 70%, rgba(74,144,217,0.2), transparent 40%), linear-gradient(165deg, #14131a, #101925 60%)',
]

const EMPTY_FORM = { label: '', type: 'location', description: '', x: 35, y: 35 }
const normalizeTitle = (title) => decodeURIComponent(title || '').trim().toLowerCase()
const typeMeta = (type) => NODE_TYPES.find(t => t.value === type) || NODE_TYPES[0]

// Downscale + compress a picked image to a base64 data URL before upload, so a
// phone-sized photo doesn't bloat the DB row it's stored in. Caps the longest
// edge at MAX_EDGE and re-encodes as JPEG; PNGs with transparency keep PNG.
const MAX_EDGE = 1600
const fileToResizedDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onerror = () => reject(new Error('Could not read file'))
  reader.onload = () => {
    const img = new window.Image()
    img.onerror = () => reject(new Error('Could not load image'))
    img.onload = () => {
      const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)
      const isPng = file.type === 'image/png'
      resolve(canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', 0.82))
    }
    img.src = reader.result
  }
  reader.readAsDataURL(file)
})

export default function LoreMap() {
  const { title } = useParams()
  const navigate = useNavigate()
  const { token, hasPermission } = useAuth()
  const { games } = useGames()

  const decodedTitle = decodeURIComponent(title || '')
  const gameKey = normalizeTitle(title)
  const entries = games.filter(g => normalizeTitle(g.title) === gameKey)
  const canEdit = hasPermission('lore:write')
  const isAuthed = Boolean(token)

  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [meta, setMeta] = useState({ backgroundUrl: '' })
  const [proposals, setProposals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [fromNodeId, setFromNodeId] = useState('')
  const [toNodeId, setToNodeId] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [bgInput, setBgInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)
  const [votedIds, setVotedIds] = useState(() => new Set())
  const [showProposals, setShowProposals] = useState(false)

  // Pan/zoom (only active when a map image is set)
  const canvasRef = useRef(null)
  const panRef = useRef(null)
  const pointersRef = useRef(new Map())
  const pinchRef = useRef(null)
  const suppressClick = useRef(false)
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 })

  const bgImage = meta.backgroundUrl || (entries.find(e => e.coverUrl) || entries[0])?.coverUrl || ''

  const clampScale = (s) => Math.min(5, Math.max(1, s))
  const zoomAt = (factor, cx, cy) => setView(v => {
    const ns = clampScale(v.scale * factor)
    const ratio = ns / v.scale
    return { scale: ns, x: cx - (cx - v.x) * ratio, y: cy - (cy - v.y) * ratio }
  })
  const zoomByButton = (factor) => {
    const el = canvasRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    zoomAt(factor, rect.width / 2, rect.height / 2)
  }
  const resetView = () => setView({ scale: 1, x: 0, y: 0 })

  const onPointerDown = (e) => {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const n = pointersRef.current.size
    if (n === 1) {
      suppressClick.current = false
      panRef.current = { startX: e.clientX, startY: e.clientY, origX: view.x, origY: view.y, moved: false }
    } else if (n === 2) {
      // Second finger down → switch from pan to pinch-zoom.
      panRef.current = null
      suppressClick.current = true
      const pts = [...pointersRef.current.values()]
      pinchRef.current = { lastDist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) }
    }
  }
  const onPointerMove = (e) => {
    if (!pointersRef.current.has(e.pointerId)) return
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pinchRef.current && pointersRef.current.size >= 2) {
      const pts = [...pointersRef.current.values()]
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      if (pinchRef.current.lastDist > 0) {
        const rect = canvasRef.current?.getBoundingClientRect()
        const midX = (pts[0].x + pts[1].x) / 2 - (rect?.left || 0)
        const midY = (pts[0].y + pts[1].y) / 2 - (rect?.top || 0)
        zoomAt(dist / pinchRef.current.lastDist, midX, midY)
      }
      pinchRef.current.lastDist = dist
      return
    }

    const p = panRef.current
    if (!p) return
    const dx = e.clientX - p.startX
    const dy = e.clientY - p.startY
    if (!p.moved && Math.hypot(dx, dy) > 4) {
      p.moved = true
      // Capture only once a real drag begins, so a plain click still reaches the pin.
      canvasRef.current?.setPointerCapture?.(e.pointerId)
    }
    if (p.moved) setView(v => ({ ...v, x: p.origX + dx, y: p.origY + dy }))
  }
  const onPointerUp = (e) => {
    pointersRef.current.delete(e.pointerId)
    canvasRef.current?.releasePointerCapture?.(e.pointerId)
    if (pointersRef.current.size < 2) pinchRef.current = null
    if (pointersRef.current.size === 0) {
      if (panRef.current?.moved) suppressClick.current = true
      panRef.current = null
    }
  }
  const onPinClick = (id) => {
    if (suppressClick.current) { suppressClick.current = false; return }
    setSelectedId(id)
  }

  // Native non-passive wheel listener so we can preventDefault for zoom.
  useEffect(() => {
    const el = canvasRef.current
    if (!el || !bgImage) return undefined
    const onWheel = (e) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - rect.left, e.clientY - rect.top)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bgImage])

  // Reset the viewport when the map or its background changes.
  useEffect(() => { resetView() }, [gameKey, meta.backgroundUrl])

  // Unified node/proposal modal.
  // mode: 'admin-add' | 'admin-edit' | 'propose-add' | 'propose-edit' | 'propose-delete'
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [reason, setReason] = useState('')

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {}
  const apiKey = encodeURIComponent(gameKey)

  const request = async (path, init = {}) => {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...authHeaders, ...(init.headers || {}) },
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw new Error(typeof body?.error === 'string' ? body.error : `Request failed: ${res.status}`)
    }
    if (res.status === 204) return null
    return res.json()
  }

  const loadProposals = async () => {
    if (!isAuthed) return
    try {
      const data = await request(`/lore/${apiKey}/proposals`)
      setProposals(data.items || [])
    } catch { /* non-fatal */ }
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    request(`/lore/${apiKey}`)
      .then(data => {
        if (!active) return
        setNodes(data.nodes || [])
        setEdges(data.edges || [])
        setMeta(data.meta || { backgroundUrl: '' })
        // Don't pour a giant uploaded data URL into the text field — leave it
        // blank so the input stays usable; the image still renders on the map.
        const bg = data.meta?.backgroundUrl || ''
        setBgInput(bg.startsWith('data:') ? '' : bg)
      })
      .catch(err => { if (active) setError(err.message) })
      .finally(() => { if (active) setLoading(false) })
    loadProposals()
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameKey])

  const nodeLookup = useMemo(() => {
    const map = {}
    for (const node of nodes) map[node.id] = node
    return map
  }, [nodes])

  if (entries.length === 0) {
    return (
      <div className="page">
        <button className="btn btn-ghost lore-back" onClick={() => navigate('/gamelist')}>
          <ChevronLeft size={16} /> Game List
        </button>
        <p className="text-muted">Game not found.</p>
      </div>
    )
  }

  const filteredNodes = nodes.filter(node => {
    const typeMatch = typeFilter === 'all' || node.type === typeFilter
    const text = `${node.label} ${node.description}`.toLowerCase()
    return typeMatch && text.includes(search.toLowerCase())
  })

  const visibleNodeIds = new Set(filteredNodes.map(n => n.id))
  const visibleEdges = edges.filter(e => visibleNodeIds.has(e.fromNodeId) && visibleNodeIds.has(e.toNodeId))
  const selectedNode = nodes.find(n => n.id === selectedId)
  const backdrop = MAP_BACKDROPS[decodedTitle.length % MAP_BACKDROPS.length]
  const openProposals = proposals.filter(p => p.status === 'open' || p.status === 'approved')

  const renderMapLayer = () => (
    <>
      <svg width="100%" height="100%" className="lore-edges">
        {visibleEdges.map(edge => {
          const from = nodeLookup[edge.fromNodeId]
          const to = nodeLookup[edge.toNodeId]
          if (!from || !to) return null
          return (
            <line key={edge.id} x1={`${from.x}%`} y1={`${from.y}%`} x2={`${to.x}%`} y2={`${to.y}%`}
              stroke="rgba(205, 220, 255, 0.5)" strokeWidth="2" />
          )
        })}
      </svg>

      {filteredNodes.map(node => {
        const tm = typeMeta(node.type)
        return (
          <button key={node.id} onClick={() => onPinClick(node.id)} className="lore-node"
            style={{ left: `${node.x}%`, top: `${node.y}%`, borderColor: tm.color }}>
            <span className="lore-dot" style={{ background: tm.color }} />
            {node.label}
          </button>
        )
      })}
    </>
  )

  // --- Modal helpers ---
  const openModal = (mode, node) => {
    setError('')
    setReason('')
    if (mode === 'admin-edit' || mode === 'propose-edit') {
      // Coerce any legacy/unknown type to a valid one so the save passes validation.
      const validType = NODE_TYPES.some(t => t.value === node.type) ? node.type : 'location'
      setForm({ label: node.label, type: validType, description: node.description, x: node.x, y: node.y })
    } else {
      setForm(EMPTY_FORM)
    }
    setModal({ mode, nodeId: node?.id })
  }
  const closeModal = () => { setModal(null); setForm(EMPTY_FORM); setReason('') }

  const submitModal = async () => {
    const { mode, nodeId } = modal
    const needsFields = mode !== 'propose-delete'
    const needsReason = mode.startsWith('propose')
    if (needsFields && (!form.label.trim() || !form.description.trim())) return
    if (needsReason && !reason.trim()) return

    const payload = {
      label: form.label.trim(),
      type: form.type,
      description: form.description.trim(),
      x: Number(form.x),
      y: Number(form.y),
    }

    try {
      if (mode === 'admin-add') {
        const node = await request(`/lore/${apiKey}/nodes`, { method: 'POST', body: JSON.stringify(payload) })
        setNodes(prev => [...prev, node])
      } else if (mode === 'admin-edit') {
        const node = await request(`/lore/${apiKey}/nodes/${nodeId}`, { method: 'PATCH', body: JSON.stringify(payload) })
        setNodes(prev => prev.map(n => (n.id === nodeId ? node : n)))
      } else if (mode === 'propose-add') {
        await request(`/lore/${apiKey}/proposals`, { method: 'POST', body: JSON.stringify({ kind: 'add', payload, reason: reason.trim() }) })
        await loadProposals()
      } else if (mode === 'propose-edit') {
        await request(`/lore/${apiKey}/proposals`, { method: 'POST', body: JSON.stringify({ kind: 'edit', targetNodeId: nodeId, payload, reason: reason.trim() }) })
        await loadProposals()
      } else if (mode === 'propose-delete') {
        await request(`/lore/${apiKey}/proposals`, { method: 'POST', body: JSON.stringify({ kind: 'delete', targetNodeId: nodeId, reason: reason.trim() }) })
        await loadProposals()
      }
      closeModal()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDeleteNode = async (nodeId) => {
    try {
      await request(`/lore/${apiKey}/nodes/${nodeId}`, { method: 'DELETE' })
      setNodes(prev => prev.filter(n => n.id !== nodeId))
      setEdges(prev => prev.filter(e => e.fromNodeId !== nodeId && e.toNodeId !== nodeId))
      setSelectedId(null)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleCreateLink = async () => {
    if (!fromNodeId || !toNodeId || fromNodeId === toNodeId) return
    try {
      const edge = await request(`/lore/${apiKey}/edges`, { method: 'POST', body: JSON.stringify({ fromNodeId, toNodeId }) })
      setEdges(prev => [...prev, edge])
      setFromNodeId('')
      setToNodeId('')
    } catch (err) {
      setError(err.message)
    }
  }

  const saveBackground = async (backgroundUrl) => {
    const updated = await request(`/lore/${apiKey}/meta`, { method: 'PUT', body: JSON.stringify({ backgroundUrl }) })
    setMeta(updated)
    setBgInput(backgroundUrl.startsWith('data:') ? '' : backgroundUrl)
  }

  const handleSaveBackground = async () => {
    try {
      await saveBackground(bgInput.trim())
    } catch (err) {
      setError(err.message)
    }
  }

  const handleUploadBackground = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file')
      return
    }
    setUploading(true)
    try {
      const dataUrl = await fileToResizedDataUrl(file)
      await saveBackground(dataUrl)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleVote = async (proposalId) => {
    try {
      const updated = await request(`/lore/${apiKey}/proposals/${proposalId}/vote`, { method: 'POST' })
      setVotedIds(prev => new Set(prev).add(proposalId))
      setProposals(prev => prev.map(p => (p.id === proposalId ? updated : p)))
    } catch (err) {
      setError(err.message)
    }
  }

  const handleResolve = async (proposalId, action) => {
    try {
      await request(`/lore/${apiKey}/proposals/${proposalId}/${action}`, { method: 'POST' })
      await Promise.all([loadProposals(), request(`/lore/${apiKey}`).then(d => {
        setNodes(d.nodes || [])
        setEdges(d.edges || [])
      })])
    } catch (err) {
      setError(err.message)
    }
  }

  const proposalSummary = (p) => {
    const label = p.payload?.label || nodeLookup[p.targetNodeId]?.label || 'a pin'
    if (p.kind === 'add') return `Add "${label}"`
    if (p.kind === 'edit') return `Edit "${nodeLookup[p.targetNodeId]?.label || label}"`
    return `Remove "${nodeLookup[p.targetNodeId]?.label || 'a pin'}"`
  }

  return (
    <div className="page lore-page">
      <div className="lore-topbar">
        <button className="btn btn-ghost lore-back" onClick={() => navigate(`/games/${encodeURIComponent(decodedTitle)}`)}>
          <ChevronLeft size={16} /> {decodedTitle}
        </button>
        <h1 className="lore-title">Game Map</h1>
        <div className="lore-topbar-actions">
          {isAuthed && (
            <button className="btn btn-ghost" onClick={() => setShowProposals(s => !s)}>
              <MessageSquarePlus size={14} /> Proposals
              {openProposals.length > 0 && <span className="lore-badge">{openProposals.length}</span>}
            </button>
          )}
          {canEdit && (
            <button className="btn btn-primary" onClick={() => openModal('admin-add')}>
              <Plus size={14} /> Add Pin
            </button>
          )}
          {!canEdit && isAuthed && (
            <button className="btn btn-primary" onClick={() => openModal('propose-add')}>
              <MessageSquarePlus size={14} /> Propose Pin
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-muted lore-error">{error}</p>}

      <div className="card lore-shell">
        <div className="lore-layout">
          <aside className="lore-sidebar">
            <div className="lore-game-name">{decodedTitle}</div>
            <p className="lore-copy">
              {canEdit
                ? 'Curated game map. Drop pins for bosses, dungeons, shops and more, then connect routes.'
                : isAuthed
                  ? 'Admin-curated game map. Spot something wrong? Propose a change and the community can vote on it.'
                  : 'Admin-curated game map. Log in to propose changes.'}
            </p>

            {canEdit && (
              <div className="lore-bg-panel">
                <label className="form-label">Map image URL</label>
                <input className="input lore-input-gap" placeholder="https://…/map.png" value={bgInput} onChange={e => setBgInput(e.target.value)} />
                <button className="btn btn-ghost lore-link-btn" onClick={handleSaveBackground}>
                  <Image size={14} /> Set Background
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleUploadBackground}
                />
                <button
                  className="btn btn-ghost lore-link-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload size={14} /> {uploading ? 'Uploading…' : 'Upload Image'}
                </button>
                {meta.backgroundUrl && (
                  <button className="btn btn-ghost lore-link-btn" onClick={() => saveBackground('').catch(err => setError(err.message))}>
                    <X size={14} /> Clear Background
                  </button>
                )}
              </div>
            )}

            <input
              className="input lore-input-gap lore-sidebar-gap"
              placeholder="Search pins..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />

            <select className="input" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="all">All Types</option>
              {NODE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>

            <div className="lore-type-list">
              {NODE_TYPES.map(t => {
                const count = nodes.filter(n => n.type === t.value).length
                return (
                  <div key={t.value} className="lore-type-row">
                    <span className="lore-type-label">
                      <span className="lore-dot" style={{ background: t.color }} />
                      {t.label}
                    </span>
                    <span className="text-secondary">{count}</span>
                  </div>
                )
              })}
            </div>

            {canEdit && nodes.length >= 2 && (
              <div className="lore-link-panel">
                <div className="lore-link-title">Connect Route</div>
                <select className="input lore-input-gap" value={fromNodeId} onChange={e => setFromNodeId(e.target.value)}>
                  <option value="">From pin...</option>
                  {nodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
                </select>
                <select className="input lore-input-gap" value={toNodeId} onChange={e => setToNodeId(e.target.value)}>
                  <option value="">To pin...</option>
                  {nodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
                </select>
                <button className="btn btn-ghost lore-link-btn" onClick={handleCreateLink}>
                  <Link2 size={14} /> Link Pins
                </button>
              </div>
            )}
          </aside>

          <div
            ref={canvasRef}
            className={`lore-canvas ${bgImage ? 'lore-canvas-has-img lore-canvas-pannable' : ''}`}
            style={bgImage ? undefined : { background: backdrop }}
            onPointerDown={bgImage ? onPointerDown : undefined}
            onPointerMove={bgImage ? onPointerMove : undefined}
            onPointerUp={bgImage ? onPointerUp : undefined}
            onPointerCancel={bgImage ? onPointerUp : undefined}
            onPointerLeave={bgImage ? onPointerUp : undefined}
          >
            {loading && <div className="lore-panel-meta lore-canvas-hint">Loading map…</div>}
            {!loading && nodes.length === 0 && (
              <div className="lore-panel-meta lore-canvas-hint">
                {canEdit ? 'No pins yet — add one to get started.' : 'No pins have been added for this game yet.'}
              </div>
            )}

            {bgImage ? (
              <div className="lore-viewport" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}>
                <img className="lore-canvas-img" src={bgImage} alt="" draggable="false" />
                <div className="lore-canvas-overlay" />
                {renderMapLayer()}
              </div>
            ) : renderMapLayer()}

            {bgImage && (
              <div className="lore-zoom-controls" onPointerDown={e => e.stopPropagation()}>
                <button className="btn btn-ghost lore-zoom-btn" title="Zoom in" onClick={() => zoomByButton(1.25)}><ZoomIn size={16} /></button>
                <button className="btn btn-ghost lore-zoom-btn" title="Zoom out" onClick={() => zoomByButton(1 / 1.25)}><ZoomOut size={16} /></button>
                <button className="btn btn-ghost lore-zoom-btn" title="Reset view" onClick={resetView}><Maximize2 size={16} /></button>
              </div>
            )}

            {selectedNode && (
              <div className="lore-panel" onPointerDown={e => e.stopPropagation()}>
                <div className="lore-panel-head">
                  <div className="text-strong">{selectedNode.label}</div>
                  <button className="btn btn-ghost lore-close-btn" onClick={() => setSelectedId(null)}><X size={14} /></button>
                </div>
                <div className="lore-panel-type" style={{ color: typeMeta(selectedNode.type).color }}>
                  {typeMeta(selectedNode.type).label.replace(/s$/, '')}
                </div>
                <div className="lore-panel-desc">{selectedNode.description}</div>
                <div className="lore-panel-meta">Added by {selectedNode.createdBy}</div>

                {canEdit && (
                  <div className="lore-panel-actions">
                    <button className="btn btn-ghost" onClick={() => openModal('admin-edit', selectedNode)}><Pencil size={14} /> Edit</button>
                    <button className="btn btn-ghost lore-delete-btn" onClick={() => handleDeleteNode(selectedNode.id)}><Trash2 size={14} /> Delete</button>
                  </div>
                )}
                {!canEdit && isAuthed && (
                  <div className="lore-panel-actions">
                    <button className="btn btn-ghost" onClick={() => openModal('propose-edit', selectedNode)}><Pencil size={14} /> Propose edit</button>
                    <button className="btn btn-ghost lore-delete-btn" onClick={() => openModal('propose-delete', selectedNode)}><Trash2 size={14} /> Propose removal</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Proposals panel */}
      {showProposals && isAuthed && (
        <div className="card lore-proposals">
          <div className="lore-proposals-head">
            <h2 className="lore-subtitle">Correction Proposals</h2>
            <span className="text-secondary">{proposals.length} total</span>
          </div>
          {proposals.length === 0 && <p className="text-muted">No proposals yet.</p>}
          {proposals.map(p => {
            const resolved = p.status === 'applied' || p.status === 'rejected'
            return (
              <div key={p.id} className="lore-proposal-row">
                <div className="lore-proposal-main">
                  <div className="text-strong">{proposalSummary(p)}</div>
                  <div className="text-secondary lore-proposal-reason">“{p.reason}”</div>
                  <div className="lore-panel-meta">by {p.createdBy} · <span className={`lore-status lore-status-${p.status}`}>{p.status}</span></div>
                </div>
                <div className="lore-proposal-side">
                  <div className="lore-votes">{p.votes}/{p.threshold} votes</div>
                  {!resolved && (
                    <button className="btn btn-ghost lore-vote-btn" disabled={votedIds.has(p.id)} onClick={() => handleVote(p.id)}>
                      <ThumbsUp size={13} /> {votedIds.has(p.id) ? 'Voted' : 'Vote'}
                    </button>
                  )}
                  {canEdit && !resolved && (
                    <div className="lore-resolve">
                      <button className="btn btn-primary lore-vote-btn" onClick={() => handleResolve(p.id, 'apply')}><Check size={13} /> Apply</button>
                      <button className="btn btn-ghost lore-vote-btn" onClick={() => handleResolve(p.id, 'reject')}><X size={13} /> Reject</button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Unified node/proposal modal */}
      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              {modal.mode === 'admin-add' && 'Add Pin'}
              {modal.mode === 'admin-edit' && 'Edit Pin'}
              {modal.mode === 'propose-add' && 'Propose New Pin'}
              {modal.mode === 'propose-edit' && 'Propose Edit'}
              {modal.mode === 'propose-delete' && 'Propose Removal'}
            </div>

            {modal.mode !== 'propose-delete' && (
              <>
                <div className="form-group">
                  <label className="form-label">Pin name</label>
                  <input className="input" value={form.label} onChange={e => setForm(prev => ({ ...prev, label: e.target.value }))} placeholder="Ex: Stormveil Castle" />
                </div>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="input" value={form.type} onChange={e => setForm(prev => ({ ...prev, type: e.target.value }))}>
                    {NODE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="input lore-textarea" rows={3} value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} placeholder="One concise note" />
                </div>
                <div className="lore-pos-grid">
                  <div className="form-group">
                    <label className="form-label">X position (%)</label>
                    <input className="input" type="number" min="2" max="98" value={form.x} onChange={e => setForm(prev => ({ ...prev, x: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Y position (%)</label>
                    <input className="input" type="number" min="2" max="98" value={form.y} onChange={e => setForm(prev => ({ ...prev, y: e.target.value }))} />
                  </div>
                </div>
              </>
            )}

            {modal.mode.startsWith('propose') && (
              <div className="form-group">
                <label className="form-label">Reason for this change</label>
                <textarea className="input lore-textarea" rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="Why should this change be made?" />
              </div>
            )}

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={submitModal}>
                <Save size={14} /> {modal.mode.startsWith('propose') ? 'Submit Proposal' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
