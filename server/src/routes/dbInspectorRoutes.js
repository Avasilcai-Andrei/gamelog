import { Router } from 'express'
import { sequelize, User, Role, Permission, RolePermission, Game, Session, ActionLog, Observation } from '../db/index.js'
import { requirePermission } from '../middleware/requirePermission.js'

const router = Router()

const tableMap = {
  users: User,
  roles: Role,
  permissions: Permission,
  role_permissions: RolePermission,
  games: Game,
  sessions: Session,
  action_logs: ActionLog,
  observations: Observation,
}

const sanitize = (rows) => rows.map(row => {
  const plain = row.get({ plain: true })
  if ('password' in plain) plain.password = '••••••'
  return plain
})

router.get('/db/tables', requirePermission('admin:access'), async (req, res, next) => {
  try {
    const summary = []
    for (const [name, model] of Object.entries(tableMap)) {
      summary.push({ name, count: await model.count() })
    }
    return res.json({ tables: summary })
  } catch (err) { return next(err) }
})

router.get('/db/tables/:name', requirePermission('admin:access'), async (req, res, next) => {
  try {
    const model = tableMap[req.params.name]
    if (!model) return res.status(404).json({ error: 'Unknown table' })
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 100))
    const rows = await model.findAll({ limit })
    return res.json({ name: req.params.name, count: rows.length, items: sanitize(rows) })
  } catch (err) { return next(err) }
})

router.get('/db/dump', requirePermission('admin:access'), async (req, res, next) => {
  try {
    const dump = {}
    for (const [name, model] of Object.entries(tableMap)) {
      const rows = await model.findAll({ limit: 500 })
      dump[name] = { count: rows.length, items: sanitize(rows) }
    }
    return res.json(dump)
  } catch (err) { return next(err) }
})

export default router
