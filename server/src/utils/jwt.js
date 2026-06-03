import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET || 'gamelog-dev-secret-change-in-production'
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h'

export const signToken = (payload) => jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN })

export const verifyToken = (token) => {
  try {
    return { ok: true, payload: jwt.verify(token, SECRET) }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}
