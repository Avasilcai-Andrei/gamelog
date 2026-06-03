import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import { initDatabase, resetDatabase, Game } from '../src/db/index.js'
import { startGenerator, stopGenerator, generatorStatus, flushGenerator } from '../src/realtime/generator.js'

beforeAll(async () => {
  await initDatabase({ force: true })
})

describe('Generator - fake data loop', () => {
  beforeEach(async () => {
    await resetDatabase()
    vi.useFakeTimers()
    if (generatorStatus().running) stopGenerator()
  })

  afterEach(() => {
    if (generatorStatus().running) stopGenerator()
    vi.useRealTimers()
  })

  it('rejects invalid options', () => {
    const res = startGenerator({ intervalMs: 50, batchSize: 1 }, () => {})
    expect(res.ok).toBe(false)
  })

  it('starts the generator and reports running', () => {
    const res = startGenerator({ intervalMs: 1000, batchSize: 2 }, () => {})
    expect(res.ok).toBe(true)
    expect(generatorStatus().running).toBe(true)
  })

  it('refuses to start twice', () => {
    startGenerator({ intervalMs: 1000, batchSize: 1 }, () => {})
    const res = startGenerator({ intervalMs: 1000, batchSize: 1 }, () => {})
    expect(res.ok).toBe(false)
  })

  it('produces a batch and broadcasts after intervalMs', async () => {
    const broadcast = vi.fn()
    const before = await Game.count()
    startGenerator({ intervalMs: 500, batchSize: 3, userId: 'gen_user' }, broadcast)

    await vi.advanceTimersByTimeAsync(500)
    await flushGenerator()

    expect(await Game.count()).toBe(before + 3)
    expect(broadcast).toHaveBeenCalledTimes(1)
    const message = broadcast.mock.calls[0][0]
    expect(message.type).toBe('games_generated')
    expect(message.batchSize).toBe(3)
    expect(message.created).toHaveLength(3)
  })

  it('keeps producing on each tick until stopped', async () => {
    const broadcast = vi.fn()
    startGenerator({ intervalMs: 200, batchSize: 1 }, broadcast)

    await vi.advanceTimersByTimeAsync(600)
    await flushGenerator()
    expect(broadcast).toHaveBeenCalledTimes(3)

    const stopRes = stopGenerator()
    expect(stopRes.ok).toBe(true)
    expect(generatorStatus().running).toBe(false)

    await vi.advanceTimersByTimeAsync(1000)
    await flushGenerator()
    expect(broadcast).toHaveBeenCalledTimes(3)
  })

  it('reports error when stopping a generator that is not running', () => {
    const res = stopGenerator()
    expect(res.ok).toBe(false)
  })
})
