import { useCallback, useEffect, useState } from 'react'

export type Route = {
  /** Path segments after the '#', e.g. ['item', 'abc123']. */
  segments: string[]
  query: URLSearchParams
  hash: string
}

function readHash(): Route {
  const raw = window.location.hash.replace(/^#/, '') || '/'
  const [path, search = ''] = raw.split('?')
  return {
    segments: path.split('/').filter(Boolean),
    query: new URLSearchParams(search),
    hash: raw,
  }
}

export function navigate(to: string, options: { replace?: boolean } = {}): void {
  const target = `#${to.startsWith('/') ? to : `/${to}`}`
  if (options.replace) {
    window.history.replaceState(null, '', target)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  } else {
    window.location.hash = target
  }
}

export function back(): void {
  if (window.history.length > 1) window.history.back()
  else navigate('/')
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(readHash)

  useEffect(() => {
    const onChange = () => {
      setRoute(readHash())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return route
}

/** Re-runs an async loader whenever `deps` change, with a manual refresh handle. */
export function useReload(): [number, () => void] {
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => setTick((t) => t + 1), [])
  return [tick, reload]
}
