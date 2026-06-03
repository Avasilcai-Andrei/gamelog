import { faker } from '@faker-js/faker'
import { createGame } from '../services/gameService.js'
import { generatorStartSchema } from '../validation/schemas.js'

let generatorTimer = null
let inFlight = Promise.resolve()

const statuses = ['playing', 'backlog', 'completed', 'dropped']
const genres = ['RPG', 'Action Adventure', 'FPS', 'Strategy', 'Indie', 'Sports', 'Horror', 'Platformer', 'Simulation', 'Fighting']

const makeFakeGame = (userId) => {
  return {
    userId: userId || faker.internet.username().toLowerCase(),
    title: faker.helpers.arrayElement([
      `${faker.word.adjective()} ${faker.word.noun()}`,
      `${faker.word.noun()} ${faker.word.verb()}s`,
      `${faker.location.city()} Chronicles`,
    ]),
    genre: faker.helpers.arrayElement(genres),
    status: faker.helpers.arrayElement(statuses),
    hours: faker.number.int({ min: 0, max: 120 }),
    estimatedPlaytime: faker.number.int({ min: 8, max: 160 }),
    coverUrl: '',
  }
}

export const startGenerator = ({ intervalMs, batchSize, userId }, broadcast) => {
  const parsed = generatorStartSchema.safeParse({ intervalMs, batchSize, userId })
  if (!parsed.success) return { ok: false, error: parsed.error.flatten() }
  if (generatorTimer) return { ok: false, error: 'Generator already running' }

  const options = parsed.data
  const tick = async () => {
    try {
      const created = []
      for (let i = 0; i < options.batchSize; i += 1) {
        created.push(await createGame(makeFakeGame(options.userId)))
      }
      broadcast({ type: 'games_generated', batchSize: created.length, created })
    } catch (err) {
      process.stderr.write(`Generator tick failed: ${err.message}\n`)
    }
  }
  generatorTimer = setInterval(() => {
    inFlight = inFlight.then(tick)
  }, options.intervalMs)

  return { ok: true, intervalMs: options.intervalMs, batchSize: options.batchSize }
}

export const stopGenerator = () => {
  if (!generatorTimer) return { ok: false, error: 'Generator is not running' }
  clearInterval(generatorTimer)
  generatorTimer = null
  return { ok: true }
}

export const generatorStatus = () => ({ running: Boolean(generatorTimer) })

export const flushGenerator = () => inFlight
