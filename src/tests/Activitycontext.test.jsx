import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import React from 'react'
import { ActivityProvider, useActivity } from '../context/ActivityContext'

const wrapWithRouter = (initialEntries = ['/']) =>
  ({ children }) => (
    <MemoryRouter initialEntries={initialEntries}>
      <ActivityProvider>{children}</ActivityProvider>
    </MemoryRouter>
  )

beforeEach(() => {
  document.cookie.split(';').forEach(c => {
    const eqPos = c.indexOf('=')
    const name = (eqPos > -1 ? c.slice(0, eqPos) : c).trim()
    if (name) document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
  })
})

describe('ActivityContext', () => {
  it('provides default activity state', () => {
    const { result } = renderHook(() => useActivity(), { wrapper: wrapWithRouter(['/library']) })
    expect(result.current.activity.lastPath).toBe('/library')
    expect(result.current.activity.totalViews).toBeGreaterThan(0)
  })

  it('counts visits per route', () => {
    const { result } = renderHook(() => useActivity(), { wrapper: wrapWithRouter(['/library']) })
    expect(result.current.activity.visits['/library']).toBe(1)
  })

  it('persists and reads preferences via cookies', () => {
    const { result } = renderHook(() => useActivity(), { wrapper: wrapWithRouter(['/']) })

    act(() => {
      result.current.setPreference('theme', 'dark')
    })

    expect(result.current.getPreference('theme')).toBe('dark')
    expect(result.current.getPreference('missing', 'fallback')).toBe('fallback')
  })

  it('provides topRoutes sorted by visits', () => {
    const { result } = renderHook(() => useActivity(), { wrapper: wrapWithRouter(['/insights']) })
    expect(Array.isArray(result.current.topRoutes)).toBe(true)
    expect(result.current.topRoutes.length).toBeGreaterThan(0)
    expect(result.current.topRoutes[0][0]).toBe('/insights')
  })
})
