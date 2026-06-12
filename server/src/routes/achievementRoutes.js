import { Router } from 'express'
import { requirePermission } from '../middleware/requirePermission.js'
import {
  getAchievements,
  getMine,
  putMine,
  getRankings,
} from '../controllers/achievementController.js'

const router = Router()

// Catalog and ranking are public (anyone can see who's best at a game).
router.get('/achievements/:gameKey', getAchievements)
router.get('/achievements/:gameKey/ranking', getRankings)

// A user reads and sets their own completed achievements.
router.get('/achievements/:gameKey/me', getMine)
router.put('/achievements/:gameKey/me', requirePermission('sessions:write'), putMine)

export default router
