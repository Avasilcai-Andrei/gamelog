export const PASSWORD_REQUIREMENTS = [
  { label: 'At least 8 characters',            test: v => v.length >= 8 },
  { label: 'One uppercase letter',              test: v => /[A-Z]/.test(v) },
  { label: 'One lowercase letter',              test: v => /[a-z]/.test(v) },
  { label: 'One number',                        test: v => /[0-9]/.test(v) },
  { label: 'One special character (!@#$etc)',   test: v => /[^A-Za-z0-9]/.test(v) },
]

export const validatePassword = (password) =>
  PASSWORD_REQUIREMENTS.every(r => r.test(password))

export const validateEmail = (email) => /\S+@\S+\.\S+/.test(email)

export const validateGame = ({ title, genre, hours }) => {
  const errors = {}
  if (!title?.trim()) errors.title = 'Title is required'
  if (!genre) errors.genre = 'Genre is required'
  if (hours < 0) errors.hours = 'Hours cannot be negative'
  return errors
}

export const validateSession = ({ date, duration, notes }) => {
  const errors = {}
  if (!date) errors.date = 'Date is required'
  if (!duration || duration <= 0) errors.duration = 'Duration must be greater than 0'
  if (!notes?.trim()) errors.notes = 'Notes are required'
  return errors
}

export const validateRegister = ({ username, email, password, confirm }) => {
  const errors = {}
  if (!username?.trim()) errors.username = 'Username is required'
  else if (username.length < 3) errors.username = 'At least 3 characters'
  if (!email?.trim()) errors.email = 'Email is required'
  else if (!validateEmail(email)) errors.email = 'Invalid email address'
  if (!password) errors.password = 'Password is required'
  else if (!validatePassword(password)) errors.password = 'Password does not meet requirements'
  if (password !== confirm) errors.confirm = 'Passwords do not match'
  return errors
}
