import { ChatMessage } from '../db/index.js'

export const chatStore = {
  async init() {},

  async clear() {
    await ChatMessage.destroy({ where: {} })
  },

  async addMessage(message) {
    const row = await ChatMessage.create(message)
    return row.toJSON()
  },

  async listMessages(limit = 50) {
    const rows = await ChatMessage.findAll({
      order: [['createdAt', 'ASC']],
      limit,
    })
    return rows.map(r => r.toJSON())
  },
}
