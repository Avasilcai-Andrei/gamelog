import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { initDatabase, resetDatabase, ActionLog, Observation, User } from '../src/db/index.js'
import { recordAction, detectAnomaly, RATE_LIMIT_THRESHOLD } from '../src/services/auditService.js'

const app = createApp(() => {})

beforeAll(async () => {
  await initDatabase({ force: true })
})

describe('Gold action logging', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it('persists an entry per request when a valid Bearer token is set', async () => {
    const admin = await User.findOne({ where: { username: 'admin' } })
    const loginRes = await request(app)
      .post('/api/users/login').send({ username: 'admin', password: 'admin' })
    const token = loginRes.body.token

    const before = await ActionLog.count()
    await request(app)
      .get('/api/games')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    await new Promise(r => setTimeout(r, 50))
    const after = await ActionLog.count()

    expect(after).toBeGreaterThan(before)
    const last = await ActionLog.findOne({ order: [['timestamp', 'DESC']] })
    expect(last.userId).toBe(admin.id)
    expect(last.roleName).toBe('admin')
    expect(last.action).toMatch(/GET .*\/games/)
    expect(last.statusCode).toBe(200)
  })

  it('does not log when no Authorization header is sent', async () => {
    const before = await ActionLog.count()
    await request(app).get('/api/games').expect(200)
    await new Promise(r => setTimeout(r, 50))
    const after = await ActionLog.count()
    expect(after).toBe(before)
  })

  it('captures roleName snapshot, target, and ipAddress on the log row', async () => {
    const admin = await User.findOne({ where: { username: 'admin' } })
    const log = await recordAction({
      userId: admin.id,
      action: 'POST /api/games',
      target: 'g_xyz',
      statusCode: 201,
      ipAddress: '127.0.0.1',
    })
    expect(log).toBeTruthy()
    expect(log.roleName).toBe('admin')
    expect(log.target).toBe('g_xyz')
    expect(log.ipAddress).toBe('127.0.0.1')
    expect(log.timestamp).toBeTruthy()
  })
})

describe('Gold anomaly detection (observation list)', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it('does not flag a user below the rate threshold', async () => {
    const player = await User.findOne({ where: { username: 'player' } })
    for (let i = 0; i < 5; i++) {
      await recordAction({ userId: player.id, action: `GET /api/games`, target: '', statusCode: 200, ipAddress: '' })
    }
    const obs = await Observation.findAll({ where: { userId: player.id } })
    expect(obs.length).toBe(0)
  })

  it('flags a user once the rate threshold is exceeded', async () => {
    const player = await User.findOne({ where: { username: 'player' } })
    for (let i = 0; i < RATE_LIMIT_THRESHOLD + 5; i++) {
      await recordAction({ userId: player.id, action: 'GET /api/games', target: '', statusCode: 200, ipAddress: '' })
    }
    const obs = await Observation.findAll({ where: { userId: player.id } })
    expect(obs.length).toBeGreaterThanOrEqual(1)
    expect(obs[0].windowCount).toBeGreaterThanOrEqual(RATE_LIMIT_THRESHOLD)
    expect(obs[0].resolved).toBe(false)
  })

  it('respects the cooldown — only one observation per active window', async () => {
    const player = await User.findOne({ where: { username: 'player' } })
    for (let i = 0; i < RATE_LIMIT_THRESHOLD + 10; i++) {
      await recordAction({ userId: player.id, action: 'GET /api/games', target: '', statusCode: 200, ipAddress: '' })
    }
    // detectAnomaly is called inside recordAction; calling again should not duplicate.
    await detectAnomaly(player.id)
    await detectAnomaly(player.id)
    const obs = await Observation.findAll({ where: { userId: player.id } })
    expect(obs.length).toBe(1)
  })
})

describe('Gold admin audit endpoints', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it('GET /api/logs requires admin:access permission', async () => {
    const playerLogin = await request(app)
      .post('/api/users/login').send({ username: 'player', password: 'playerpass' })
    await request(app).get('/api/logs').expect(401)
    await request(app).get('/api/logs')
      .set('Authorization', `Bearer ${playerLogin.body.token}`).expect(403)
  })

  it('GET /api/logs returns paginated logs to an admin', async () => {
    const admin = await User.findOne({ where: { username: 'admin' } })
    const adminLogin = await request(app)
      .post('/api/users/login').send({ username: 'admin', password: 'admin' })
    await recordAction({ userId: admin.id, action: 'GET /api/games', target: '', statusCode: 200, ipAddress: '' })
    const res = await request(app)
      .get('/api/logs?pageSize=10')
      .set('Authorization', `Bearer ${adminLogin.body.token}`)
      .expect(200)
    expect(Array.isArray(res.body.items)).toBe(true)
    expect(res.body.total).toBeGreaterThan(0)
  })

  it('GET /api/observations and POST /api/observations/:id/resolve work for admin', async () => {
    const admin = await User.findOne({ where: { username: 'admin' } })
    const player = await User.findOne({ where: { username: 'player' } })
    const adminLogin = await request(app)
      .post('/api/users/login').send({ username: 'admin', password: 'admin' })
    for (let i = 0; i < RATE_LIMIT_THRESHOLD + 2; i++) {
      await recordAction({ userId: player.id, action: 'GET /api/games', target: '', statusCode: 200, ipAddress: '' })
    }

    const list = await request(app)
      .get('/api/observations')
      .set('Authorization', `Bearer ${adminLogin.body.token}`)
      .expect(200)
    expect(list.body.items.length).toBeGreaterThanOrEqual(1)

    const obsId = list.body.items[0].id
    const res = await request(app)
      .post(`/api/observations/${obsId}/resolve`)
      .set('Authorization', `Bearer ${adminLogin.body.token}`)
      .expect(200)
    expect(res.body.resolved).toBe(true)

    const after = await request(app)
      .get('/api/observations?resolved=false')
      .set('Authorization', `Bearer ${adminLogin.body.token}`)
      .expect(200)
    expect(after.body.items.find(o => o.id === obsId)).toBeUndefined()
  })

  it('observations include the joined user info', async () => {
    const player = await User.findOne({ where: { username: 'player' } })
    const adminLogin = await request(app)
      .post('/api/users/login').send({ username: 'admin', password: 'admin' })
    for (let i = 0; i < RATE_LIMIT_THRESHOLD + 2; i++) {
      await recordAction({ userId: player.id, action: 'GET /api/games', target: '', statusCode: 200, ipAddress: '' })
    }
    const res = await request(app)
      .get('/api/observations')
      .set('Authorization', `Bearer ${adminLogin.body.token}`)
      .expect(200)
    const flagged = res.body.items.find(o => o.userId === player.id)
    expect(flagged).toBeTruthy()
    expect(flagged.user?.username).toBe('player')
  })
})
