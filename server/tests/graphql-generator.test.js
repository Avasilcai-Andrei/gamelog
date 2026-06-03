import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest'
import { graphql } from 'graphql'
import { schema, root } from '../src/graphql/schema.js'
import { initDatabase, resetDatabase } from '../src/db/index.js'
import { generatorStatus, stopGenerator } from '../src/realtime/generator.js'

const gql = (query, variables = {}) =>
  graphql({ schema, rootValue: root, source: query, variableValues: variables })

beforeAll(async () => {
  await initDatabase({ force: true })
})

describe('GraphQL - generator + leaderboard bridge', () => {
  beforeEach(async () => {
    await resetDatabase()
    if (generatorStatus().running) stopGenerator()
  })

  afterEach(() => {
    if (generatorStatus().running) stopGenerator()
  })

  it('starts and stops generator via GraphQL', async () => {
    const start = await gql(`mutation { startGenerator(intervalMs: 5000, batchSize: 1) { ok intervalMs batchSize error } }`)
    expect(start.data.startGenerator.ok).toBe(true)
    expect(start.data.startGenerator.intervalMs).toBe(5000)

    const stop = await gql(`mutation { stopGenerator { ok error } }`)
    expect(stop.data.stopGenerator.ok).toBe(true)
  })

  it('returns ok=false when starting twice via GraphQL', async () => {
    await gql(`mutation { startGenerator(intervalMs: 5000, batchSize: 1) { ok } }`)
    const second = await gql(`mutation { startGenerator(intervalMs: 5000, batchSize: 1) { ok error } }`)
    expect(second.data.startGenerator.ok).toBe(false)
    expect(second.data.startGenerator.error).toBeTruthy()
  })

  it('returns ok=false when stopping while not running', async () => {
    const stop = await gql(`mutation { stopGenerator { ok error } }`)
    expect(stop.data.stopGenerator.ok).toBe(false)
    expect(stop.data.stopGenerator.error).toBeTruthy()
  })

  it('returns leaderboard with userId and totalGames', async () => {
    const res = await gql(`{ leaderboard { userId totalGames totalHours completionRate } }`)
    expect(Array.isArray(res.data.leaderboard)).toBe(true)
    expect(res.data.leaderboard.length).toBeGreaterThan(0)
  })

  it('returns stats with byGenre serialized as JSON', async () => {
    const res = await gql(`{ stats { totalGames totalHours completionRate byGenre } }`)
    expect(typeof res.data.stats.byGenre).toBe('string')
    const parsed = JSON.parse(res.data.stats.byGenre)
    expect(typeof parsed).toBe('object')
  })
})
