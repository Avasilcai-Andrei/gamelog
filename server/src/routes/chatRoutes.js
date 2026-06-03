import { Router } from 'express'
import { listMessages, postMessage } from '../controllers/chatController.js'

const router = Router()

router.get('/messages', listMessages)
router.post('/messages', postMessage)

export default router
