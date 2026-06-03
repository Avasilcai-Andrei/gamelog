import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { initDatabase, resetDatabase } from '../src/db/index.js'
import { signToken, verifyToken } from '../src/utils/jwt.js'
import { loginUser, registerUser } from '../src/services/userService.js'

vi.mock('../src/services/emailService.js', () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
}))

const app = createApp(() => {})

beforeAll(async () => {
  await initDatabase({ force: true })
})

describe('JWT utility', () => {
  it('signs and verifies a token round-trip', () => {
    const payload = { userId: 'u1', username: 'test', roleName: 'user', permissions: ['games:read'] }
    const token = signToken(payload)
    expect(typeof token).toBe('string')
    expect(token.split('.').length).toBe(3)

    const result = verifyToken(token)
    expect(result.ok).toBe(true)
    expect(result.payload.userId).toBe('u1')
    expect(result.payload.permissions).toContain('games:read')
  })

  it('rejects a tampered token', () => {
    const token = signToken({ userId: 'u1' })
    const [h, p, s] = token.split('.')
    const tampered = `${h}.${p}tampered.${s}`
    expect(verifyToken(tampered).ok).toBe(false)
  })

  it('rejects an expired token', async () => {
    const expired = signToken({ userId: 'x' })
    // Override: sign with expiresIn 0s to force expiry
    const jwt = await import('jsonwebtoken')
    const expiredToken = jwt.default.sign({ userId: 'x' }, 'gamelog-dev-secret-change-in-production', { expiresIn: 0 })
    await new Promise(r => setTimeout(r, 10))
    expect(verifyToken(expiredToken).ok).toBe(false)
  })
})

describe('Registration endpoint', () => {
  beforeEach(async () => { await resetDatabase() })

  it('registers a new user and returns a JWT', async () => {
    const res = await request(app)
      .post('/api/users/register')
      .send({ username: 'newuser', email: 'new@test.io', password: 'pass1234' })
      .expect(201)

    expect(res.body.username).toBe('newuser')
    expect(res.body).not.toHaveProperty('password')
    expect(typeof res.body.token).toBe('string')
    expect(res.body.token.split('.').length).toBe(3)
  })

  it('the registration token decodes to the correct user/role', async () => {
    const res = await request(app)
      .post('/api/users/register')
      .send({ username: 'tokentest', email: 'tt@test.io', password: 'pass' })
      .expect(201)

    const decoded = verifyToken(res.body.token)
    expect(decoded.ok).toBe(true)
    expect(decoded.payload.username).toBe('tokentest')
    expect(decoded.payload.roleName).toBe('user')
    expect(decoded.payload.permissions).toContain('games:read')
    expect(decoded.payload.permissions).not.toContain('admin:access')
  })

  it('rejects duplicate username with 409', async () => {
    await request(app).post('/api/users/register')
      .send({ username: 'dup', email: 'dup@test.io', password: 'pass' }).expect(201)
    await request(app).post('/api/users/register')
      .send({ username: 'dup', email: 'other@test.io', password: 'pass' }).expect(409)
  })

  it('rejects missing fields with 400', async () => {
    await request(app).post('/api/users/register')
      .send({ username: '', email: '', password: '' }).expect(400)
  })
})

describe('Login endpoint', () => {
  beforeEach(async () => { await resetDatabase() })

  it('returns a JWT for valid admin credentials', async () => {
    const res = await request(app)
      .post('/api/users/login')
      .send({ username: 'admin', password: 'admin' })
      .expect(200)

    expect(typeof res.body.token).toBe('string')
    const decoded = verifyToken(res.body.token)
    expect(decoded.ok).toBe(true)
    expect(decoded.payload.roleName).toBe('admin')
    expect(decoded.payload.permissions).toContain('admin:access')
    expect(decoded.payload.permissions).toContain('generator:control')
  })

  it('returns a JWT for valid user credentials', async () => {
    const res = await request(app)
      .post('/api/users/login')
      .send({ username: 'player', password: 'playerpass' })
      .expect(200)

    expect(typeof res.body.token).toBe('string')
    const decoded = verifyToken(res.body.token)
    expect(decoded.ok).toBe(true)
    expect(decoded.payload.roleName).toBe('user')
    expect(decoded.payload.permissions).not.toContain('admin:access')
  })

  it('rejects wrong password with 401 — no token issued', async () => {
    const res = await request(app)
      .post('/api/users/login')
      .send({ username: 'admin', password: 'wrong' })
      .expect(401)

    expect(res.body.token).toBeUndefined()
  })

  it('rejects unknown username with 401', async () => {
    await request(app)
      .post('/api/users/login')
      .send({ username: 'nobody', password: 'pass' })
      .expect(401)
  })
})

describe('Protected endpoints respect JWT', () => {
  beforeEach(async () => { await resetDatabase() })

  it('rejects requests with no token (401)', async () => {
    await request(app).post('/api/generator/start').send({}).expect(401)
    await request(app).get('/api/logs').expect(401)
    await request(app).get('/api/observations').expect(401)
  })

  it('rejects requests with a garbage token (401)', async () => {
    await request(app)
      .post('/api/generator/start')
      .set('Authorization', 'Bearer not.a.token')
      .send({})
      .expect(401)
  })

  it('rejects a user-role token on admin-only endpoints (403)', async () => {
    const res = await request(app)
      .post('/api/users/login')
      .send({ username: 'player', password: 'playerpass' })
    const token = res.body.token

    await request(app).get('/api/logs').set('Authorization', `Bearer ${token}`).expect(403)
    await request(app).get('/api/observations').set('Authorization', `Bearer ${token}`).expect(403)
    await request(app).post('/api/generator/start')
      .set('Authorization', `Bearer ${token}`).send({}).expect(403)
  })

  it('accepts an admin token on all protected endpoints', async () => {
    const res = await request(app)
      .post('/api/users/login')
      .send({ username: 'admin', password: 'admin' })
    const token = res.body.token

    await request(app).get('/api/logs').set('Authorization', `Bearer ${token}`).expect(200)
    await request(app).get('/api/observations').set('Authorization', `Bearer ${token}`).expect(200)
  })

  it('passwords are stored as bcrypt hashes (not plaintext)', async () => {
    const { User } = await import('../src/db/index.js')
    const admin = await User.findOne({ where: { username: 'admin' } })
    expect(admin.password).toMatch(/^\$2b\$/)
    expect(admin.password).not.toBe('admin')
  })
})

describe('OAuth — findOrCreateOAuthUser', () => {
  beforeEach(async () => { await resetDatabase() })

  it('creates a new user from a Google profile', async () => {
    const { findOrCreateOAuthUser } = await import('../src/services/userService.js')
    const profile = {
      id: 'google_123',
      provider: 'google',
      displayName: 'Test User',
      emails: [{ value: 'oauthuser@test.io' }],
      photos: [],
    }
    const result = await findOrCreateOAuthUser(profile)
    expect(result.ok).toBe(true)
    expect(result.data.user.oauthProvider).toBe('google')
    expect(result.data.user.oauthId).toBe('google_123')
    expect(typeof result.data.token).toBe('string')
    expect(result.data.token.split('.').length).toBe(3)
  })

  it('returns the same user on a second call with the same provider+id', async () => {
    const { findOrCreateOAuthUser } = await import('../src/services/userService.js')
    const profile = {
      id: 'google_456',
      provider: 'google',
      displayName: 'Returning User',
      emails: [{ value: 'returning@test.io' }],
      photos: [],
    }
    const first = await findOrCreateOAuthUser(profile)
    const second = await findOrCreateOAuthUser(profile)
    expect(first.data.user.id).toBe(second.data.user.id)
  })

  it('links an existing local account that has the same email', async () => {
    const { findOrCreateOAuthUser } = await import('../src/services/userService.js')
    const { User } = await import('../src/db/index.js')
    // Create a local user first
    await request(app)
      .post('/api/users/register')
      .send({ username: 'localuser', email: 'local@test.io', password: 'pass1234' })
    // OAuth login with the same email
    const profile = {
      id: 'google_link_789',
      provider: 'google',
      displayName: 'Local User',
      emails: [{ value: 'local@test.io' }],
      photos: [],
    }
    const result = await findOrCreateOAuthUser(profile)
    expect(result.ok).toBe(true)
    const user = await User.findOne({ where: { email: 'local@test.io' } })
    expect(user.oauthProvider).toBe('google')
    expect(user.oauthId).toBe('google_link_789')
  })
})

describe('Password reset flow', () => {
  beforeEach(async () => { await resetDatabase() })

  it('requestPasswordReset stores a hashed token and expiry in the DB', async () => {
    const { requestPasswordReset } = await import('../src/services/userService.js')
    const { User } = await import('../src/db/index.js')
    const result = await requestPasswordReset('admin@gamelog.local')
    expect(result.ok).toBe(true)
    const admin = await User.findOne({ where: { username: 'admin' } })
    expect(admin.resetToken).not.toBeNull()
    expect(admin.resetTokenExpires).not.toBeNull()
    expect(new Date(admin.resetTokenExpires) > new Date()).toBe(true)
  })

  it('requestPasswordReset returns ok:true even for an unknown email (no leak)', async () => {
    const { requestPasswordReset } = await import('../src/services/userService.js')
    const result = await requestPasswordReset('nobody@nowhere.com')
    expect(result.ok).toBe(true)
  })

  it('resetPassword with a valid token updates the password and clears the token', async () => {
    const crypto = await import('crypto')
    const { User } = await import('../src/db/index.js')
    const { resetPassword } = await import('../src/services/userService.js')
    const rawToken = crypto.randomBytes(32).toString('hex')
    const hash = crypto.createHash('sha256').update(rawToken).digest('hex')
    const admin = await User.findOne({ where: { username: 'admin' } })
    await admin.update({ resetToken: hash, resetTokenExpires: new Date(Date.now() + 15 * 60 * 1000) })

    const result = await resetPassword(rawToken, 'newpassword123')
    expect(result.ok).toBe(true)

    const updated = await User.findOne({ where: { username: 'admin' } })
    expect(updated.resetToken).toBeNull()
    expect(updated.resetTokenExpires).toBeNull()
    // Verify new password works
    const { loginUser } = await import('../src/services/userService.js')
    const loginResult = await loginUser({ username: 'admin', password: 'newpassword123' })
    expect(loginResult.ok).toBe(true)
  })

  it('resetPassword with an expired token returns ok:false', async () => {
    const crypto = await import('crypto')
    const { User } = await import('../src/db/index.js')
    const { resetPassword } = await import('../src/services/userService.js')
    const rawToken = crypto.randomBytes(32).toString('hex')
    const hash = crypto.createHash('sha256').update(rawToken).digest('hex')
    const admin = await User.findOne({ where: { username: 'admin' } })
    await admin.update({ resetToken: hash, resetTokenExpires: new Date(Date.now() - 1000) })

    const result = await resetPassword(rawToken, 'newpassword')
    expect(result.ok).toBe(false)
  })

  it('resetPassword with a wrong token returns ok:false', async () => {
    const { resetPassword } = await import('../src/services/userService.js')
    const result = await resetPassword('completelywrongtoken', 'newpassword')
    expect(result.ok).toBe(false)
  })
})

describe('Email verification flow', () => {
  beforeEach(async () => { await resetDatabase() })

  it('verifyEmail marks the user as verified and clears the token', async () => {
    const { User } = await import('../src/db/index.js')
    const { verifyEmail } = await import('../src/services/userService.js')
    const admin = await User.findOne({ where: { username: 'admin' } })
    await admin.update({ verificationToken: 'validtoken123', emailVerified: false })

    const result = await verifyEmail('validtoken123')
    expect(result.ok).toBe(true)

    const updated = await User.findOne({ where: { username: 'admin' } })
    expect(updated.emailVerified).toBe(true)
    expect(updated.verificationToken).toBeNull()
  })

  it('verifyEmail with an invalid token returns ok:false', async () => {
    const { verifyEmail } = await import('../src/services/userService.js')
    const result = await verifyEmail('notavalidtoken')
    expect(result.ok).toBe(false)
  })

  it('GET /api/auth/email-verify/:token returns 400 for an invalid token', async () => {
    await request(app)
      .get('/api/auth/email-verify/bogustoken')
      .expect(400)
  })
})
