import { Router } from 'express'
import {
  getGames,
  getGame,
  postGame,
  patchGame,
  removeGame,
  getSessions,
  postSession,
  patchSession,
  removeSession,
  stats,
  leaderboard,
} from '../controllers/gameController.js'

const router = Router()

router.get('/games', getGames)
router.get('/games/:id', getGame)
router.post('/games', postGame)
router.patch('/games/:id', patchGame)
router.delete('/games/:id', removeGame)

router.get('/games/:id/sessions', getSessions)
router.post('/games/:id/sessions', postSession)
router.patch('/sessions/:sessionId', patchSession)
router.delete('/sessions/:sessionId', removeSession)

router.get('/stats', stats)
router.get('/leaderboard', leaderboard)

export default router
