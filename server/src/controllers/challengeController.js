import { challengeCreateSchema } from '../validation/schemas.js'
import {
  getCurrentChallenge,
  listChallenges,
  createChallenge,
  deleteChallenge,
} from '../services/challengeService.js'

export const getCurrent = async (req, res, next) => {
  try {
    return res.json(await getCurrentChallenge(req.user?.id))
  } catch (err) {
    return next(err)
  }
}

export const getList = async (req, res, next) => {
  try {
    return res.json({ items: await listChallenges() })
  } catch (err) {
    return next(err)
  }
}

export const postChallenge = async (req, res, next) => {
  try {
    const parsed = challengeCreateSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
    const created = await createChallenge(parsed.data, req.user?.username || 'admin')
    return res.status(201).json(created)
  } catch (err) {
    return next(err)
  }
}

export const removeChallenge = async (req, res, next) => {
  try {
    const ok = await deleteChallenge(req.params.id)
    if (!ok) return res.status(404).json({ error: 'Challenge not found' })
    return res.status(204).send()
  } catch (err) {
    return next(err)
  }
}
