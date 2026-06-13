import nodemailer from 'nodemailer'

// Email is only "configured" when we actually have SMTP credentials. Without
// them, Gmail auth (and a `from` of "Vauntd <undefined>") fails — so callers
// check this first and fall back to surfacing the link instead of pretending
// an email went out.
export const isEmailConfigured = () =>
  Boolean(process.env.SMTP_USER && process.env.SMTP_PASS)

const createTransporter = () => {
  const port = Number(process.env.SMTP_PORT) || 587
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465, // implicit TLS on 465; STARTTLS on 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

export const sendPasswordResetEmail = async (to, resetUrl) => {
  const transporter = createTransporter()
  await transporter.sendMail({
    from: `"Vauntd" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Reset your Vauntd password',
    text: `Click the link below to reset your password (expires in 15 minutes):\n\n${resetUrl}\n\nIf you didn't request this, ignore this email.`,
    html: `<p>Click the link below to reset your password <strong>(expires in 15 minutes)</strong>:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you didn't request this, ignore this email.</p>`,
  })
}

export const sendVerificationEmail = async (to, verifyUrl) => {
  const transporter = createTransporter()
  await transporter.sendMail({
    from: `"Vauntd" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Verify your Vauntd email',
    text: `Click the link below to verify your email address:\n\n${verifyUrl}`,
    html: `<p>Click the link below to verify your email address:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
  })
}
