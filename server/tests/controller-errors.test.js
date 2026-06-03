import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { initDatabase, resetDatabase, User } from '../src/db/index.js'
import { registerUser } from '../src/services/userService.js'

const app = createApp(() => {})

beforeAll(async () => {
  await initDatabase({ force: true })
})

describe('Controller error paths', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it('returns 404 for missing game on GET /api/games/:id', async () => {
    await request(app).get('/api/games/does_not_exist').expect(404)
  })

  it('returns 400 on invalid pagination query', async () => {
    const res = await request(app).get('/api/games?page=abc&pageSize=10').expect(400)
    expect(res.body.error).toBeTruthy()
  })

  it('returns 400 on invalid update payload', async () => {
    const create = await request(app)
      .post('/api/games')
      .send({ userId: 'u1', title: 'X', genre: 'RPG', status: 'playing', hours: 0, estimatedPlaytime: 5, coverUrl: '' })
      .expect(201)

    await request(app)
      .patch(`/api/games/${create.body.id}`)
      .send({ status: 'invalid_status' })
      .expect(400)
  })

  it('returns 404 when updating missing game', async () => {
    await request(app)
      .patch('/api/games/missing')
      .send({ status: 'completed' })
      .expect(404)
  })

  it('returns 404 when deleting missing game', async () => {
    await request(app).delete('/api/games/missing').expect(404)
  })

  it('returns 404 when posting session for missing game', async () => {
    await request(app)
      .post('/api/games/missing/sessions')
      .send({ userId: 'u', date: '2025-01-01', duration: 30, notes: 'x' })
      .expect(404)
  })

  it('returns 400 on invalid session payload', async () => {
    const game = await request(app)
      .post('/api/games')
      .send({ userId: 'u1', title: 'Y', genre: 'RPG', status: 'playing', hours: 0, estimatedPlaytime: 5, coverUrl: '' })
      .expect(201)

    await request(app)
      .post(`/api/games/${game.body.id}/sessions`)
      .send({ userId: '', date: '', duration: -1 })
      .expect(400)
  })

  it('returns 404 when patching missing session', async () => {
    await request(app)
      .patch('/api/sessions/missing')
      .send({ duration: 30 })
      .expect(404)
  })

  it('returns 404 when deleting missing session', async () => {
    await request(app).delete('/api/sessions/missing').expect(404)
  })

  it('returns 400 on invalid session update payload', async () => {
    await request(app)
      .patch('/api/sessions/anything')
      .send({ duration: 'not-a-number' })
      .expect(400)
  })

  it('returns user-scoped stats when userId provided', async () => {
    await request(app)
      .post('/api/games')
      .send({ userId: 'scoped_user', title: 'Z', genre: 'RPG', status: 'completed', hours: 5, estimatedPlaytime: 5, coverUrl: '' })
      .expect(201)

    const res = await request(app).get('/api/stats?userId=scoped_user').expect(200)
    expect(res.body.totalGames).toBe(1)
    expect(res.body.byStatus.completed).toBe(1)
  })

  it('exposes /api/health endpoint', async () => {
    await request(app).get('/api/health').expect(200)
  })
})

describe('Permission-gated endpoints (generator control)', () => {
  beforeEach(async () => { await resetDatabase() })

  it('rejects with 401 when no Authorization header is sent', async () => {
    await request(app).post('/api/generator/start').send({}).expect(401)
    await request(app).post('/api/generator/stop').send({}).expect(401)
  })

  it('rejects with 401 when Bearer token is invalid', async () => {
    await request(app)
      .post('/api/generator/start')
      .set('Authorization', 'Bearer not.valid.token')
      .send({})
      .expect(401)
  })

  it('rejects with 403 for a normal user without the generator:control permission', async () => {
    const reg = await registerUser({ username: 'eve', email: 'eve@x.io', password: 'pw' })
    const res = await request(app)
      .post('/api/generator/start')
      .set('Authorization', `Bearer ${reg.token}`)
      .send({})
      .expect(403)
    expect(res.body.error).toMatch(/generator:control/)
  })

  it('allows the admin user to control the generator', async () => {
    const loginRes = await request(app)
      .post('/api/users/login')
      .send({ username: 'admin', password: 'admin' })
    const token = loginRes.body.token
    await request(app)
      .post('/api/generator/start')
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(200)
    await request(app)
      .post('/api/generator/stop')
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(200)
  })
})
