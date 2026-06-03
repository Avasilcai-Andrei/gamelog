import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useGames } from '../context/GameContext'
import GameForm from '../components/GameForm'

const PAGE_SIZE = 5

export default function Library() {
  const { currentUser } = useAuth()
  const { getGamesByUser, addGame, updateGame, deleteGame } = useGames()
  const navigate = useNavigate()

  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editGame, setEditGame] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterGenre, setFilterGenre] = useState('all')

  const allGames = getGamesByUser(currentUser.id)
  const genres = ['all', ...new Set(allGames.map(g => g.genre).filter(Boolean))]

  const filtered = allGames.filter(g => {
    const matchSearch = g.title.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || g.status === filterStatus
    const matchGenre = filterGenre === 'all' || g.genre === filterGenre
    return matchSearch && matchStatus && matchGenre
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleAdd = (data) => {
    addGame(currentUser.id, data)
    setShowForm(false)
  }

  const handleEdit = (data) => {
    updateGame(editGame.id, data)
    setEditGame(null)
  }

  const handleDelete = (id) => {
    deleteGame(id)
    setDeleteConfirm(null)
  }

  const statusClass = (s) => `status-badge status-${s}`

  return (
    <div className="page">
      <div className="library-header">
        <h1 className="page-title">My Library</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add Game</button>
      </div>

      <div className="library-filters">
        <input
          className="input library-search"
          placeholder="Search games..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
        />
        <div className="library-status-filters">
          {['all', 'playing', 'backlog', 'completed', 'dropped'].map(s => (
            <button
              key={s}
              className={`page-btn library-status-btn ${filterStatus === s ? 'active' : ''}`}
              onClick={() => { setFilterStatus(s); setPage(1) }}
            >
              {s}
            </button>
          ))}
        </div>
        <select
          className="input library-genre-filter"
          value={filterGenre}
          onChange={e => { setFilterGenre(e.target.value); setPage(1) }}
        >
          {genres.map(g => <option key={g} value={g}>{g === 'all' ? 'All Genres' : g}</option>)}
        </select>
      </div>

      <div className="card library-table-card">
        <table className="table">
          <thead>
            <tr>
              <th className="col-cover"></th>
              <th>Title</th>
              <th>Genre</th>
              <th>Status</th>
              <th>Hours</th>
              <th>Est. Playtime</th>
              <th className="col-actions"></th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={7} className="table-empty">
                  {allGames.length === 0 ? 'No games yet — add your first one!' : 'No games match your filter.'}
                </td>
              </tr>
            ) : paginated.map(game => (
              <tr
                key={game.id}
                className="clickable-row"
                onClick={() => navigate(`/game/${game.id}`)}
              >
                <td onClick={e => e.stopPropagation()}>
                  {game.coverUrl
                    ? <img src={game.coverUrl} alt="" className="thumb-36" onError={e => e.target.style.display='none'} />
                    : <div className="thumb-36 thumb-placeholder" />
                  }
                </td>
                <td className="text-strong">{game.title}</td>
                <td className="text-secondary">{game.genre}</td>
                <td><span className={`${statusClass(game.status)} text-capitalize`}>{game.status}</span></td>
                <td>{game.hours}h</td>
                <td className="text-secondary">{game.estimatedPlaytime ? `${game.estimatedPlaytime}h` : '—'}</td>
                <td onClick={e => e.stopPropagation()}>
                  <div className="row-actions">
                    <button className="btn btn-ghost btn-sm"
                      onClick={() => setEditGame(game)}>Edit</button>
                    <button className="btn btn-danger btn-sm"
                      onClick={() => setDeleteConfirm(game)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="pagination library-pagination">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                className={`page-btn ${page === i + 1 ? 'active' : ''}`}
                onClick={() => setPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <GameForm onSave={handleAdd} onClose={() => setShowForm(false)} />
      )}

      {editGame && (
        <GameForm initial={editGame} onSave={handleEdit} onClose={() => setEditGame(null)} />
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal modal-compact" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Delete game?</div>
            <p className="confirm-copy">
              Are you sure you want to delete <strong className="text-primary">{deleteConfirm.title}</strong>?
              This will also delete all session logs for this game.
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
