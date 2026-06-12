import { Sequelize, DataTypes } from 'sequelize'
import bcrypt from 'bcryptjs'

const isTest = process.env.NODE_ENV === 'test'

export const sequelize = isTest
  ? new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false })
  : new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
      logging: false,
    })

const createId = (prefix) => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export const Role = sequelize.define('Role', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: () => createId('r'),
  },
  name: { type: DataTypes.STRING, allowNull: false, unique: true },
  description: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
}, {
  tableName: 'roles',
  timestamps: false,
})

export const Permission = sequelize.define('Permission', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: () => createId('p'),
  },
  name: { type: DataTypes.STRING, allowNull: false, unique: true },
  description: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
}, {
  tableName: 'permissions',
  timestamps: false,
})

export const RolePermission = sequelize.define('RolePermission', {
  roleId: { type: DataTypes.STRING, allowNull: false, primaryKey: true },
  permissionId: { type: DataTypes.STRING, allowNull: false, primaryKey: true },
}, {
  tableName: 'role_permissions',
  timestamps: false,
})

Role.belongsToMany(Permission, { through: RolePermission, foreignKey: 'roleId', otherKey: 'permissionId' })
Permission.belongsToMany(Role, { through: RolePermission, foreignKey: 'permissionId', otherKey: 'roleId' })

export const User = sequelize.define('User', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: () => createId('u'),
  },
  username: { type: DataTypes.STRING, allowNull: false, unique: true },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: true },
  avatar: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
  joinedAt: { type: DataTypes.STRING, allowNull: false, defaultValue: () => new Date().toISOString() },
  roleId: { type: DataTypes.STRING, allowNull: true },
  oauthProvider: { type: DataTypes.STRING, allowNull: true },
  oauthId: { type: DataTypes.STRING, allowNull: true },
  resetToken: { type: DataTypes.STRING, allowNull: true },
  resetTokenExpires: { type: DataTypes.DATE, allowNull: true },
  emailVerified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  verificationToken: { type: DataTypes.STRING, allowNull: true },
}, {
  tableName: 'users',
  timestamps: false,
})

User.belongsTo(Role, { foreignKey: 'roleId' })
Role.hasMany(User, { foreignKey: 'roleId' })

export const ActionLog = sequelize.define('ActionLog', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: () => createId('al'),
  },
  userId: { type: DataTypes.STRING, allowNull: false },
  roleName: { type: DataTypes.STRING, allowNull: false, defaultValue: 'unknown' },
  action: { type: DataTypes.STRING, allowNull: false },
  target: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
  statusCode: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  timestamp: { type: DataTypes.STRING, allowNull: false, defaultValue: () => new Date().toISOString() },
  ipAddress: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
}, {
  tableName: 'action_logs',
  timestamps: false,
  indexes: [
    { fields: ['userId'] },
    { fields: ['timestamp'] },
  ],
})

export const Observation = sequelize.define('Observation', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: () => createId('obs'),
  },
  userId: { type: DataTypes.STRING, allowNull: false },
  reason: { type: DataTypes.STRING, allowNull: false },
  flaggedAt: { type: DataTypes.STRING, allowNull: false, defaultValue: () => new Date().toISOString() },
  windowCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  resolved: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, {
  tableName: 'observations',
  timestamps: false,
  indexes: [
    { fields: ['userId'] },
    { fields: ['resolved'] },
  ],
})

ActionLog.belongsTo(User, { foreignKey: 'userId' })
Observation.belongsTo(User, { foreignKey: 'userId' })

export const Game = sequelize.define('Game', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: () => createId('g'),
  },
  userId: { type: DataTypes.STRING, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false },
  genre: { type: DataTypes.STRING, allowNull: false },
  status: {
    type: DataTypes.ENUM('playing', 'backlog', 'completed', 'dropped'),
    allowNull: false,
  },
  hours: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  estimatedPlaytime: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  coverUrl: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
  // RAWG game id, captured when a game is picked from RAWG search. Used to fetch
  // the achievement catalog. Nullable — manually-entered games have no RAWG id.
  rawgId: { type: DataTypes.STRING, allowNull: true },
  addedAt: { type: DataTypes.STRING, allowNull: false, defaultValue: () => new Date().toISOString() },
}, {
  tableName: 'games',
  timestamps: false,
  indexes: [
    { fields: ['userId'] },
    { fields: ['status'] },
    { fields: ['genre'] },
  ],
})

export const Session = sequelize.define('Session', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: () => createId('s'),
  },
  gameId: { type: DataTypes.STRING, allowNull: false },
  userId: { type: DataTypes.STRING, allowNull: false },
  date: { type: DataTypes.STRING, allowNull: false },
  duration: { type: DataTypes.INTEGER, allowNull: false },
  notes: { type: DataTypes.STRING, allowNull: false },
}, {
  tableName: 'sessions',
  timestamps: false,
  indexes: [{ fields: ['gameId'] }],
})

Game.hasMany(Session, { foreignKey: 'gameId', onDelete: 'CASCADE' })
Session.belongsTo(Game, { foreignKey: 'gameId' })

export const ChatMessage = sequelize.define('ChatMessage', {
  id: { type: DataTypes.STRING, primaryKey: true },
  userId: { type: DataTypes.STRING, allowNull: false },
  username: { type: DataTypes.STRING, allowNull: false },
  content: { type: DataTypes.STRING(500), allowNull: false },
  createdAt: { type: DataTypes.STRING, allowNull: false, defaultValue: () => new Date().toISOString() },
}, {
  tableName: 'chat_messages',
  timestamps: false,
})

export const LoreNode = sequelize.define('LoreNode', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: () => createId('ln'),
  },
  gameKey: { type: DataTypes.STRING, allowNull: false },
  label: { type: DataTypes.STRING, allowNull: false },
  // Plain string (validated by Zod loreNodeSchema) so the set of pin types can
  // evolve without a Postgres ENUM migration.
  type: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.STRING(500), allowNull: false },
  x: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 35 },
  y: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 35 },
  createdBy: { type: DataTypes.STRING, allowNull: false, defaultValue: 'Unknown' },
  createdAt: { type: DataTypes.STRING, allowNull: false, defaultValue: () => new Date().toISOString() },
}, {
  tableName: 'lore_nodes',
  timestamps: false,
  indexes: [{ fields: ['gameKey'] }],
})

export const LoreEdge = sequelize.define('LoreEdge', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: () => createId('le'),
  },
  gameKey: { type: DataTypes.STRING, allowNull: false },
  fromNodeId: { type: DataTypes.STRING, allowNull: false },
  toNodeId: { type: DataTypes.STRING, allowNull: false },
  createdAt: { type: DataTypes.STRING, allowNull: false, defaultValue: () => new Date().toISOString() },
}, {
  tableName: 'lore_edges',
  timestamps: false,
  indexes: [{ fields: ['gameKey'] }],
})

export const LoreMapMeta = sequelize.define('LoreMapMeta', {
  gameKey: { type: DataTypes.STRING, primaryKey: true },
  backgroundUrl: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
  updatedBy: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
  updatedAt: { type: DataTypes.STRING, allowNull: false, defaultValue: () => new Date().toISOString() },
}, {
  tableName: 'lore_map_meta',
  timestamps: false,
})

export const LoreProposal = sequelize.define('LoreProposal', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: () => createId('lp'),
  },
  gameKey: { type: DataTypes.STRING, allowNull: false },
  kind: { type: DataTypes.ENUM('add', 'edit', 'delete'), allowNull: false },
  targetNodeId: { type: DataTypes.STRING, allowNull: true },
  payload: { type: DataTypes.TEXT, allowNull: false, defaultValue: '{}' },
  reason: { type: DataTypes.STRING(500), allowNull: false },
  createdBy: { type: DataTypes.STRING, allowNull: false, defaultValue: 'Unknown' },
  createdAt: { type: DataTypes.STRING, allowNull: false, defaultValue: () => new Date().toISOString() },
  status: { type: DataTypes.ENUM('open', 'approved', 'applied', 'rejected'), allowNull: false, defaultValue: 'open' },
  resolvedBy: { type: DataTypes.STRING, allowNull: true },
}, {
  tableName: 'lore_proposals',
  timestamps: false,
  indexes: [{ fields: ['gameKey'] }, { fields: ['status'] }],
})

export const LoreVote = sequelize.define('LoreVote', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: () => createId('lv'),
  },
  proposalId: { type: DataTypes.STRING, allowNull: false },
  userId: { type: DataTypes.STRING, allowNull: false },
  createdAt: { type: DataTypes.STRING, allowNull: false, defaultValue: () => new Date().toISOString() },
}, {
  tableName: 'lore_votes',
  timestamps: false,
  indexes: [{ unique: true, fields: ['proposalId', 'userId'] }],
})

// --- Achievements (skill ranking) ---
// Catalog is shared across everyone who owns a title (keyed by normalized title,
// like lore maps). Pulled once from RAWG and cached. `weight` = 100 - percent, so
// rare achievements (low global unlock %) are worth more — ranking is skill-based.
export const Achievement = sequelize.define('Achievement', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: () => createId('ach'),
  },
  gameKey: { type: DataTypes.STRING, allowNull: false },
  externalId: { type: DataTypes.STRING, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.STRING(1000), allowNull: false, defaultValue: '' },
  image: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
  percent: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
  weight: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
}, {
  tableName: 'achievements',
  timestamps: false,
  indexes: [
    { fields: ['gameKey'] },
    { unique: true, fields: ['gameKey', 'externalId'] },
  ],
})

// Records which catalog achievements a user has completed for a game.
export const UserAchievement = sequelize.define('UserAchievement', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: () => createId('ua'),
  },
  userId: { type: DataTypes.STRING, allowNull: false },
  gameKey: { type: DataTypes.STRING, allowNull: false },
  achievementId: { type: DataTypes.STRING, allowNull: false },
  unlockedAt: { type: DataTypes.STRING, allowNull: false, defaultValue: () => new Date().toISOString() },
}, {
  tableName: 'user_achievements',
  timestamps: false,
  indexes: [
    { fields: ['userId'] },
    { fields: ['gameKey'] },
    { unique: true, fields: ['userId', 'achievementId'] },
  ],
})

// Tracks whether the catalog for a title was already fetched from RAWG.
export const AchievementMeta = sequelize.define('AchievementMeta', {
  gameKey: { type: DataTypes.STRING, primaryKey: true },
  rawgId: { type: DataTypes.STRING, allowNull: true },
  fetchedAt: { type: DataTypes.STRING, allowNull: false, defaultValue: () => new Date().toISOString() },
}, {
  tableName: 'achievement_meta',
  timestamps: false,
})

const recalcGameHours = async (gameId) => {
  const sessions = await Session.findAll({ where: { gameId }, attributes: ['duration'] })
  const totalMins = sessions.reduce((sum, s) => sum + (Number(s.duration) || 0), 0)
  await Game.update({ hours: Math.round(totalMins / 60) }, { where: { id: gameId } })
}

Session.addHook('afterCreate', async (session) => {
  await recalcGameHours(session.gameId)
})

Session.addHook('afterUpdate', async (session) => {
  await recalcGameHours(session.gameId)
  const previousGameId = session.previous('gameId')
  if (previousGameId && previousGameId !== session.gameId) {
    await recalcGameHours(previousGameId)
  }
})

Session.addHook('afterDestroy', async (session) => {
  await recalcGameHours(session.gameId)
})

const seedGames = [
  {
    id: 'g1',
    userId: 'seed_user_1',
    title: 'Elden Ring',
    genre: 'RPG',
    status: 'playing',
    hours: 48,
    estimatedPlaytime: 105,
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/header.jpg',
    addedAt: '2024-01-10T10:00:00.000Z',
  },
  {
    id: 'g2',
    userId: 'seed_user_2',
    title: 'Hollow Knight',
    genre: 'Indie',
    status: 'completed',
    hours: 32,
    estimatedPlaytime: 28,
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/367520/header.jpg',
    addedAt: '2024-02-05T10:00:00.000Z',
  },
]

const seedSessions = [
  {
    id: 's1',
    gameId: 'g1',
    userId: 'seed_user_1',
    date: '2024-03-10',
    duration: 120,
    notes: 'Explored Altus Plateau.',
  },
]

export const PERMISSION_NAMES = {
  GAMES_READ: 'games:read',
  GAMES_WRITE: 'games:write',
  SESSIONS_WRITE: 'sessions:write',
  GENERATOR_CONTROL: 'generator:control',
  USERS_LIST: 'users:list',
  ADMIN_ACCESS: 'admin:access',
  LORE_WRITE: 'lore:write',
}

export const ROLE_PERMISSIONS = {
  admin: Object.values(PERMISSION_NAMES),
  user: [
    PERMISSION_NAMES.GAMES_READ,
    PERMISSION_NAMES.GAMES_WRITE,
    PERMISSION_NAMES.SESSIONS_WRITE,
  ],
}

const seedRolesAndPermissions = async () => {
  const permissionDescriptions = {
    [PERMISSION_NAMES.GAMES_READ]: 'Read games and stats',
    [PERMISSION_NAMES.GAMES_WRITE]: 'Create, update, and delete games',
    [PERMISSION_NAMES.SESSIONS_WRITE]: 'Log play sessions',
    [PERMISSION_NAMES.GENERATOR_CONTROL]: 'Start and stop the data generator',
    [PERMISSION_NAMES.USERS_LIST]: 'View the user list',
    [PERMISSION_NAMES.ADMIN_ACCESS]: 'Access the admin dashboard',
    [PERMISSION_NAMES.LORE_WRITE]: 'Create and edit lore maps',
  }
  for (const name of Object.values(PERMISSION_NAMES)) {
    await Permission.findOrCreate({ where: { name }, defaults: { description: permissionDescriptions[name] || '' } })
  }

  const roleDescriptions = {
    admin: 'Full permissions — all actions allowed',
    user: 'Restricted permissions — own games and sessions only',
  }
  for (const [roleName, permNames] of Object.entries(ROLE_PERMISSIONS)) {
    const [role] = await Role.findOrCreate({ where: { name: roleName }, defaults: { description: roleDescriptions[roleName] || '' } })
    const perms = await Permission.findAll({ where: { name: permNames } })
    await role.setPermissions(perms)
  }
}

const seedAdminUser = async () => {
  const adminRole = await Role.findOne({ where: { name: 'admin' } })
  if (!adminRole) return
  const existing = await User.findOne({ where: { username: 'admin' } })
  if (existing) {
    let needsUpdate = false
    if (!existing.roleId) { existing.roleId = adminRole.id; needsUpdate = true }
    if (existing.password && !existing.password.startsWith('$2b$')) {
      existing.password = await bcrypt.hash(existing.password, 10)
      needsUpdate = true
    }
    if (needsUpdate) await existing.save()
    return
  }
  await User.create({
    username: 'admin',
    email: 'admin@gamelog.local',
    password: await bcrypt.hash('admin', 10),
    avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=admin',
    roleId: adminRole.id,
  })
}

const seedDefaultUser = async () => {
  const userRole = await Role.findOne({ where: { name: 'user' } })
  if (!userRole) return
  const existing = await User.findOne({ where: { username: 'player' } })
  if (existing) {
    let needsUpdate = false
    if (!existing.roleId) { existing.roleId = userRole.id; needsUpdate = true }
    if (existing.password && !existing.password.startsWith('$2b$')) {
      existing.password = await bcrypt.hash(existing.password, 10)
      needsUpdate = true
    }
    if (needsUpdate) await existing.save()
    return
  }
  await User.create({
    username: 'player',
    email: 'player@gamelog.local',
    password: await bcrypt.hash('playerpass', 10),
    avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=player',
    roleId: userRole.id,
  })
}

const backfillUserRoles = async () => {
  const userRole = await Role.findOne({ where: { name: 'user' } })
  if (!userRole) return
  await User.update({ roleId: userRole.id }, { where: { roleId: null } })
}

// sequelize.sync() never ALTERs an existing table, so a new column on an
// already-created table (Postgres in prod/dev, or a reused SQLite test DB) is
// missing until we add it explicitly. Unlike the test-only helpers below, this
// runs in EVERY environment because the live `games` table predates `rawgId` —
// without it, every game INSERT references a non-existent column and 500s.
const ensureGameColumns = async () => {
  const qi = sequelize.getQueryInterface()
  const tables = await qi.showAllTables()
  if (!tables.map(t => String(t).toLowerCase()).includes('games')) return
  const desc = await qi.describeTable('games')
  if (!desc.rawgId) {
    await qi.addColumn('games', 'rawgId', { type: DataTypes.STRING, allowNull: true })
  }
}

// SQLite doesn't auto-alter on sync() — these helpers patch existing test DBs.
// Not needed for PostgreSQL (fresh schema is created correctly by sync()).
const ensureRoleIdColumn = async () => {
  const qi = sequelize.getQueryInterface()
  const tables = await qi.showAllTables()
  if (!tables.map(t => String(t).toLowerCase()).includes('users')) return
  const desc = await qi.describeTable('users')
  if (!desc.roleId) {
    await qi.addColumn('users', 'roleId', { type: DataTypes.STRING, allowNull: true })
  }
}

const ensureAuthColumns = async () => {
  const qi = sequelize.getQueryInterface()
  const tables = await qi.showAllTables()
  if (!tables.map(t => String(t).toLowerCase()).includes('users')) return
  const desc = await qi.describeTable('users')
  const additions = [
    ['oauthProvider', { type: DataTypes.STRING, allowNull: true }],
    ['oauthId', { type: DataTypes.STRING, allowNull: true }],
    ['resetToken', { type: DataTypes.STRING, allowNull: true }],
    ['resetTokenExpires', { type: DataTypes.DATE, allowNull: true }],
    ['emailVerified', { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }],
    ['verificationToken', { type: DataTypes.STRING, allowNull: true }],
  ]
  for (const [col, def] of additions) {
    if (!desc[col]) await qi.addColumn('users', col, def)
  }
}

export const seedDatabase = async () => {
  await Game.bulkCreate(seedGames, { hooks: false })
  await Session.bulkCreate(seedSessions, { hooks: false })
  // After seeding, recompute hours so seeded games stay consistent with seeded sessions.
  for (const g of seedGames) await recalcGameHours(g.id)
}

export const initDatabase = async ({ force = false } = {}) => {
  if (force) {
    await sequelize.sync({ force: true })
  } else {
    await sequelize.sync()
    await ensureGameColumns()
    if (isTest) {
      await ensureRoleIdColumn()
      await ensureAuthColumns()
    }
  }
  await seedRolesAndPermissions()
  await backfillUserRoles()
  await seedAdminUser()
  await seedDefaultUser()
  const count = await Game.count()
  if (count === 0) await seedDatabase()
}

export const resetDatabase = async () => {
  await sequelize.sync({ force: true })
  await seedRolesAndPermissions()
  await seedAdminUser()
  await seedDefaultUser()
  await seedDatabase()
}

export { createId, recalcGameHours }
