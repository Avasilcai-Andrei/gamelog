import { createServer as createHttpsServer } from 'https'
import { createServer as createHttpServer } from 'http'
import { readFileSync, existsSync } from 'fs'
import { networkInterfaces } from 'os'
import { WebSocketServer } from 'ws'
import { createApp } from './app.js'
import { initDatabase } from './db/index.js'
import { initChat } from './services/chatService.js'

const PORT = Number(process.env.PORT || 4000)
const HOST = process.env.HOST || '0.0.0.0'

const clients = new Set()

const broadcast = (message) => {
  const payload = JSON.stringify(message)
  for (const client of clients) {
    if (client.readyState === client.OPEN) {
      client.send(payload)
    }
  }
}

const getLocalIPs = () =>
  Object.values(networkInterfaces())
    .flat()
    .filter(n => n && n.family === 'IPv4' && !n.internal && !n.address.startsWith('169.254'))
    .map(n => n.address)

await initDatabase()
await initChat()

const app = createApp(broadcast)

const CERT_KEY = process.env.CERT_KEY || './certs/server.key'
const CERT_CRT = process.env.CERT_CRT || './certs/server.crt'
const hasCerts = existsSync(CERT_KEY) && existsSync(CERT_CRT)

const server = hasCerts
  ? createHttpsServer({ key: readFileSync(CERT_KEY), cert: readFileSync(CERT_CRT) }, app)
  : createHttpServer(app)

const wss = new WebSocketServer({ server, path: '/ws' })
wss.on('connection', (socket) => {
  clients.add(socket)
  process.stdout.write(`WebSocket client connected (total: ${clients.size})\n`)
  socket.send(JSON.stringify({ type: 'connected' }))
  socket.on('close', () => {
    clients.delete(socket)
    process.stdout.write(`WebSocket client disconnected (total: ${clients.size})\n`)
  })

  socket.on('message', async (raw) => {
    try {
      const payload = JSON.parse(raw.toString())
      if (payload.type === 'chat_message') {
        const data = JSON.stringify({ type: 'chat_message', message: payload.message })
        for (const client of clients) {
          if (client !== socket && client.readyState === client.OPEN) {
            client.send(data)
          }
        }
      }
    } catch {}
  })
})

server.listen(PORT, HOST, () => {
  const protocol = hasCerts ? 'https' : 'http'
  const wsProtocol = hasCerts ? 'wss' : 'ws'
  const lanIPs = getLocalIPs()
  process.stdout.write(`API listening on ${protocol}://localhost:${PORT}\n`)
  if (lanIPs.length) process.stdout.write(`LAN access: ${protocol}://${lanIPs[0]}:${PORT}\n`)
  if (!hasCerts) {
    process.stdout.write('\n⚠  Running over HTTP — no certs found.\n')
    process.stdout.write('   Run "npm run setup:certs" (requires mkcert) to enable HTTPS.\n\n')
  }
})
