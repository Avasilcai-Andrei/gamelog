import { Op } from 'sequelize'
import { Achievement, UserAchievement, AchievementMeta, Game, User } from '../db/index.js'

const toPlain = (instance) => (instance ? instance.get({ plain: true }) : instance)

const RAWG_KEY = process.env.RAWG_KEY || process.env.VITE_RAWG_KEY || ''
const RAWG_BASE = 'https://api.rawg.io/api'
const MAX_PAGES = 6 // safety cap: up to 6 * 40 = 240 achievements

// Rare achievements (low global unlock %) are worth more. A 1%-of-players
// achievement ≈ 99 points; a 95%-of-players one ≈ 5. This is what makes the
// ranking skill-based rather than time-based.
const computeWeight = (percent) => {
  const p = Number(percent)
  if (!Number.isFinite(p)) return 1
  return Math.max(1, Math.round((100 - p) * 100) / 100)
}

// Pull every achievement for a RAWG game id, following pagination.
const fetchFromRawg = async (rawgId) => {
  if (!RAWG_KEY || !rawgId) return []
  const all = []
  let url = `${RAWG_BASE}/games/${encodeURIComponent(rawgId)}/achievements?key=${RAWG_KEY}&page_size=40`
  for (let i = 0; i < MAX_PAGES && url; i++) {
    let data
    try {
      const res = await fetch(url)
      if (!res.ok) break
      data = await res.json()
    } catch {
      break
    }
    for (const a of data.results || []) {
      all.push({
        externalId: String(a.id),
        name: a.name || 'Untitled',
        description: a.description || '',
        image: a.image || '',
        percent: Number(a.percent) || 0,
        weight: computeWeight(a.percent),
      })
    }
    url = data.next || null
  }
  return all
}

// Resolve a RAWG id for a title: prefer the caller-supplied one, else borrow it
// from any owned game row whose normalized title matches.
const resolveRawgId = async (gameKey, suppliedRawgId) => {
  if (suppliedRawgId) return String(suppliedRawgId)
  const games = await Game.findAll({ where: { rawgId: { [Op.ne]: null } }, attributes: ['title', 'rawgId'] })
  const match = games.find(g => String(g.title || '').trim().toLowerCase() === gameKey)
  return match ? String(match.rawgId) : null
}

export const getCatalog = async (gameKey, suppliedRawgId) => {
  const existing = await Achievement.findAll({ where: { gameKey }, order: [['weight', 'DESC']] })
  if (existing.length > 0) return existing.map(toPlain)

  // Not cached yet — try to populate from RAWG.
  const rawgId = await resolveRawgId(gameKey, suppliedRawgId)
  const fetched = await fetchFromRawg(rawgId)

  // Record that we attempted a fetch (even if empty) so we don't hammer RAWG.
  await AchievementMeta.upsert({ gameKey, rawgId: rawgId || null, fetchedAt: new Date().toISOString() })

  if (fetched.length === 0) return []

  const rows = fetched.map(a => ({ gameKey, ...a }))
  await Achievement.bulkCreate(rows, { ignoreDuplicates: true })
  const saved = await Achievement.findAll({ where: { gameKey }, order: [['weight', 'DESC']] })
  return saved.map(toPlain)
}

export const getUserAchievements = async (gameKey, userId) => {
  const rows = await UserAchievement.findAll({ where: { gameKey, userId }, attributes: ['achievementId'] })
  return rows.map(r => r.achievementId)
}

// Replace the user's unlocked set for this game with `achievementIds`. Only ids
// that exist in the catalog are accepted.
export const setUserAchievements = async (gameKey, userId, achievementIds) => {
  const catalog = await Achievement.findAll({ where: { gameKey }, attributes: ['id'] })
  const valid = new Set(catalog.map(a => a.id))
  const target = [...new Set(achievementIds)].filter(id => valid.has(id))

  const current = await UserAchievement.findAll({ where: { gameKey, userId }, attributes: ['achievementId'] })
  const currentSet = new Set(current.map(r => r.achievementId))
  const targetSet = new Set(target)

  const toAdd = target.filter(id => !currentSet.has(id))
  const toRemove = [...currentSet].filter(id => !targetSet.has(id))

  if (toRemove.length > 0) {
    await UserAchievement.destroy({ where: { gameKey, userId, achievementId: { [Op.in]: toRemove } } })
  }
  if (toAdd.length > 0) {
    await UserAchievement.bulkCreate(
      toAdd.map(achievementId => ({ userId, gameKey, achievementId, unlockedAt: new Date().toISOString() })),
      { ignoreDuplicates: true },
    )
  }
  return target
}

// Global Vauntd Rating: each user's rating = Σ weight of every achievement they
// have unlocked across all games (breadth × difficulty). Returns a ranked board
// with usernames joined in. Aggregated in JS so it stays dialect-agnostic.
export const getGlobalRating = async () => {
  const [unlocks, catalog, users] = await Promise.all([
    UserAchievement.findAll({ attributes: ['userId', 'achievementId', 'gameKey'] }),
    Achievement.findAll({ attributes: ['id', 'weight'] }),
    User.findAll({ attributes: ['id', 'username'] }),
  ])
  const weightById = new Map(catalog.map(a => [a.id, a.weight]))
  const nameById = new Map(users.map(u => [u.id, u.username]))

  const byUser = new Map()
  for (const u of unlocks) {
    const w = weightById.get(u.achievementId)
    if (w === undefined) continue
    const entry = byUser.get(u.userId) || { userId: u.userId, rating: 0, achievementsEarned: 0, games: new Set() }
    entry.rating += w
    entry.achievementsEarned += 1
    entry.games.add(u.gameKey)
    byUser.set(u.userId, entry)
  }

  return [...byUser.values()]
    .map(e => ({
      userId: e.userId,
      username: nameById.get(e.userId) || e.userId,
      rating: Math.round(e.rating),
      achievementsEarned: e.achievementsEarned,
      gamesRanked: e.games.size,
    }))
    .sort((a, b) => b.rating - a.rating || b.achievementsEarned - a.achievementsEarned)
}

// A single user's rating and global rank (1-based), e.g. "#3 of 50".
export const getUserRating = async (userId) => {
  const board = await getGlobalRating()
  const idx = board.findIndex(r => r.userId === userId)
  if (idx === -1) {
    return { userId, rating: 0, rank: null, total: board.length, achievementsEarned: 0, gamesRanked: 0 }
  }
  return { ...board[idx], rank: idx + 1, total: board.length }
}

// Skill ranking for a game: each user's score = Σ weight of unlocked achievements.
export const getRanking = async (gameKey) => {
  const [catalog, unlocks] = await Promise.all([
    Achievement.findAll({ where: { gameKey }, attributes: ['id', 'weight'] }),
    UserAchievement.findAll({ where: { gameKey }, attributes: ['userId', 'achievementId'] }),
  ])
  const weightById = new Map(catalog.map(a => [a.id, a.weight]))
  const totalCount = catalog.length
  const maxScore = catalog.reduce((sum, a) => sum + a.weight, 0)

  const byUser = new Map()
  for (const u of unlocks) {
    const w = weightById.get(u.achievementId)
    if (w === undefined) continue
    const entry = byUser.get(u.userId) || { userId: u.userId, score: 0, unlockedCount: 0 }
    entry.score += w
    entry.unlockedCount += 1
    byUser.set(u.userId, entry)
  }

  return {
    totalCount,
    maxScore: Math.round(maxScore * 100) / 100,
    rankings: [...byUser.values()]
      .map(e => ({
        userId: e.userId,
        score: Math.round(e.score * 100) / 100,
        unlockedCount: e.unlockedCount,
        completionPct: totalCount > 0 ? Math.round((e.unlockedCount / totalCount) * 100) : 0,
      }))
      .sort((a, b) => b.score - a.score),
  }
}
