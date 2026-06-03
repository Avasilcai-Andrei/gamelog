import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { initDatabase, resetDatabase } from '../src/db/index.js'
import { User } from '../src/db/index.js'

const app = createApp(() => {})

beforeAll(async () => {
  await initDatabase({ force: true })
})

describe('REST API - CRUD and stats', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it('lists games with pagination', async () => {
    const response = await request(app).get('/api/games?page=1&pageSize=1').expect(200)
    expect(response.body.items).toHaveLength(1)
    expect(response.body.meta.total).toBeGreaterThan(0)
  })

  it('creates, updates and deletes game', async () => {
    const created = await request(app)
      .post('/api/games')
      .send({
        userId: 'u1',
        title: 'Test RPG',
        genre: 'RPG',
        status: 'playing',
        hours: 0,
        estimatedPlaytime: 20,
        coverUrl: '',
      })
      .expect(201)

    expect(created.body.id).toBeTruthy()

    const updated = await request(app)
      .patch(`/api/games/${created.body.id}`)
      .send({ status: 'completed' })
      .expect(200)

    expect(updated.body.status).toBe('completed')

    await request(app).delete(`/api/games/${created.body.id}`).expect(204)
    await request(app).get(`/api/games/${created.body.id}`).expect(404)
  })

  it('validates payload on create game', async () => {
    const res = await request(app)
      .post('/api/games')
      .send({ userId: '', title: '' })
      .expect(400)

    expect(res.body.error).toBeTruthy()
  })

  it('creates and updates sessions and recalculates game hours', async () => {
    const created = await request(app)
      .post('/api/games')
      .send({
        userId: 'u2',
        title: 'Session Game',
        genre: 'Indie',
        status: 'playing',
        hours: 0,
        estimatedPlaytime: 10,
        coverUrl: '',
      })
      .expect(201)

    const session = await request(app)
      .post(`/api/games/${created.body.id}/sessions`)
      .send({ userId: 'u2', date: '2025-02-12', duration: 120, notes: 'Good run' })
      .expect(201)

    const gameAfter = await request(app).get(`/api/games/${created.body.id}`).expect(200)
    expect(gameAfter.body.hours).toBe(2)

    await request(app)
      .patch(`/api/sessions/${session.body.id}`)
      .send({ duration: 60 })
      .expect(200)

    const gameAfterUpdate = await request(app).get(`/api/games/${created.body.id}`).expect(200)
    expect(gameAfterUpdate.body.hours).toBe(1)

    await request(app).delete(`/api/sessions/${session.body.id}`).expect(204)
  })

  it('lists sessions for a game via REST', async () => {
    const game = await request(app)
      .post('/api/games')
      .send({ userId: 'u3', title: 'Session List Game', genre: 'Indie', status: 'playing', hours: 0, estimatedPlaytime: 5, coverUrl: '' })
      .expect(201)

    await request(app)
      .post(`/api/games/${game.body.id}/sessions`)
      .send({ userId: 'u3', date: '2025-04-01', duration: 45, notes: 'First session' })
      .expect(201)

    const res = await request(app)
      .get(`/api/games/${game.body.id}/sessions?page=1&pageSize=10`)
      .expect(200)

    expect(res.body.items).toHaveLength(1)
    expect(res.body.meta.total).toBe(1)
    expect(res.body.items[0].notes).toBe('First session')
  })

  it('returns 404 when listing sessions for missing game', async () => {
    await request(app).get('/api/games/nonexistent/sessions').expect(404)
  })

  it('returns stats and leaderboard', async () => {
    const stats = await request(app).get('/api/stats').expect(200)
    expect(stats.body.totalGames).toBeGreaterThan(0)

    const leaderboard = await request(app).get('/api/leaderboard').expect(200)
    expect(Array.isArray(leaderboard.body)).toBe(true)
  })
})

describe('Silver async generator endpoints', () => {
  beforeEach(async () => { await resetDatabase() })

  it('starts and stops generator', async () => {
    const loginRes = await request(app)
      .post('/api/users/login')
      .send({ username: 'admin', password: 'admin' })
      .expect(200)
    const token = loginRes.body.token

    await request(app)
      .post('/api/generator/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ intervalMs: 500, batchSize: 1 })
      .expect(200)
    await request(app).get('/api/generator/status').expect(200)
    await request(app)
      .post('/api/generator/stop')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
  })
})

describe('Silver role-based login and users list', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it('logs in as admin and returns roles/permissions and a JWT', async () => {
    const res = await request(app)
      .post('/api/users/login')
      .send({ username: 'admin', password: 'admin' })
      .expect(200)

    expect(res.body.role?.name).toBe('admin')
    expect(Array.isArray(res.body.permissions)).toBe(true)
    expect(typeof res.body.token).toBe('string')
    expect(res.body.token.split('.').length).toBe(3)
  })

  it('logs in as normal user and returns restricted permissions and a JWT', async () => {
    const res = await request(app)
      .post('/api/users/login')
      .send({ username: 'player', password: 'playerpass' })
      .expect(200)

    expect(res.body.role?.name).toBe('user')
    expect(res.body.permissions).not.toContain('generator:control')
    expect(typeof res.body.token).toBe('string')
  })

  it('rejects wrong password with 401', async () => {
    await request(app)
      .post('/api/users/login')
      .send({ username: 'admin', password: 'wrong' })
      .expect(401)
  })

  it('rejects generator:start without token (401) and with user token (403)', async () => {
    await request(app)
      .post('/api/generator/start')
      .send({ intervalMs: 500, batchSize: 1 })
      .expect(401)

    const userLogin = await request(app)
      .post('/api/users/login')
      .send({ username: 'player', password: 'playerpass' })
    await request(app)
      .post('/api/generator/start')
      .set('Authorization', `Bearer ${userLogin.body.token}`)
      .send({ intervalMs: 500, batchSize: 1 })
      .expect(403)
  })

  it('lists users', async () => {
    const res = await request(app).get('/api/users').expect(200)
    expect(Array.isArray(res.body)).toBe(true)
  })
})

describe('Silver realtime chat', () => {
  it('posts and fetches messages', async () => {
    const msg = await request(app)
      .post('/api/chat/messages')
      .send({ userId: 'u_chat', username: 'chatter', content: 'hello' })
      .expect(201)

    expect(msg.body.content).toBe('hello')

    const list = await request(app).get('/api/chat/messages?limit=10').expect(200)
    expect(list.body.items.length).toBeGreaterThan(0)
  })
})
