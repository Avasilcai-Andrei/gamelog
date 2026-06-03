import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useGames } from '../context/GameContext'
import { ChevronLeft, Plus, Link2, Save, X } from 'lucide-react'

const NODE_TYPES = [
  { value: 'boss', label: 'Bosses', color: 'var(--accent-red)' },
  { value: 'character', label: 'Characters', color: 'var(--accent-blue)' },
  { value: 'location', label: 'Locations', color: 'var(--accent-green)' },
  { value: 'item', label: 'Lore Items', color: '#c084fc' },
]

const MAP_BACKDROPS = [
  'radial-gradient(circle at 20% 20%, rgba(74,144,217,0.18), transparent 45%), radial-gradient(circle at 80% 10%, rgba(244,67,54,0.15), transparent 40%), radial-gradient(circle at 50% 85%, rgba(76,175,80,0.14), transparent 45%), linear-gradient(165deg, #1d1812, #0f1118 60%)',
  'radial-gradient(circle at 75% 20%, rgba(74,144,217,0.18), transparent 40%), radial-gradient(circle at 20% 80%, rgba(255,152,0,0.16), transparent 45%), linear-gradient(165deg, #161712, #0c1018 60%)',
  'radial-gradient(circle at 35% 15%, rgba(76,175,80,0.16), transparent 45%), radial-gradient(circle at 80% 70%, rgba(74,144,217,0.2), transparent 40%), linear-gradient(165deg, #14131a, #101925 60%)',
]

const normalizeTitle = (title) => decodeURIComponent(title || '').trim().toLowerCase()

const makeNodeId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export default function LoreMap() {
  const { title } = useParams()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const { games } = useGames()

  const decodedTitle = decodeURIComponent(title || '')
  const gameKey = normalizeTitle(title)
  const entries = games.filter(g => normalizeTitle(g.title) === gameKey)

  const [allLore, setAllLore] = useState({})
  const [showForm, setShowForm] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [fromNodeId, setFromNodeId] = useState('')
  const [toNodeId, setToNodeId] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({
    label: '',
    type: 'character',
    description: '',
    x: 35,
    y: 35,
  })

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

  const representative = entries.find(e => e.coverUrl) || entries[0]
  const gameLore = allLore[gameKey] || { nodes: [], edges: [] }
  const nodes = gameLore.nodes || []
  const edges = gameLore.edges || []

  const filteredNodes = nodes.filter(node => {
    const typeMatch = typeFilter === 'all' || node.type === typeFilter
    const text = `${node.label} ${node.description}`.toLowerCase()
    const searchMatch = text.includes(search.toLowerCase())
    return typeMatch && searchMatch
  })

  const nodeLookup = useMemo(() => {
    const map = {}
    for (const node of nodes) map[node.id] = node
    return map
  }, [nodes])

  const visibleNodeIds = new Set(filteredNodes.map(n => n.id))
  const visibleEdges = edges.filter(e => visibleNodeIds.has(e.from) && visibleNodeIds.has(e.to))

  const saveLore = (nextGameLore) => {
    setAllLore(prev => ({ ...prev, [gameKey]: nextGameLore }))
  }

  const selectedNode = nodes.find(n => n.id === selectedId)
  const backdrop = MAP_BACKDROPS[decodedTitle.length % MAP_BACKDROPS.length]

  const handleAddNode = () => {
    if (!form.label.trim() || !form.description.trim()) return

    const newNode = {
      id: makeNodeId(),
      label: form.label.trim(),
      description: form.description.trim(),
      type: form.type,
      x: Number(form.x),
      y: Number(form.y),
      createdBy: currentUser?.username || 'Unknown',
      createdAt: new Date().toISOString(),
    }

    saveLore({
      nodes: [...nodes, newNode],
      edges,
    })

    setShowForm(false)
    setForm({ label: '', type: 'character', description: '', x: 35, y: 35 })
  }

  const handleCreateLink = () => {
    if (!fromNodeId || !toNodeId || fromNodeId === toNodeId) return
    const exists = edges.some(e =>
      (e.from === fromNodeId && e.to === toNodeId) ||
      (e.from === toNodeId && e.to === fromNodeId)
    )
    if (exists) return

    saveLore({
      nodes,
      edges: [...edges, { id: makeNodeId(), from: fromNodeId, to: toNodeId }],
    })

    setFromNodeId('')
    setToNodeId('')
  }

  return (
    <div className="page lore-page">
      <div className="lore-topbar">
        <button className="btn btn-ghost lore-back" onClick={() => navigate(`/games/${encodeURIComponent(decodedTitle)}`)}>
          <ChevronLeft size={16} /> {decodedTitle}
        </button>
        <h1 className="lore-title">Lore Map</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={14} /> Add Node
        </button>
      </div>

      <div className="card lore-shell">
        <div className="lore-layout">
          <aside className="lore-sidebar">
            <div className="lore-game-name">{decodedTitle}</div>
            <p className="lore-copy">
              Community lore board. Add entities and connect relationships.
            </p>

            <input
              className="input"
              placeholder="Search nodes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input lore-input-gap"
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

            <div className="lore-link-panel">
              <div className="lore-link-title">Create Link</div>
              <select className="input lore-input-gap" value={fromNodeId} onChange={e => setFromNodeId(e.target.value)}>
                <option value="">From node...</option>
                {nodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
              </select>
              <select className="input lore-input-gap" value={toNodeId} onChange={e => setToNodeId(e.target.value)}>
                <option value="">To node...</option>
                {nodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
              </select>
              <button className="btn btn-ghost lore-link-btn" onClick={handleCreateLink}>
                <Link2 size={14} /> Link Nodes
              </button>
            </div>
          </aside>

          <div className="lore-canvas" style={{ background: representative.coverUrl ? `linear-gradient(rgba(9,10,18,0.35), rgba(9,10,18,0.65)), url(${representative.coverUrl}) center / cover no-repeat` : backdrop }}>
            <svg width="100%" height="100%" className="lore-edges">
              {visibleEdges.map(edge => {
                const from = nodeLookup[edge.from]
                const to = nodeLookup[edge.to]
                if (!from || !to) return null
                return (
                  <line
                    key={edge.id}
                    x1={`${from.x}%`}
                    y1={`${from.y}%`}
                    x2={`${to.x}%`}
                    y2={`${to.y}%`}
                    stroke="rgba(205, 220, 255, 0.5)"
                    strokeWidth="2"
                  />
                )
              })}
            </svg>

            {filteredNodes.map(node => {
              const typeMeta = NODE_TYPES.find(t => t.value === node.type) || NODE_TYPES[0]
              return (
                <button
                  key={node.id}
                  onClick={() => setSelectedId(node.id)}
                  className="lore-node"
                  style={{ left: `${node.x}%`, top: `${node.y}%`, borderColor: typeMeta.color }}
                >
                  <span className="lore-dot" style={{ background: typeMeta.color }} />
                  {node.label}
                </button>
              )
            })}

            {selectedNode && (
              <div className="lore-panel">
                <div className="lore-panel-head">
                  <div className="text-strong">{selectedNode.label}</div>
                  <button className="btn btn-ghost lore-close-btn" onClick={() => setSelectedId(null)}>
                    <X size={14} />
                  </button>
                </div>
                <div className="lore-panel-desc">{selectedNode.description}</div>
                <div className="lore-panel-meta">
                  Added by {selectedNode.createdBy}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Add Lore Node</div>

            <div className="form-group">
              <label className="form-label">Node name</label>
              <input className="input" value={form.label} onChange={e => setForm(prev => ({ ...prev, label: e.target.value }))} placeholder="Ex: Academy Gate" />
            </div>

            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="input" value={form.type} onChange={e => setForm(prev => ({ ...prev, type: e.target.value }))}>
                {NODE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="input lore-textarea" rows={3} value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} placeholder="One concise lore note" />
            </div>

            <div className="lore-pos-grid">
              <div className="form-group">
                <label className="form-label">X position (%)</label>
                <input className="input" type="number" min="5" max="95" value={form.x} onChange={e => setForm(prev => ({ ...prev, x: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Y position (%)</label>
                <input className="input" type="number" min="5" max="95" value={form.y} onChange={e => setForm(prev => ({ ...prev, y: e.target.value }))} />
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddNode}>
                <Save size={14} /> Save Node
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
