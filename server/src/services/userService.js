import crypto from 'crypto'
import { Op } from 'sequelize'
import bcrypt from 'bcryptjs'
import { User, Role, Permission } from '../db/index.js'
import { signToken } from '../utils/jwt.js'
import { sendPasswordResetEmail, sendVerificationEmail } from './emailService.js'

const userWithRoleQuery = {
  include: [{
    model: Role,
    include: [{ model: Permission }],
  }],
}

const toSafe = (instance) => {
  if (!instance) return null
  const plain = instance.get({ plain: true })
  const { password, Role: roleObj, ...rest } = plain
  const role = roleObj ? { id: roleObj.id, name: roleObj.name, description: roleObj.description } : null
  const permissions = roleObj?.Permissions ? roleObj.Permissions.map(p => p.name) : []
  return { ...rest, role, permissions }
}

const issueToken = (safeUser) => signToken({
  userId: safeUser.id,
  username: safeUser.username,
  roleName: safeUser.role?.name || 'unknown',
  permissions: safeUser.permissions || [],
})

export const listUsers = async () => {
  const users = await User.findAll({ ...userWithRoleQuery, order: [['joinedAt', 'ASC']] })
  return users.map(toSafe)
}

export const registerUser = async ({ username, email, password }) => {
  const existing = await User.findOne({ where: { [Op.or]: [{ username }, { email }] } })
  if (existing) {
    if (existing.username === username) return { ok: false, error: 'Username already taken' }
    return { ok: false, error: 'Email already registered' }
  }

  const userRole = await Role.findOne({ where: { name: 'user' } })
  const hash = await bcrypt.hash(password, 10)

  const created = await User.create({
    username,
    email,
    password: hash,
    avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(username)}`,
    roleId: userRole?.id || null,
  })
  const fresh = await User.findByPk(created.id, userWithRoleQuery)
  const user = toSafe(fresh)
  // Fire-and-forget — don't block registration if email fails
  sendVerificationEmailToUser(created.id).catch(() => {})
  return { ok: true, user, token: issueToken(user) }
}

export const loginUser = async ({ username, password }) => {
  const instance = await User.findOne({ where: { username }, ...userWithRoleQuery })
  if (!instance) return { ok: false, error: 'Invalid username or password' }
  const match = await bcrypt.compare(password, instance.password)
  if (!match) return { ok: false, error: 'Invalid username or password' }
  const user = toSafe(instance)
  return { ok: true, user, token: issueToken(user) }
}

export const getUserById = async (id) => toSafe(await User.findByPk(id, userWithRoleQuery))

export const findOrCreateOAuthUser = async (profile) => {
  const email = profile.emails?.[0]?.value || null
  const oauthId = profile.id
  const oauthProvider = profile.provider || 'google'

  let instance = await User.findOne({ where: { oauthProvider, oauthId }, ...userWithRoleQuery })
  if (!instance && email) {
    instance = await User.findOne({ where: { email }, ...userWithRoleQuery })
    if (instance) {
      instance.oauthProvider = oauthProvider
      instance.oauthId = oauthId
      await instance.save()
    }
  }

  if (!instance) {
    const userRole = await Role.findOne({ where: { name: 'user' } })
    const username = profile.displayName
      ? profile.displayName.replace(/\s+/g, '_').toLowerCase() + '_' + oauthId.slice(0, 6)
      : `user_${oauthId.slice(0, 8)}`
    const avatar = profile.photos?.[0]?.value ||
      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(username)}`

    const created = await User.create({
      username,
      email: email || `${oauthId}@oauth.local`,
      password: null,
      avatar,
      oauthProvider,
      oauthId,
      emailVerified: !!email,
      roleId: userRole?.id || null,
    })
    instance = await User.findByPk(created.id, userWithRoleQuery)
  }

  const user = toSafe(instance)
  return { ok: true, data: { user, token: issueToken(user) } }
}

export const requestPasswordReset = async (email) => {
  const instance = await User.findOne({ where: { email } })
  if (instance) {
    const rawToken = crypto.randomBytes(32).toString('hex')
    const hash = crypto.createHash('sha256').update(rawToken).digest('hex')
    const expires = new Date(Date.now() + 15 * 60 * 1000)
    await instance.update({ resetToken: hash, resetTokenExpires: expires })
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'
    try {
      await sendPasswordResetEmail(email, `${clientUrl}/reset-password?token=${rawToken}`)
    } catch (emailErr) {
      console.error('[password-reset] email failed:', emailErr.message)
    }
  }
  // Always return ok:true to avoid leaking whether an email exists
  return { ok: true }
}

export const resetPassword = async (rawToken, newPassword) => {
  const hash = crypto.createHash('sha256').update(rawToken).digest('hex')
  const instance = await User.findOne({
    where: {
      resetToken: hash,
      resetTokenExpires: { [Op.gt]: new Date() },
    },
  })
  if (!instance) return { ok: false, error: 'Invalid or expired reset token' }
  const passwordHash = await bcrypt.hash(newPassword, 10)
  await instance.update({ password: passwordHash, resetToken: null, resetTokenExpires: null })
  return { ok: true }
}

export const sendVerificationEmailToUser = async (userId) => {
  const instance = await User.findByPk(userId)
  if (!instance || instance.emailVerified) return { ok: false }
  const token = crypto.randomBytes(32).toString('hex')
  await instance.update({ verificationToken: token })
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'
  try {
    await sendVerificationEmail(instance.email, `${clientUrl}/email-verify?token=${token}`)
  } catch (emailErr) {
    console.error('[email-verify] email failed:', emailErr.message)
  }
  return { ok: true }
}

export const verifyEmail = async (token) => {
  const instance = await User.findOne({ where: { verificationToken: token } })
  if (!instance) return { ok: false, error: 'Invalid verification token' }
  await instance.update({ emailVerified: true, verificationToken: null })
  return { ok: true }
}
