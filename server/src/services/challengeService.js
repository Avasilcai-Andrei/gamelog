import { Op } from 'sequelize'
import { Challenge, UserAchievement, Achievement, User } from '../db/index.js'

const toPlain = (instance) => (instance ? instance.get({ plain: true }) : instance)

// Score a challenge from achievements unlocked within its window. ISO timestamp
// strings compare lexicographically, so a string range works as a time range.
const scoreChallenge = async (challenge) => {
  const unlocks = await UserAchievement.findAll({
    where: { unlockedAt: { [Op.gte]: challenge.startsAt, [Op.lte]: challenge.endsAt } },
    attributes: ['userId', 'achievementId'],
  })
  if (unlocks.length === 0) return []

  // rarity_under needs each achievement's global percent.
  let pctById = new Map()
  if (challenge.kind === 'rarity_under') {
    const ids = [...new Set(unlocks.map(u => u.achievementId))]
    const achs = await Achievement.findAll({ where: { id: { [Op.in]: ids } }, attributes: ['id', 'percent'] })
    pctById = new Map(achs.map(a => [a.id, a.percent]))
  }

  const byUser = new Map()
  for (const u of unlocks) {
    if (challenge.kind === 'rarity_under') {
      const pct = pctById.get(u.achievementId)
      if (pct === undefined || pct >= challenge.threshold) continue
    }
    byUser.set(u.userId, (byUser.get(u.userId) || 0) + 1)
  }
  if (byUser.size === 0) return []

  const users = await User.findAll({
    where: { id: { [Op.in]: [...byUser.keys()] } },
    attributes: ['id', 'username'],
  })
  const nameById = new Map(users.map(u => [u.id, u.username]))

  return [...byUser.entries()]
    .map(([userId, score]) => ({ userId, username: nameById.get(userId) || userId, score }))
    .sort((a, b) => b.score - a.score)
}

const findActive = async () => {
  const now = new Date().toISOString()
  const all = await Challenge.findAll({ order: [['startsAt', 'DESC']] })
  return all.find(c => c.startsAt <= now && c.endsAt >= now) || null
}

export const getCurrentChallenge = async (userId) => {
  const challenge = await findActive()
  if (!challenge) return { challenge: null }
  const leaderboard = await scoreChallenge(challenge)
  const mine = userId ? leaderboard.find(r => r.userId === userId) : null
  return {
    challenge: toPlain(challenge),
    leaderboard: leaderboard.slice(0, 10),
    participants: leaderboard.length,
    myScore: mine ? mine.score : 0,
  }
}

export const listChallenges = async () => {
  const all = await Challenge.findAll({ order: [['startsAt', 'DESC']] })
  return all.map(toPlain)
}

export const createChallenge = async ({ title, description, kind, threshold, durationDays }, createdBy) => {
  const now = new Date()
  const created = await Challenge.create({
    title,
    description,
    kind,
    threshold,
    startsAt: now.toISOString(),
    endsAt: new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString(),
    createdBy,
  })
  return toPlain(created)
}

export const deleteChallenge = async (id) => {
  const removed = await Challenge.destroy({ where: { id } })
  return removed > 0
}
