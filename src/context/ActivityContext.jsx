import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Cookies from 'js-cookie'

const ActivityContext = createContext(null)

const COOKIE_LAST_PATH = 'gamelog_last_path'
const COOKIE_TOTAL_VIEWS = 'gamelog_views_total'
const COOKIE_VISITS = 'gamelog_visits'
const PREF_PREFIX = 'gamelog_pref_'

const readJson = (value, fallback) => {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

export function ActivityProvider({ children }) {
  const location = useLocation()

  const [activity, setActivity] = useState(() => {
    const visits = readJson(Cookies.get(COOKIE_VISITS), {})
    return {
      lastPath: Cookies.get(COOKIE_LAST_PATH) || '/',
      totalViews: Number(Cookies.get(COOKIE_TOTAL_VIEWS) || 0),
      visits,
    }
  })

  useEffect(() => {
    setActivity(prev => {
      const nextVisits = {
        ...prev.visits,
        [location.pathname]: (prev.visits[location.pathname] || 0) + 1,
      }

      const next = {
        lastPath: location.pathname,
        totalViews: prev.totalViews + 1,
        visits: nextVisits,
      }

      Cookies.set(COOKIE_LAST_PATH, next.lastPath, { sameSite: 'Lax' })
      Cookies.set(COOKIE_TOTAL_VIEWS, String(next.totalViews), { sameSite: 'Lax' })
      Cookies.set(COOKIE_VISITS, JSON.stringify(next.visits), { sameSite: 'Lax' })

      return next
    })
  }, [location.pathname])

  const setPreference = (key, value) => {
    Cookies.set(`${PREF_PREFIX}${key}`, JSON.stringify(value), { sameSite: 'Lax' })
  }

  const getPreference = (key, fallback = null) => {
    const value = Cookies.get(`${PREF_PREFIX}${key}`)
    return readJson(value, fallback)
  }

  const topRoutes = useMemo(() => {
    return Object.entries(activity.visits)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
  }, [activity.visits])

  return (
    <ActivityContext.Provider value={{ activity, topRoutes, setPreference, getPreference }}>
      {children}
    </ActivityContext.Provider>
  )
}

export function useActivity() {
  return useContext(ActivityContext)
}
