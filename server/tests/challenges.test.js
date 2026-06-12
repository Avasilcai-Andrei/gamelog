import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import { initDatabase, resetDatabase, Challenge, User } from '../src/db/index.js'
import { getCatalog, setUserAchievements } from '../src/services/achievementService.js'
import {
  getCurrentChallenge, createChallenge, listChallenges, deleteChallenge,
} from '../src/services/challengeService.js'

const KEY = 'rawg game'
const rawgPage = {
  next: null,
  results: [
    { id: 1, name: 'No-Hit Run', description: 'hard', image: 'a.png', percent: '2.0' },   // weight 98
    { id: 2, name: 'First Steps', description: 'easy', image: 'b.png', percent: '90.0' },  // weight 10
  ],
}

beforeAll(async () => {
  process.env.RAWG_KEY = 'test-key'
  await initDatabase({ force: true })
})

beforeEach(async () => {
  await resetDatabase()
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => rawgPage })))
})

afterEach(() => vi.unstubAllGlobals())

describe('weekly challenge scoring', () => {
  it('rarity_under counts only in-window unlocks below the threshold', async () => {
    await Challenge.destroy({ where: {} }) // drop the auto-seeded one
    const catalog = await getCatalog(KEY, '999')
    const hard = catalog.find(a => a.name === 'No-Hit Run')   // 2%
    const easy = catalog.find(a => a.name === 'First Steps')  // 90%
    await User.create({ id: 'p1', username: 'P1', email: 'p1@t.local' })

    await Challenge.create({
      title: 'Rarity', description: '', kind: 'rarity_under', threshold: 10,
      startsAt: new Date(Date.now() - 3600_000).toISOString(),
      endsAt: new Date(Date.now() + 7 * 86400_000).toISOString(),
      createdBy: 'system',
    })

    await setUserAchievements(KEY, 'p1', [hard.id, easy.id]) // unlocked now, inside window

    const res = await getCurrentChallenge('p1')
    expect(res.challenge.title).toBe('Rarity')
    expect(res.myScore).toBe(1) // only the 2% achievement is < 10
    expect(res.leaderboard[0]).toMatchObject({ userId: 'p1', score: 1 })
  })

  it('count_any counts every in-window unlock', async () => {
    await Challenge.destroy({ where: {} })
    const catalog = await getCatalog(KEY, '999')
    await User.create({ id: 'p2', username: 'P2', email: 'p2@t.local' })
    await Challenge.create({
      title: 'Count', description: '', kind: 'count_any', threshold: 5,
      startsAt: new Date(Date.now() - 3600_000).toISOString(),
      endsAt: new Date(Date.now() + 86400_000).toISOString(),
      createdBy: 'system',
    })
    await setUserAchievements(KEY, 'p2', catalog.map(a => a.id))
    const res = await getCurrentChallenge('p2')
    expect(res.myScore).toBe(2)
  })

  it('reports no active challenge when the window is in the past', async () => {
    await Challenge.destroy({ where: {} })
    await Challenge.create({
      title: 'Old', description: '', kind: 'count_any', threshold: 1,
      startsAt: new Date(Date.now() - 10 * 86400_000).toISOString(),
      endsAt: new Date(Date.now() - 9 * 86400_000).toISOString(),
      createdBy: 'system',
    })
    const res = await getCurrentChallenge('whoever')
    expect(res.challenge).toBeNull()
  })

  it('createChallenge derives an end date and listing/deletion work', async () => {
    const created = await createChallenge(
      { title: 'New', description: 'd', kind: 'count_any', threshold: 3, durationDays: 7 }, 'admin')
    expect(created.title).toBe('New')
    expect(new Date(created.endsAt) > new Date(created.startsAt)).toBe(true)
    expect((await listChallenges()).some(c => c.id === created.id)).toBe(true)
    expect(await deleteChallenge(created.id)).toBe(true)
  })

  it('seeds a default active challenge on reset', async () => {
    const res = await getCurrentChallenge()
    expect(res.challenge).not.toBeNull()
    expect(res.challenge.title).toBe('Rarity Rush')
  })
})
