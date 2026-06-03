import { buildSchema } from 'graphql'
import {
  listGames,
  getGameById,
  createGame,
  updateGame,
  deleteGame,
  getStats,
  getLeaderboard,
  listSessionsByGame,
  createSession,
  updateSession,
  deleteSession,
} from '../services/gameService.js'
import { startGenerator, stopGenerator, generatorStatus } from '../realtime/generator.js'

let _broadcast = () => {}
export const setBroadcast = (fn) => { _broadcast = fn }

export const schema = buildSchema(`
  type Game {
    id: ID!
    userId: String!
    title: String!
    genre: String!
    status: String!
    hours: Int!
    estimatedPlaytime: Int!
    coverUrl: String!
    addedAt: String!
  }

  type Session {
    id: ID!
    gameId: String!
    userId: String!
    date: String!
    duration: Int!
    notes: String!
  }

  type PageMeta {
    page: Int!
    pageSize: Int!
    total: Int!
    totalPages: Int!
    hasNext: Boolean!
    hasPrev: Boolean!
  }

  type GamesPage {
    items: [Game!]!
    meta: PageMeta!
  }

  type SessionsPage {
    items: [Session!]!
    meta: PageMeta!
  }

  type StatusBreakdown {
    playing: Int!
    backlog: Int!
    completed: Int!
    dropped: Int!
  }

  type GenreStat {
    games: Int!
    hours: Int!
  }

  type Stats {
    totalGames: Int!
    totalHours: Int!
    completionRate: Int!
    byStatus: StatusBreakdown!
    byGenre: String!
  }

  type LeaderboardRow {
    userId: String!
    totalGames: Int!
    totalHours: Int!
    completionRate: Int!
  }

  input CreateGameInput {
    userId: String!
    title: String!
    genre: String!
    status: String!
    hours: Int!
    estimatedPlaytime: Int!
    coverUrl: String!
  }

  input UpdateGameInput {
    userId: String
    title: String
    genre: String
    status: String
    hours: Int
    estimatedPlaytime: Int
    coverUrl: String
  }

  input CreateSessionInput {
    userId: String!
    date: String!
    duration: Int!
    notes: String!
  }

  input UpdateSessionInput {
    userId: String
    date: String
    duration: Int
    notes: String
  }

  type Query {
    games(page: Int, pageSize: Int, userId: String, status: String, genre: String, search: String): GamesPage!
    game(id: ID!): Game
    sessionsByGame(gameId: ID!, page: Int, pageSize: Int): SessionsPage!
    stats(userId: String): Stats!
    leaderboard: [LeaderboardRow!]!
  }

  type GeneratorResult {
    ok: Boolean!
    error: String
    intervalMs: Int
    batchSize: Int
    running: Boolean
  }

  type Mutation {
    createGame(input: CreateGameInput!): Game!
    updateGame(id: ID!, input: UpdateGameInput!): Game
    deleteGame(id: ID!): Boolean!
    createSession(gameId: ID!, input: CreateSessionInput!): Session!
    updateSession(id: ID!, input: UpdateSessionInput!): Session
    deleteSession(id: ID!): Boolean!
    startGenerator(intervalMs: Int, batchSize: Int, userId: String): GeneratorResult!
    stopGenerator: GeneratorResult!
  }
`)

export const root = {
  games: ({ page = 1, pageSize = 10, userId, status, genre, search }) =>
    listGames({ page, pageSize, userId, status, genre, search }),
  game: ({ id }) => getGameById(id),
  sessionsByGame: ({ gameId, page = 1, pageSize = 10 }) =>
    listSessionsByGame(gameId, { page, pageSize }),
  stats: async ({ userId }) => {
    const result = await getStats({ userId })
    return {
      ...result,
      byGenre: JSON.stringify(result.byGenre),
    }
  },
  leaderboard: () => getLeaderboard(),
  createGame: ({ input }) => createGame(input),
  updateGame: ({ id, input }) => updateGame(id, input),
  deleteGame: ({ id }) => deleteGame(id),
  createSession: ({ gameId, input }) => createSession(gameId, input),
  updateSession: ({ id, input }) => updateSession(id, input),
  deleteSession: ({ id }) => deleteSession(id),
  startGenerator: ({ intervalMs, batchSize, userId }) => {
    const result = startGenerator({ intervalMs, batchSize, userId }, _broadcast)
    return { ok: result.ok, error: result.ok ? null : String(result.error), intervalMs: result.intervalMs, batchSize: result.batchSize }
  },
  stopGenerator: () => {
    const result = stopGenerator()
    return { ok: result.ok, error: result.ok ? null : result.error, running: false }
  },
}
