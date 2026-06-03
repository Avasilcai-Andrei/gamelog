import {
  gameCreateSchema,
  gameUpdateSchema,
  sessionCreateSchema,
  sessionUpdateSchema,
  paginationSchema,
} from '../validation/schemas.js'
import {
  listGames,
  getGameById,
  createGame,
  updateGame,
  deleteGame,
  listSessionsByGame,
  createSession,
  updateSession,
  deleteSession,
  getStats,
  getLeaderboard,
} from '../services/gameService.js'

const parseResult = (schema, payload) => schema.safeParse(payload)

export const getGames = async (req, res, next) => {
  try {
    const pageRes = parseResult(paginationSchema, req.query)
    if (!pageRes.success) return res.status(400).json({ error: pageRes.error.flatten() })

    const { page, pageSize } = pageRes.data
    const { userId, status, genre, search } = req.query
    const result = await listGames({ page, pageSize, userId, status, genre, search })
    return res.json(result)
  } catch (err) { return next(err) }
}

export const getGame = async (req, res, next) => {
  try {
    const game = await getGameById(req.params.id)
    if (!game) return res.status(404).json({ error: 'Game not found' })
    return res.json(game)
  } catch (err) { return next(err) }
}

export const postGame = async (req, res, next) => {
  try {
    const parsed = parseResult(gameCreateSchema, req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
    const created = await createGame(parsed.data)
    return res.status(201).json(created)
  } catch (err) { return next(err) }
}

export const patchGame = async (req, res, next) => {
  try {
    const parsed = parseResult(gameUpdateSchema, req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
    const updated = await updateGame(req.params.id, parsed.data)
    if (!updated) return res.status(404).json({ error: 'Game not found' })
    return res.json(updated)
  } catch (err) { return next(err) }
}

export const removeGame = async (req, res, next) => {
  try {
    const ok = await deleteGame(req.params.id)
    if (!ok) return res.status(404).json({ error: 'Game not found' })
    return res.status(204).send()
  } catch (err) { return next(err) }
}

export const getSessions = async (req, res, next) => {
  try {
    const game = await getGameById(req.params.id)
    if (!game) return res.status(404).json({ error: 'Game not found' })

    const pageRes = parseResult(paginationSchema, req.query)
    if (!pageRes.success) return res.status(400).json({ error: pageRes.error.flatten() })
    const result = await listSessionsByGame(req.params.id, pageRes.data)
    return res.json(result)
  } catch (err) { return next(err) }
}

export const postSession = async (req, res, next) => {
  try {
    const game = await getGameById(req.params.id)
    if (!game) return res.status(404).json({ error: 'Game not found' })

    const parsed = parseResult(sessionCreateSchema, req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
    const created = await createSession(req.params.id, parsed.data)
    return res.status(201).json(created)
  } catch (err) { return next(err) }
}

export const patchSession = async (req, res, next) => {
  try {
    const parsed = parseResult(sessionUpdateSchema, req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
    const updated = await updateSession(req.params.sessionId, parsed.data)
    if (!updated) return res.status(404).json({ error: 'Session not found' })
    return res.json(updated)
  } catch (err) { return next(err) }
}

export const removeSession = async (req, res, next) => {
  try {
    const ok = await deleteSession(req.params.sessionId)
    if (!ok) return res.status(404).json({ error: 'Session not found' })
    return res.status(204).send()
  } catch (err) { return next(err) }
}

export const stats = async (req, res, next) => {
  try {
    return res.json(await getStats({ userId: req.query.userId }))
  } catch (err) { return next(err) }
}

export const leaderboard = async (req, res, next) => {
  try {
    return res.json(await getLeaderboard())
  } catch (err) { return next(err) }
}
