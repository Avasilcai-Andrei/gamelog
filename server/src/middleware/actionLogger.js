import { recordAction } from '../services/auditService.js'

const SKIP_PATHS = [
  '/api/health',
  '/api/logs',
  '/api/observations',
  '/api/db/',
]

const shouldSkip = (req) => {
  if (req.method === 'GET' && req.originalUrl.includes('/users')) return true
  return SKIP_PATHS.some(p => req.originalUrl.startsWith(p))
}

export const actionLogger = (req, res, next) => {
  const userId = req.user?.id
  if (!userId) return next()
  if (shouldSkip(req)) return next()

  res.on('finish', () => {
    const target = req.params?.id || req.params?.sessionId || ''
    const path = req.originalUrl.split('?')[0]
    recordAction({
      userId,
      roleName: req.user?.roleName,
      action: `${req.method} ${path}`,
      target,
      statusCode: res.statusCode,
      ipAddress: req.ip || '',
    }).catch(() => {})
  })
  next()
}
