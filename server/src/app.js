import express from 'express'
import cors from 'cors'
import session from 'express-session'
import passport from 'passport'
import { existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const distPath = join(__dirname, '../../dist')
import { createHandler } from 'graphql-http/lib/use/express'
import { validate } from 'graphql'
import gameRoutes from './routes/gameRoutes.js'
import userRoutes from './routes/userRoutes.js'
import chatRoutes from './routes/chatRoutes.js'
import auditRoutes from './routes/auditRoutes.js'
import dbInspectorRoutes from './routes/dbInspectorRoutes.js'
import authRoutes from './routes/authRoutes.js'
import loreRoutes from './routes/loreRoutes.js'
import achievementRoutes from './routes/achievementRoutes.js'
import { schema, root, setBroadcast } from './graphql/schema.js'
import { generatorStatus, startGenerator, stopGenerator } from './realtime/generator.js'
import { resetDatabase } from './db/index.js'
import { requirePermission } from './middleware/requirePermission.js'
import { actionLogger } from './middleware/actionLogger.js'
import { authenticateToken } from './middleware/authenticateToken.js'
import './config/passport.js'

export const createApp = (broadcast) => {
  setBroadcast(broadcast)
  const app = express()

  app.use(cors())
  app.use(express.json())
  app.use(session({
    secret: process.env.SESSION_SECRET || 'gamelog-session-secret',
    resave: false,
    saveUninitialized: false,
  }))
  app.use(passport.initialize())
  app.use(passport.session())
  app.use(authenticateToken)

  app.get('/health', (req, res) => res.json({ ok: true }))
  app.get('/api/health', (req, res) => res.json({ ok: true }))

  app.use('/api', actionLogger)
  app.use('/api/auth', authRoutes)
  app.use('/api/chat', chatRoutes)
  app.use('/api', auditRoutes)
  app.use('/api', dbInspectorRoutes)
  app.use('/api', gameRoutes)
  app.use('/api', userRoutes)
  app.use('/api', loreRoutes)
  app.use('/api', achievementRoutes)

  app.get('/api/generator/status', (req, res) => {
    res.json(generatorStatus())
  })

  app.post('/api/generator/start', requirePermission('generator:control'), (req, res) => {
    const result = startGenerator(req.body || {}, broadcast)
    if (!result.ok) return res.status(400).json({ error: result.error })
    return res.json(result)
  })

  app.post('/api/generator/stop', requirePermission('generator:control'), (req, res) => {
    const result = stopGenerator()
    if (!result.ok) return res.status(400).json({ error: result.error })
    return res.json(result)
  })

  app.post('/api/test/reset', async (req, res, next) => {
    if (process.env.NODE_ENV !== 'test') return res.status(403).json({ error: 'Forbidden' })
    try {
      await resetDatabase()
      return res.status(204).send()
    } catch (err) {
      return next(err)
    }
  })

  app.get('/graphql', (req, res) => {
    res.send(`<!DOCTYPE html>
<html>
<head>
  <title>GraphiQL</title>
  <link rel="stylesheet" href="https://unpkg.com/graphiql@3/graphiql.min.css" />
</head>
<body style="margin:0">
  <div id="graphiql" style="height:100vh"></div>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/graphiql@3/graphiql.min.js"></script>
  <script>
    const fetcher = GraphiQL.createFetcher({ url: '/graphql' });
    ReactDOM.createRoot(document.getElementById('graphiql')).render(
      React.createElement(GraphiQL, { fetcher })
    );
  </script>
</body>
</html>`)
  })

  app.post('/graphql', createHandler({ schema, rootValue: root, validate }))

  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err)
    return res.status(500).json({ error: 'Internal server error' })
  })

  if (existsSync(distPath)) {
    app.use(express.static(distPath))
    app.get(/(.*)/, (req, res) => res.sendFile(join(distPath, 'index.html')))
  }

  return app
}
