import { z } from 'zod'

export const gameCreateSchema = z.object({
  userId: z.string().min(1),
  title: z.string().trim().min(1),
  genre: z.string().trim().min(1),
  status: z.enum(['playing', 'backlog', 'completed', 'dropped']),
  hours: z.coerce.number().min(0).default(0),
  estimatedPlaytime: z.coerce.number().min(0).default(0),
  coverUrl: z.string().trim().url().or(z.literal('')).default(''),
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
