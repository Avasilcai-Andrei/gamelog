import { z } from 'zod'

export const gameCreateSchema = z.object({
  userId: z.string().min(1),
  title: z.string().trim().min(1),
  genre: z.string().trim().min(1),
  status: z.enum(['playing', 'backlog', 'completed', 'dropped']),
  hours: z.coerce.number().min(0).default(0),
  estimatedPlaytime: z.coerce.number().min(0).default(0),
  coverUrl: z.string().trim().url().or(z.literal('')).default(''),
  rawgId: z.union([z.string(), z.number()]).transform(String).optional(),
})

export const gameUpdateSchema = gameCreateSchema.partial().refine(
  value => Object.keys(value).length > 0,
  { message: 'At least one field is required for update' }
)

export const sessionCreateSchema = z.object({
  userId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  duration: z.coerce.number().int().positive(),
  notes: z.string().trim().min(1),
})

export const sessionUpdateSchema = sessionCreateSchema.partial().refine(
  value => Object.keys(value).length > 0,
  { message: 'At least one field is required for update' }
)

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
})

export const generatorStartSchema = z.object({
  intervalMs: z.coerce.number().int().min(200).max(60000).default(1500),
  batchSize: z.coerce.number().int().min(1).max(100).default(2),
  userId: z.string().min(1).optional(),
})

export const userRegisterSchema = z.object({
  username: z.string().trim().min(1),
  email: z.string().trim().email(),
  password: z.string().min(1),
})

export const userLoginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
})

export const passwordResetRequestSchema = z.object({
  email: z.string().trim().email(),
})

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6),
})

const LORE_NODE_TYPES = ['boss', 'dungeon', 'location', 'shop', 'quest', 'item']

export const loreNodeSchema = z.object({
  label: z.string().trim().min(1).max(80),
  type: z.enum(LORE_NODE_TYPES),
  description: z.string().trim().min(1).max(500),
  x: z.coerce.number().min(0).max(100).default(35),
  y: z.coerce.number().min(0).max(100).default(35),
})

export const loreNodeUpdateSchema = loreNodeSchema.partial().refine(
  value => Object.keys(value).length > 0,
  { message: 'At least one field is required for update' }
)

export const loreEdgeSchema = z.object({
  fromNodeId: z.string().min(1),
  toNodeId: z.string().min(1),
})

// Accept an http(s) URL, an inline uploaded image (base64 data URL), or empty.
const isImageDataUrl = (s) => /^data:image\/[a-z0-9.+-]+;base64,/i.test(s)
export const loreMetaSchema = z.object({
  backgroundUrl: z
    .string()
    .trim()
    .max(7_000_000, 'Image is too large')
    .refine(
      (s) => s === '' || isImageDataUrl(s) || z.string().url().safeParse(s).success,
      'Must be a valid URL or uploaded image',
    )
    .default(''),
})

export const userAchievementsSchema = z.object({
  achievementIds: z.array(z.string().min(1)).default([]),
})

export const challengeCreateSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).default(''),
  kind: z.enum(['rarity_under', 'count_any']),
  threshold: z.coerce.number().int().min(1).max(100),
  durationDays: z.coerce.number().int().min(1).max(60).default(7),
})

export const loreProposalSchema = z.object({
  kind: z.enum(['add', 'edit', 'delete']),
  targetNodeId: z.string().min(1).optional(),
  payload: loreNodeSchema.partial().optional(),
  reason: z.string().trim().min(1).max(500),
}).refine(
  value => value.kind === 'add' || Boolean(value.targetNodeId),
  { message: 'targetNodeId is required for edit/delete proposals', path: ['targetNodeId'] }
).refine(
  value => value.kind === 'delete' || (value.payload && Object.keys(value.payload).length > 0),
  { message: 'payload is required for add/edit proposals', path: ['payload'] }
)
