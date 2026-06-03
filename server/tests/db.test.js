import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { initDatabase, resetDatabase, sequelize, Game, Session, User, Role, Permission, ROLE_PERMISSIONS, PERMISSION_NAMES } from '../src/db/index.js'
import { listGames, getStats, getLeaderboard, createSession, deleteGame } from '../src/services/gameService.js'
import { registerUser, loginUser, listUsers } from '../src/services/userService.js'

beforeAll(async () => {
  await initDatabase({ force: true })
})

describe('DB layer - schema & relations', () => {
  beforeEach(async () => { await resetDatabase() })

  it('creates the expected tables via Sequelize sync (ORM-driven migration)', async () => {
    const tables = await sequelize.getQueryInterface().showAllTables()
    const lower = tables.map(t => String(t).toLowerCase())
    expect(lower).toContain('games')
    expect(lower).toContain('sessions')
    expect(lower).toContain('users')
    expect(lower).toContain('roles')
    expect(lower).toContain('permissions')
    expect(lower).toContain('role_permissions')
  })

  it('seeds two games and one session on reset', async () => {
    expect(await Game.count()).toBe(2)
    expect(await Session.count()).toBe(1)
  })

  it('cascade-deletes sessions when their parent game is removed', async () => {
    const game = await Game.create({
      userId: 'u_casc', title: 'Casc', genre: 'RPG',
      status: 'playing', estimatedPlaytime: 1, coverUrl: '',
    })
    await Session.create({ gameId: game.id, userId: 'u_casc', date: '2025-01-01', duration: 30, notes: 'x' })
    await Session.create({ gameId: game.id, userId: 'u_casc', date: '2025-01-02', duration: 45, notes: 'y' })

    expect(await Session.count({ where: { gameId: game.id } })).toBe(2)
    await deleteGame(game.id)
    expect(await Session.count({ where: { gameId: game.id } })).toBe(0)
  })
})

describe('Hours auto-recalc hook (ORM trigger equivalent)', () => {
  beforeEach(async () => { await resetDatabase() })

  it('recomputes Game.hours after Session create / update / destroy', async () => {
    const game = await Game.create({
      userId: 'u_hours', title: 'Hours', genre: 'Indie',
      status: 'playing', estimatedPlaytime: 1, coverUrl: '',
    })

    await createSession(game.id, { userId: 'u_hours', date: '2025-01-01', duration: 90, notes: 'a' })
    let fresh = await Game.findByPk(game.id)
    expect(fresh.hours).toBe(2) // 90 / 60 rounded = 2

    const s2 = await Session.create({ gameId: game.id, userId: 'u_hours', date: '2025-01-02', duration: 60, notes: 'b' })
    fresh = await Game.findByPk(game.id)
    expect(fresh.hours).toBe(3) // (90+60)/60 = 2.5 → 3

    await s2.update({ duration: 30 })
    fresh = await Game.findByPk(game.id)
    expect(fresh.hours).toBe(2) // (90+30)/60 = 2

    await s2.destroy()
    fresh = await Game.findByPk(game.id)
    expect(fresh.hours).toBe(2) // 90/60 rounded = 2 (rounded up from 1.5)
  })
})

describe('Filters & stats from DB', () => {
  beforeEach(async () => { await resetDatabase() })

  it('filters games by status, genre, userId, and search (LIKE)', async () => {
    await Game.create({ userId: 'a', title: 'Witcher 3',  genre: 'RPG',  status: 'completed', estimatedPlaytime: 100, coverUrl: '' })
    await Game.create({ userId: 'a', title: 'Doom',       genre: 'FPS',  status: 'playing',   estimatedPlaytime: 30,  coverUrl: '' })
    await Game.create({ userId: 'b', title: 'Hades',      genre: 'Indie',status: 'playing',   estimatedPlaytime: 40,  coverUrl: '' })

    const byUser = await listGames({ page: 1, pageSize: 10, userId: 'a' })
    expect(byUser.items.every(g => g.userId === 'a')).toBe(true)

    const byStatus = await listGames({ page: 1, pageSize: 10, status: 'playing' })
    expect(byStatus.items.every(g => g.status === 'playing')).toBe(true)

    const byGenre = await listGames({ page: 1, pageSize: 10, genre: 'RPG' })
    expect(byGenre.items.every(g => g.genre === 'RPG')).toBe(true)

    const search = await listGames({ page: 1, pageSize: 10, search: 'witcher' })
    expect(search.items.some(g => /Witcher/i.test(g.title))).toBe(true)
  })

  it('computes stats and leaderboard from the DB', async () => {
    await Game.create({ userId: 'lb', title: 'A', genre: 'RPG', status: 'completed', hours: 10, estimatedPlaytime: 10, coverUrl: '' })
    await Game.create({ userId: 'lb', title: 'B', genre: 'RPG', status: 'playing',   hours: 5,  estimatedPlaytime: 5,  coverUrl: '' })

    const stats = await getStats({ userId: 'lb' })
    expect(stats.totalGames).toBe(2)
    expect(stats.totalHours).toBe(15)
    expect(stats.completionRate).toBe(50)
    expect(stats.byStatus.completed).toBe(1)
    expect(stats.byGenre.RPG.games).toBe(2)
    expect(stats.byGenre.RPG.hours).toBe(15)

    const board = await getLeaderboard()
    const row = board.find(r => r.userId === 'lb')
    expect(row.totalGames).toBe(2)
    expect(row.totalHours).toBe(15)
    expect(row.completionRate).toBe(50)
  })
})

describe('User persistence (server-side)', () => {
  beforeEach(async () => { await resetDatabase() })

  it('registers, logs in, and lists users from the DB', async () => {
    const reg = await registerUser({ username: 'alice', email: 'alice@x.io', password: 'pw' })
    expect(reg.ok).toBe(true)
    expect(reg.user.username).toBe('alice')
    expect(reg.user).not.toHaveProperty('password')
    expect(typeof reg.token).toBe('string')
    expect(reg.token.split('.').length).toBe(3)

    const login = await loginUser({ username: 'alice', password: 'pw' })
    expect(login.ok).toBe(true)
    expect(typeof login.token).toBe('string')

    const wrong = await loginUser({ username: 'alice', password: 'nope' })
    expect(wrong.ok).toBe(false)

    const dup = await registerUser({ username: 'alice', email: 'alice2@x.io', password: 'pw' })
    expect(dup.ok).toBe(false)

    const all = await listUsers()
    expect(all.some(u => u.username === 'alice')).toBe(true)
    expect(await User.count()).toBe(all.length)
  })
})

describe('Roles & Permissions', () => {
  beforeEach(async () => { await resetDatabase() })

  it('seeds admin and user roles with the expected permissions', async () => {
    const admin = await Role.findOne({ where: { name: 'admin' }, include: [Permission] })
    const user  = await Role.findOne({ where: { name: 'user' },  include: [Permission] })
    expect(admin).toBeTruthy()
    expect(user).toBeTruthy()

    const adminPerms = admin.Permissions.map(p => p.name).sort()
    const userPerms  = user.Permissions.map(p => p.name).sort()
    expect(adminPerms).toEqual([...ROLE_PERMISSIONS.admin].sort())
    expect(userPerms).toEqual([...ROLE_PERMISSIONS.user].sort())
  })

  it('seeds an admin user with the admin role', async () => {
    const login = await loginUser({ username: 'admin', password: 'admin' })
    expect(login.ok).toBe(true)
    expect(login.user.role.name).toBe('admin')
    expect(login.user.permissions).toContain(PERMISSION_NAMES.GENERATOR_CONTROL)
    expect(login.user.permissions).toContain(PERMISSION_NAMES.ADMIN_ACCESS)
  })

  it('assigns the "user" role by default to newly registered users', async () => {
    const reg = await registerUser({ username: 'bob', email: 'bob@x.io', password: 'pw' })
    expect(reg.ok).toBe(true)
    expect(reg.user.role.name).toBe('user')
    expect(reg.user.permissions).toContain(PERMISSION_NAMES.GAMES_READ)
    expect(reg.user.permissions).not.toContain(PERMISSION_NAMES.GENERATOR_CONTROL)
    expect(reg.user.permissions).not.toContain(PERMISSION_NAMES.ADMIN_ACCESS)
  })

  it('returns role + permissions on login', async () => {
    await registerUser({ username: 'carol', email: 'carol@x.io', password: 'pw' })
    const login = await loginUser({ username: 'carol', password: 'pw' })
    expect(login.ok).toBe(true)
    expect(login.user.role).toMatchObject({ name: 'user' })
    expect(Array.isArray(login.user.permissions)).toBe(true)
  })

  it('does not leak password in any user list response', async () => {
    await registerUser({ username: 'dave', email: 'dave@x.io', password: 'secret' })
    const all = await listUsers()
    for (const u of all) {
      expect(u).not.toHaveProperty('password')
      expect(u).toHaveProperty('role')
      expect(u).toHaveProperty('permissions')
    }
  })

  it('permission/role uniqueness is enforced by the schema', async () => {
    await expect(Role.create({ name: 'admin' })).rejects.toThrow()
    await expect(Permission.create({ name: PERMISSION_NAMES.GAMES_READ })).rejects.toThrow()
  })
})
