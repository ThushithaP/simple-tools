import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

interface RouterContextValue {
  path: string
  navigate: (to: string) => void
}

const RouterContext = createContext<RouterContextValue | null>(null)

/**
 * A deliberately tiny client-side router: just enough to give each tool its
 * own bookmarkable URL and working back/forward buttons, without pulling in
 * a routing library. If this app outgrows it (nested routes, params, etc.)
 * swapping in react-router-dom later is a contained change - components
 * only ever touch `useRouter()` and `<Link>`, never `window.location`
 * directly.
 */
export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(() => window.location.pathname)

  useEffect(() => {
    function onPopState() {
      setPath(window.location.pathname)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigate = useCallback((to: string) => {
    if (to !== window.location.pathname) {
      window.history.pushState({}, '', to)
    }
    setPath(to)
    window.scrollTo(0, 0)
  }, [])

  return <RouterContext.Provider value={{ path, navigate }}>{children}</RouterContext.Provider>
}

export function useRouter(): RouterContextValue {
  const ctx = useContext(RouterContext)
  if (!ctx) throw new Error('useRouter must be used within a RouterProvider')
  return ctx
}
