import { chatStore } from '../data/chatStore.js'

export const initChat = async () => {
  await chatStore.init()
}

export const getMessages = async (limit = 50) => chatStore.listMessages(limit)

export const saveMessage = async (message) => {
  await chatStore.addMessage(message)
  return message
}
