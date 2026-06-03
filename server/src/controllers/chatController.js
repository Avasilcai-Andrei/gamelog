import { z } from 'zod'
import { getMessages, saveMessage } from '../services/chatService.js'

const messageSchema = z.object({
  userId: z.string().min(1),
  username: z.string().min(1),
  content: z.string().trim().min(1).max(500),
})

export const listMessages = async (req, res, next) => {
  try {
    const limit = Number(req.query.limit || 50)
    const messages = await getMessages(limit)
    return res.json({ items: messages })
  } catch (err) {
    return next(err)
  }
}

export const postMessage = async (req, res, next) => {
  try {
    const parsed = messageSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
    const message = await saveMessage({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      ...parsed.data,
      createdAt: new Date().toISOString(),
    })
    return res.status(201).json(message)
  } catch (err) {
    return next(err)
  }
}
