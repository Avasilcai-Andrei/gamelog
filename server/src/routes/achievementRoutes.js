import { Router } from 'express'
import { requirePermission } from '../middleware/requirePermission.js'
import {
  getAchievements,
  getMine,
  putMine,
  getRankings,
  getLeaderboard,
  getRating,
} from '../controllers/achievementController.js'

const router = Router()

// Global skill ladder — registered before the /:gameKey routes so these static
// paths aren't swallowed by the gameKey param.
router.get('/achievements/leaderboard', getLeaderboard)
router.get('/achievements/rating/:userId', getRating)

// Catalog and ranking are public (anyone can see who's best at a game).
router.get('/achievements/:gameKey', getAchievements)
router.get('/achievements/:gameKey/ranking', getRankings)

// A user reads and sets their own completed achievements.
router.get('/achievements/:gameKey/me', getMine)
router.put('/achievements/:gameKey/me', requirePermission('sessions:write'), putMine)

export default router
