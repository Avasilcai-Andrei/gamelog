import { verifyToken } from '../utils/jwt.js'

export const authenticateToken = (req, res, next) => {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (token) {
    const result = verifyToken(token)
    if (result.ok) {
      req.user = {
        id: result.payload.userId,
        username: result.payload.username,
        roleName: result.payload.roleName,
        permissions: result.payload.permissions || [],
      }
    }
  }
  return next()
}
