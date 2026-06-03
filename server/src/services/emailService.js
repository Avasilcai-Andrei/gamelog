import nodemailer from 'nodemailer'

const createTransporter = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

export const sendPasswordResetEmail = async (to, resetUrl) => {
  const transporter = createTransporter()
  await transporter.sendMail({
    from: `"GameLog" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Reset your GameLog password',
    text: `Click the link below to reset your password (expires in 15 minutes):\n\n${resetUrl}\n\nIf you didn't request this, ignore this email.`,
    html: `<p>Click the link below to reset your password <strong>(expires in 15 minutes)</strong>:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you didn't request this, ignore this email.</p>`,
  })
}

export const sendVerificationEmail = async (to, verifyUrl) => {
  const transporter = createTransporter()
  await transporter.sendMail({
    from: `"GameLog" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Verify your GameLog email',
    text: `Click the link below to verify your email address:\n\n${verifyUrl}`,
    html: `<p>Click the link below to verify your email address:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
  })
}
