import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { initDatabase, resetDatabase, ROLE_PERMISSIONS, PERMISSION_NAMES } from '../src/db/index.js'
import { signToken } from '../src/utils/jwt.js'
import {
  getLore, createNode, updateNode, createEdge, deleteNode,
  setMeta, getMeta, createProposal, voteProposal, listProposals,
} from '../src/services/loreService.js'

process.env.LORE_VOTE_THRESHOLD = '2'

const app = createApp(() => {})

const adminToken = signToken({
  userId: 'admin1', username: 'admin', roleName: 'admin',
  permissions: Object.values(PERMISSION_NAMES),
})
const userToken = (id) => signToken({
  userId: id, username: id, roleName: 'user', permissions: ROLE_PERMISSIONS.user,
})

const auth = (token) => ({ Authorization: `Bearer ${token}` })
const KEY = 'elden ring'
const ek = encodeURIComponent(KEY)

beforeAll(async () => {
  await initDatabase({ force: true })
})

beforeEach(async () => {
  await resetDatabase()
})

describe('loreService — map', () => {
  it('creates, updates and reads nodes/edges/meta scoped by gameKey', async () => {
    const a = await createNode(KEY, { label: 'Stormveil', type: 'dungeon', description: 'Castle', x: 30, y: 40 })
    const b = await createNode(KEY, { label: 'Roundtable', type: 'shop', description: 'Hub', x: 60, y: 50 })
    await createNode('other game', { label: 'X', type: 'boss', description: 'Boss', x: 10, y: 10 })

    expect((await createEdge(KEY, { fromNodeId: a.id, toNodeId: b.id })).error).toBeUndefined()
    await updateNode(KEY, a.id, { description: 'Legacy dungeon' })
    await setMeta(KEY, { backgroundUrl: 'https://maps.test/eldenring.png', updatedBy: 'admin' })

    const lore = await getLore(KEY)
    expect(lore.nodes).toHaveLength(2)
    expect(lore.edges).toHaveLength(1)
    expect(lore.nodes.find(n => n.id === a.id).description).toBe('Legacy dungeon')
    expect(lore.meta.backgroundUrl).toBe('https://maps.test/eldenring.png')
    expect((await getMeta(KEY)).backgroundUrl).toBe('https://maps.test/eldenring.png')
  })

  it('deleting a node cascades its edges', async () => {
    const a = await createNode(KEY, { label: 'A', type: 'boss', description: 'a', x: 1, y: 1 })
    const b = await createNode(KEY, { label: 'B', type: 'item', description: 'b', x: 2, y: 2 })
    await createEdge(KEY, { fromNodeId: a.id, toNodeId: b.id })

    await deleteNode(KEY, a.id)
    const lore = await getLore(KEY)
    expect(lore.nodes).toHaveLength(1)
    expect(lore.edges).toHaveLength(0)
  })
})

describe('map RBAC over HTTP', () => {
  const node = { label: 'Limgrave', type: 'location', description: 'Starting zone', x: 25, y: 25 }

  it('lets any visitor read the map (nodes, edges, meta)', async () => {
    const res = await request(app).get(`/api/lore/${ek}`).expect(200)
    expect(res.body).toEqual({ nodes: [], edges: [], meta: { gameKey: KEY, backgroundUrl: '' } })
  })

  it('admin can create and patch a node; non-admin cannot', async () => {
    const created = await request(app).post(`/api/lore/${ek}/nodes`).set(auth(adminToken)).send(node).expect(201)
    expect(created.body.createdBy).toBe('admin')
    await request(app).patch(`/api/lore/${ek}/nodes/${created.body.id}`).set(auth(adminToken)).send({ label: 'West Limgrave' }).expect(200)
    await request(app).post(`/api/lore/${ek}/nodes`).set(auth(userToken('u1'))).send(node).expect(403)
    await request(app).post(`/api/lore/${ek}/nodes`).send(node).expect(401)
  })

  it('admin can set the background image', async () => {
    const res = await request(app).put(`/api/lore/${ek}/meta`).set(auth(adminToken)).send({ backgroundUrl: 'https://maps.test/m.png' }).expect(200)
    expect(res.body.backgroundUrl).toBe('https://maps.test/m.png')
    await request(app).put(`/api/lore/${ek}/meta`).set(auth(userToken('u1'))).send({ backgroundUrl: 'https://x.test/y.png' }).expect(403)
  })
})

describe('correction proposals + voting', () => {
  it('reaches approval after threshold votes and admin apply executes the change', async () => {
    // A normal user proposes adding a pin.
    const created = await request(app)
      .post(`/api/lore/${ek}/proposals`)
      .set(auth(userToken('alice')))
      .send({ kind: 'add', reason: 'Missing boss', payload: { label: 'Margit', type: 'boss', description: 'Fell Omen', x: 20, y: 30 } })
      .expect(201)
    expect(created.body.status).toBe('open')

    // Threshold is 2 — two distinct users vote.
    await request(app).post(`/api/lore/${ek}/proposals/${created.body.id}/vote`).set(auth(userToken('alice'))).expect(200)
    const second = await request(app).post(`/api/lore/${ek}/proposals/${created.body.id}/vote`).set(auth(userToken('bob'))).expect(200)
    expect(second.body.status).toBe('approved')
    expect(second.body.votes).toBe(2)

    // Admin applies → the node is created on the map.
    await request(app).post(`/api/lore/${ek}/proposals/${created.body.id}/apply`).set(auth(adminToken)).expect(200)
    const lore = await getLore(KEY)
    expect(lore.nodes.some(n => n.label === 'Margit')).toBe(true)
  })

  it('a user can only vote once (no double count)', async () => {
    const p = await createProposal(KEY, { kind: 'add', payload: { label: 'N', type: 'item', description: 'd', x: 5, y: 5 }, reason: 'r', createdBy: 'alice' })
    await voteProposal(KEY, p.id, 'alice')
    await voteProposal(KEY, p.id, 'alice')
    const [listed] = await listProposals(KEY)
    expect(listed.votes).toBe(1)
  })

  it('non-admins cannot apply or reject', async () => {
    const p = await createProposal(KEY, { kind: 'delete', targetNodeId: 'x', payload: {}, reason: 'r', createdBy: 'alice' })
    await request(app).post(`/api/lore/${ek}/proposals/${p.id}/apply`).set(auth(userToken('alice'))).expect(403)
    await request(app).post(`/api/lore/${ek}/proposals/${p.id}/reject`).set(auth(userToken('alice'))).expect(403)
  })

  it('rejects proposing/voting without auth', async () => {
    await request(app).post(`/api/lore/${ek}/proposals`).send({ kind: 'add', reason: 'r', payload: { label: 'L', type: 'item', description: 'd', x: 1, y: 1 } }).expect(401)
  })
})

describe('lore seeding', () => {
  it('grants lore:write to admin only', () => {
    expect(ROLE_PERMISSIONS.admin).toContain(PERMISSION_NAMES.LORE_WRITE)
    expect(ROLE_PERMISSIONS.user).not.toContain(PERMISSION_NAMES.LORE_WRITE)
  })
})
