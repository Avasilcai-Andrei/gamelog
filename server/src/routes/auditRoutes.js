import { Router } from 'express'
import { listLogs, listObservations, resolveObservation } from '../services/auditService.js'
import { requirePermission } from '../middleware/requirePermission.js'

const router = Router()

router.get('/logs', requirePermission('admin:access'), async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize) || 50))
    const userId = req.query.userId || undefined
    const result = await listLogs({ page, pageSize, userId })
    return res.json(result)
  } catch (err) { return next(err) }
})

router.get('/observations', requirePermission('admin:access'), async (req, res, next) => {
  try {
    const resolvedQuery = req.query.resolved
    const resolved = resolvedQuery === 'true' ? true : resolvedQuery === 'false' ? false : undefined
    const items = await listObservations({ resolved })
    return res.json({ items })
  } catch (err) { return next(err) }
})

router.post('/observations/:id/resolve', requirePermission('admin:access'), async (req, res, next) => {
  try {
    const updated = await resolveObservation(req.params.id)
    if (!updated) return res.status(404).json({ error: 'Observation not found' })
    return res.json(updated)
  } catch (err) { return next(err) }
})

export default router
