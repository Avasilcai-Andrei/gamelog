import { userRegisterSchema, userLoginSchema } from '../validation/schemas.js'
import { listUsers, registerUser, loginUser, getUserById } from '../services/userService.js'

export const getUsers = async (req, res, next) => {
  try {
    return res.json(await listUsers())
  } catch (err) { return next(err) }
}

export const getUser = async (req, res, next) => {
  try {
    const user = await getUserById(req.params.id)
    if (!user) return res.status(404).json({ error: 'User not found' })
    return res.json(user)
  } catch (err) { return next(err) }
}

export const postRegister = async (req, res, next) => {
  try {
    const parsed = userRegisterSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
    const result = await registerUser(parsed.data)
    if (!result.ok) return res.status(409).json({ error: result.error })
    return res.status(201).json({ ...result.user, token: result.token })
  } catch (err) { return next(err) }
}

export const postLogin = async (req, res, next) => {
  try {
    const parsed = userLoginSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
    const result = await loginUser(parsed.data)
    if (!result.ok) return res.status(401).json({ error: result.error })
    return res.json({ ...result.user, token: result.token })
  } catch (err) { return next(err) }
}
