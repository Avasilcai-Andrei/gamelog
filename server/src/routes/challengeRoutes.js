import { Router } from 'express'
import { requirePermission } from '../middleware/requirePermission.js'
import {
  getCurrent,
  getList,
  postChallenge,
  removeChallenge,
} from '../controllers/challengeController.js'

const router = Router()

// Reads are public (the challenge + its leaderboard are shown to everyone).
router.get('/challenges/current', getCurrent)
router.get('/challenges', getList)

// Admins create and remove challenges.
router.post('/challenges', requirePermission('admin:access'), postChallenge)
router.delete('/challenges/:id', requirePermission('admin:access'), removeChallenge)

export default router
