import { Router } from 'express'
import passport from 'passport'
import {
  requestPasswordReset,
  resetPassword,
  sendVerificationEmailToUser,
  verifyEmail,
} from '../services/userService.js'
import { passwordResetRequestSchema, passwordResetConfirmSchema } from '../validation/schemas.js'

const router = Router()

// ── Google OAuth ────────────────────────────────────────────────────────────

router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
)

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:5173'}/login` }),
  (req, res) => {
    const { token } = req.user
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'
    res.redirect(`${clientUrl}/oauth/callback?token=${token}`)
  }
)

// ── Password reset ───────────────────────────────────────────────────────────

router.post('/password-reset/request', async (req, res, next) => {
  try {
    const parsed = passwordResetRequestSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message })
    await requestPasswordReset(parsed.data.email)
    return res.json({ ok: true, message: 'If that email exists, a reset link has been sent.' })
  } catch (err) {
    return next(err)
  }
})

router.post('/password-reset/confirm', async (req, res, next) => {
  try {
    const parsed = passwordResetConfirmSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message })
    const result = await resetPassword(parsed.data.token, parsed.data.password)
    if (!result.ok) return res.status(400).json({ error: result.error })
    return res.json({ ok: true })
  } catch (err) {
    return next(err)
  }
})

// ── Email verification ───────────────────────────────────────────────────────

router.get('/email-verify/:token', async (req, res, next) => {
  try {
    const result = await verifyEmail(req.params.token)
    if (!result.ok) return res.status(400).json({ error: result.error })
    return res.json({ ok: true })
  } catch (err) {
    return next(err)
  }
})

router.post('/email-verify/resend', async (req, res, next) => {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' })
    await sendVerificationEmailToUser(req.user.id)
    return res.json({ ok: true })
  } catch (err) {
    return next(err)
  }
})

export default router
