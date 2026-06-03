import { Op, fn, col, literal } from 'sequelize'
import { Game, Session } from '../db/index.js'

const toPlain = (instance) => (instance ? instance.get({ plain: true }) : instance)

const buildPagination = (page, pageSize, total) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)
  return {
    page: safePage,
    pageSize,
    total,
    totalPages,
    hasNext: safePage < totalPages,
    hasPrev: safePage > 1,
  }
}

export const listGames = async ({ page, pageSize, userId, status, genre, search }) => {
  const where = {}
  if (userId) where.userId = userId
  if (status) where.status = status
  if (genre) where.genre = genre
  const q = String(search || '').trim()
  if (q) where.title = { [Op.like]: `%${q}%` }

  const total = await Game.count({ where })
  const meta = buildPagination(page, pageSize, total)
  const items = await Game.findAll({
    where,
    order: [['addedAt', 'DESC']],
    offset: (meta.page - 1) * pageSize,
    limit: pageSize,
  })

  return { items: items.map(toPlain), meta }
}

export const getGameById = async (id) => toPlain(await Game.findByPk(id))

export const createGame = async (payload) => {
  const created = await Game.create({
    ...payload,
    addedAt: new Date().toISOString(),
  })
  return toPlain(created)
}

export const updateGame = async (id, payload) => {
  const game = await Game.findByPk(id)
  if (!game) return null
  await game.update(payload)
  return toPlain(game)
}

export const deleteGame = async (id) => {
  const removed = await Game.destroy({ where: { id } })
  return removed > 0
}

export const listSessionsByGame = async (gameId, { page, pageSize }) => {
  const where = { gameId }
  const total = await Session.count({ where })
  const meta = buildPagination(page, pageSize, total)
  const items = await Session.findAll({
    where,
    order: [['date', 'DESC']],
    offset: (meta.page - 1) * pageSize,
    limit: pageSize,
  })
  return { items: items.map(toPlain), meta }
}

export const createSession = async (gameId, payload) => {
  const created = await Session.create({ gameId, ...payload })
  return toPlain(created)
}

export const updateSession = async (sessionId, payload) => {
  const session = await Session.findByPk(sessionId)
  if (!session) return null
  await session.update(payload)
  return toPlain(session)
}

export const deleteSession = async (sessionId) => {
  const session = await Session.findByPk(sessionId)
  if (!session) return false
  await session.destroy()
  return true
}

export const getStats = async ({ userId }) => {
  const where = userId ? { userId } : {}
  const games = await Game.findAll({ where, attributes: ['status', 'genre', 'hours'] })

  const totalGames = games.length
  const totalHours = games.reduce((sum, g) => sum + (g.hours || 0), 0)
  const completed = games.filter(g => g.status === 'completed').length
  const completionRate = totalGames > 0 ? Math.round((completed / totalGames) * 100) : 0

  const byStatus = {
    playing: games.filter(g => g.status === 'playing').length,
    backlog: games.filter(g => g.status === 'backlog').length,
    completed,
    dropped: games.filter(g => g.status === 'dropped').length,
  }

  const byGenre = games.reduce((acc, g) => {
    if (!acc[g.genre]) acc[g.genre] = { games: 0, hours: 0 }
    acc[g.genre].games += 1
    acc[g.genre].hours += g.hours || 0
    return acc
  }, {})

  return { totalGames, totalHours, completionRate, byStatus, byGenre }
}

export const getLeaderboard = async () => {
  const rows = await Game.findAll({
    attributes: [
      'userId',
      [fn('COUNT', col('id')), 'totalGames'],
      [fn('COALESCE', fn('SUM', col('hours')), 0), 'totalHours'],
      [fn('SUM', literal("CASE WHEN status = 'completed' THEN 1 ELSE 0 END")), 'completedCount'],
    ],
    group: ['userId'],
    raw: true,
  })

  return rows
    .map(r => {
      const totalGames = Number(r.totalGames) || 0
      const totalHours = Number(r.totalHours) || 0
      const completed = Number(r.completedCount) || 0
      const completionRate = totalGames > 0 ? Math.round((completed / totalGames) * 100) : 0
      return { userId: r.userId, totalGames, totalHours, completionRate }
    })
    .sort((a, b) => b.totalHours - a.totalHours)
}
