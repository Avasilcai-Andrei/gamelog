import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { initDatabase, resetDatabase, ROLE_PERMISSIONS, PERMISSION_NAMES } from '../src/db/index.js'
import { signToken } from '../src/utils/jwt.js'
import {
  getCatalog, setUserAchievements, getUserAchievements, getRanking,
  getGlobalRating, getUserRating,
} from '../src/services/achievementService.js'
import { User } from '../src/db/index.js'

const app = createApp(() => {})

const userToken = (id) => signToken({
  userId: id, username: id, roleName: 'user', permissions: ROLE_PERMISSIONS.user,
})
const auth = (token) => ({ Authorization: `Bearer ${token}` })

const KEY = 'rawg game'
const ek = encodeURIComponent(KEY)

// A fake RAWG achievements payload: a 2%-rarity (hard) and a 90%-rarity (easy) one.
const rawgPage = {
  next: null,
  results: [
    { id: 1, name: 'No-Hit Run', description: 'Beat it without dying', image: 'a.png', percent: '2.0' },
    { id: 2, name: 'First Steps', description: 'Finish the tutorial', image: 'b.png', percent: '90.0' },
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

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('achievementService — catalog', () => {
  it('fetches from RAWG once, weights by rarity, then serves from cache', async () => {
    const catalog = await getCatalog(KEY, '999')
    expect(catalog).toHaveLength(2)

    const hard = catalog.find(a => a.name === 'No-Hit Run')
    const easy = catalog.find(a => a.name === 'First Steps')
    // weight = 100 - percent → rare achievement worth far more
    expect(hard.weight).toBe(98)
    expect(easy.weight).toBe(10)
    expect(global.fetch).toHaveBeenCalledTimes(1)

    // Second call is served from the DB cache, no extra RAWG hit.
    const again = await getCatalog(KEY, '999')
    expect(again).toHaveLength(2)
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })
})

describe('achievementService — user completions & ranking', () => {
  it('replaces a user set idempotently and ignores ids outside the catalog', async () => {
    const catalog = await getCatalog(KEY, '999')
    const ids = catalog.map(a => a.id)

    await setUserAchievements(KEY, 'u1', [ids[0], 'bogus-id'])
    expect((await getUserAchievements(KEY, 'u1')).sort()).toEqual([ids[0]])

    // Re-setting with both replaces (adds the second, keeps the first).
    await setUserAchievements(KEY, 'u1', ids)
    expect((await getUserAchievements(KEY, 'u1')).sort()).toEqual([...ids].sort())

    // Setting to empty clears them.
    await setUserAchievements(KEY, 'u1', [])
    expect(await getUserAchievements(KEY, 'u1')).toEqual([])
  })

  it('ranks the player with rarer achievements above one with more total unlocks', async () => {
    const catalog = await getCatalog(KEY, '999')
    const hard = catalog.find(a => a.name === 'No-Hit Run')
    const easy = catalog.find(a => a.name === 'First Steps')

    // skilled: only the 98-point achievement. casual: only the 10-point one.
    await setUserAchievements(KEY, 'skilled', [hard.id])
    await setUserAchievements(KEY, 'casual', [easy.id])

    const ranking = await getRanking(KEY)
    expect(ranking.totalCount).toBe(2)
    expect(ranking.maxScore).toBe(108)
    expect(ranking.rankings[0].userId).toBe('skilled')
    expect(ranking.rankings[0].score).toBe(98)
    expect(ranking.rankings[1].userId).toBe('casual')
  })
})

describe('global Vauntd Rating', () => {
  it('sums achievement weights across games and ranks users with usernames', async () => {
    const catalog = await getCatalog(KEY, '999')
    const hard = catalog.find(a => a.name === 'No-Hit Run')   // weight 98
    const easy = catalog.find(a => a.name === 'First Steps')  // weight 10

    await User.create({ id: 'pro', username: 'ProGamer', email: 'pro@test.local' })
    await User.create({ id: 'cas', username: 'Casual', email: 'cas@test.local' })

    await setUserAchievements(KEY, 'pro', [hard.id, easy.id]) // 108
    await setUserAchievements(KEY, 'cas', [easy.id])          // 10

    const board = await getGlobalRating()
    expect(board[0]).toMatchObject({ userId: 'pro', username: 'ProGamer', rating: 108, achievementsEarned: 2, gamesRanked: 1 })
    expect(board[1]).toMatchObject({ userId: 'cas', rating: 10 })

    const proRating = await getUserRating('pro')
    expect(proRating).toMatchObject({ rating: 108, rank: 1, total: 2 })
    const unranked = await getUserRating('nobody')
    expect(unranked).toMatchObject({ rating: 0, rank: null })
  })
})

describe('achievements over HTTP', () => {
  it('serves catalog publicly and gates writing one\'s own completions', async () => {
    const cat = await request(app).get(`/api/achievements/${ek}?rawgId=999`).expect(200)
    expect(cat.body.items).toHaveLength(2)
    const id = cat.body.items[0].id

    // Unauthenticated write is rejected.
    await request(app).put(`/api/achievements/${ek}/me`).send({ achievementIds: [id] }).expect(401)

    // Authenticated write works and round-trips.
    await request(app).put(`/api/achievements/${ek}/me`).set(auth(userToken('u1')))
      .send({ achievementIds: [id] }).expect(200)
    const mine = await request(app).get(`/api/achievements/${ek}/me`).set(auth(userToken('u1'))).expect(200)
    expect(mine.body.achievementIds).toEqual([id])

    const ranking = await request(app).get(`/api/achievements/${ek}/ranking`).expect(200)
    expect(ranking.body.rankings[0].userId).toBe('u1')
  })
})
