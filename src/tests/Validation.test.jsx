import { describe, it, expect } from 'vitest'
import {
  validatePassword,
  validateEmail,
  validateGame,
  validateSession,
  validateRegister,
} from '../utils/validators'

describe('Password validation', () => {
  it('accepts a strong password', () => {
    expect(validatePassword('StrongPass1!')).toBe(true)
  })

  it('rejects password under 8 characters', () => {
    expect(validatePassword('Ab1!')).toBe(false)
  })

  it('rejects password with no uppercase', () => {
    expect(validatePassword('weakpass1!')).toBe(false)
  })

  it('rejects password with no lowercase', () => {
    expect(validatePassword('WEAKPASS1!')).toBe(false)
  })

  it('rejects password with no number', () => {
    expect(validatePassword('WeakPass!!')).toBe(false)
  })

  it('rejects password with no special character', () => {
    expect(validatePassword('WeakPass11')).toBe(false)
  })

  it('accepts password with all requirements met', () => {
    expect(validatePassword('MyP@ssw0rd')).toBe(true)
  })
})

describe('Email validation', () => {
  it('accepts valid email', () => {
    expect(validateEmail('user@example.com')).toBe(true)
  })

  it('rejects email without @', () => {
    expect(validateEmail('userexample.com')).toBe(false)
  })

  it('rejects email without domain', () => {
    expect(validateEmail('user@')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(validateEmail('')).toBe(false)
  })
})

describe('Game form validation', () => {
  it('passes with valid data', () => {
    const errors = validateGame({ title: 'Elden Ring', genre: 'RPG', hours: 10 })
    expect(Object.keys(errors).length).toBe(0)
  })

  it('fails with empty title', () => {
    const errors = validateGame({ title: '', genre: 'RPG', hours: 0 })
    expect(errors.title).toBeDefined()
  })

  it('fails with whitespace-only title', () => {
    const errors = validateGame({ title: '   ', genre: 'RPG', hours: 0 })
    expect(errors.title).toBeDefined()
  })

  it('fails with missing genre', () => {
    const errors = validateGame({ title: 'Game', genre: '', hours: 0 })
    expect(errors.genre).toBeDefined()
  })

  it('fails with negative hours', () => {
    const errors = validateGame({ title: 'Game', genre: 'RPG', hours: -5 })
    expect(errors.hours).toBeDefined()
  })

  it('allows 0 hours', () => {
    const errors = validateGame({ title: 'Game', genre: 'RPG', hours: 0 })
    expect(errors.hours).toBeUndefined()
  })
})

describe('Session form validation', () => {
  it('passes with valid data', () => {
    const errors = validateSession({ date: '2024-03-01', duration: 90, notes: 'Great session' })
    expect(Object.keys(errors).length).toBe(0)
  })

  it('fails with missing date', () => {
    const errors = validateSession({ date: '', duration: 90, notes: 'Notes' })
    expect(errors.date).toBeDefined()
  })

  it('fails with zero duration', () => {
    const errors = validateSession({ date: '2024-03-01', duration: 0, notes: 'Notes' })
    expect(errors.duration).toBeDefined()
  })

  it('fails with negative duration', () => {
    const errors = validateSession({ date: '2024-03-01', duration: -10, notes: 'Notes' })
    expect(errors.duration).toBeDefined()
  })

  it('fails with empty notes', () => {
    const errors = validateSession({ date: '2024-03-01', duration: 60, notes: '' })
    expect(errors.notes).toBeDefined()
  })

  it('fails with whitespace-only notes', () => {
    const errors = validateSession({ date: '2024-03-01', duration: 60, notes: '   ' })
    expect(errors.notes).toBeDefined()
  })
})

describe('Register form validation', () => {
  const valid = { username: 'alice', email: 'alice@example.com', password: 'StrongPass1!', confirm: 'StrongPass1!' }

  it('passes with valid data', () => {
    expect(Object.keys(validateRegister(valid)).length).toBe(0)
  })

  it('fails with empty username', () => {
    expect(validateRegister({ ...valid, username: '' }).username).toBeDefined()
  })

  it('fails with username shorter than 3 chars', () => {
    expect(validateRegister({ ...valid, username: 'ab' }).username).toBeDefined()
  })

  it('fails with empty email', () => {
    expect(validateRegister({ ...valid, email: '' }).email).toBeDefined()
  })

  it('fails with invalid email format', () => {
    expect(validateRegister({ ...valid, email: 'notanemail' }).email).toBeDefined()
  })

  it('fails with empty password', () => {
    expect(validateRegister({ ...valid, password: '', confirm: '' }).password).toBeDefined()
  })

  it('fails with weak password', () => {
    expect(validateRegister({ ...valid, password: 'weak', confirm: 'weak' }).password).toBeDefined()
  })

  it('fails when passwords do not match', () => {
    expect(validateRegister({ ...valid, confirm: 'Different1!' }).confirm).toBeDefined()
  })
})
