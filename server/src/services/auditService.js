import { Op } from 'sequelize'
import { ActionLog, Observation, User, Role } from '../db/index.js'

export const RATE_LIMIT_THRESHOLD = Number(process.env.AUDIT_RATE_THRESHOLD || 20)
export const RATE_WINDOW_MS = 60_000
export const OBSERVATION_COOLDOWN_MS = 5 * 60_000

export const recordAction = async ({ userId, roleName, action, target, statusCode, ipAddress }) => {
  if (!userId) return null
  let resolvedRoleName = roleName
  if (!resolvedRoleName) {
    const user = await User.findByPk(userId, { include: [Role] })
    if (!user) return null
    resolvedRoleName = user.Role?.name || 'unknown'
  }

  const log = await ActionLog.create({
    userId,
    roleName: resolvedRoleName,
    action,
    target: target || '',
    statusCode: statusCode || 0,
    timestamp: new Date().toISOString(),
    ipAddress: ipAddress || '',
  })

  await detectAnomaly(userId)
  return log
}

export const detectAnomaly = async (userId) => {
  const windowStart = new Date(Date.now() - RATE_WINDOW_MS).toISOString()
  const count = await ActionLog.count({
    where: { userId, timestamp: { [Op.gte]: windowStart } },
  })
  if (count < RATE_LIMIT_THRESHOLD) return null

  const cooldownStart = new Date(Date.now() - OBSERVATION_COOLDOWN_MS).toISOString()
  const recent = await Observation.findOne({
    where: { userId, flaggedAt: { [Op.gte]: cooldownStart } },
  })
  if (recent) return null

  return Observation.create({
    userId,
    reason: `High activity rate: ${count} actions in ${RATE_WINDOW_MS / 1000}s (threshold ${RATE_LIMIT_THRESHOLD})`,
    windowCount: count,
    flaggedAt: new Date().toISOString(),
    resolved: false,
  })
}

export const listLogs = async ({ page = 1, pageSize = 50, userId } = {}) => {
  const where = userId ? { userId } : {}
  const offset = (page - 1) * pageSize
  const { rows, count } = await ActionLog.findAndCountAll({
    where,
    order: [['timestamp', 'DESC']],
    limit: pageSize,
    offset,
  })
  return { items: rows.map(r => r.get({ plain: true })), total: count, page, pageSize }
}

export const listObservations = async ({ resolved } = {}) => {
  const where = {}
  if (resolved !== undefined) where.resolved = resolved
  const rows = await Observation.findAll({
    where,
    order: [['flaggedAt', 'DESC']],
    include: [{ model: User, attributes: ['id', 'username', 'email'] }],
  })
  return rows.map(r => {
    const plain = r.get({ plain: true })
    return {
      ...plain,
      user: plain.User ? { id: plain.User.id, username: plain.User.username, email: plain.User.email } : null,
      User: undefined,
    }
  })
}

export const resolveObservation = async (id) => {
  const obs = await Observation.findByPk(id)
  if (!obs) return null
  await obs.update({ resolved: true })
  return obs.get({ plain: true })
}
