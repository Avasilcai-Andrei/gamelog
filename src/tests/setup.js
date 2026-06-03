import '@testing-library/jest-dom'
import { beforeEach } from 'vitest'

class MemoryStorage {
  constructor() { this.store = new Map() }
  get length() { return this.store.size }
  key(i) { return [...this.store.keys()][i] ?? null }
  getItem(k) { return this.store.has(k) ? this.store.get(k) : null }
  setItem(k, v) { this.store.set(String(k), String(v)) }
  removeItem(k) { this.store.delete(k) }
  clear() { this.store.clear() }
}

const ensureStorage = () => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    writable: true,
    value: new MemoryStorage(),
  })
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      writable: true,
      value: globalThis.localStorage,
    })
  }
}

ensureStorage()

beforeEach(() => {
  ensureStorage()
})
