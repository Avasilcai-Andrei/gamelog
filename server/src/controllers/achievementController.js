import { userAchievementsSchema } from '../validation/schemas.js'
import {
  getCatalog,
  getUserAchievements,
  setUserAchievements,
  getRanking,
} from '../services/achievementService.js'

const normalizeKey = (raw) => decodeURIComponent(raw || '').trim().toLowerCase()

const requireUser = (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' })
    return false
  }
  return true
}

export const getAchievements = async (req, res, next) => {
  try {
    const catalog = await getCatalog(normalizeKey(req.params.gameKey), req.query.rawgId)
    return res.json({ items: catalog })
  } catch (err) {
    return next(err)
  }
}

export const getMine = async (req, res, next) => {
  try {
    if (!requireUser(req, res)) return undefined
    const ids = await getUserAchievements(normalizeKey(req.params.gameKey), req.user.id)
    return res.json({ achievementIds: ids })
  } catch (err) {
    return next(err)
  }
}

export const putMine = async (req, res, next) => {
  try {
    if (!requireUser(req, res)) return undefined
    const parsed = userAchievementsSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
    const ids = await setUserAchievements(normalizeKey(req.params.gameKey), req.user.id, parsed.data.achievementIds)
    return res.json({ achievementIds: ids })
  } catch (err) {
    return next(err)
  }
}

export const getRankings = async (req, res, next) => {
  try {
    const ranking = await getRanking(normalizeKey(req.params.gameKey))
    return res.json(ranking)
  } catch (err) {
    return next(err)
  }
}
