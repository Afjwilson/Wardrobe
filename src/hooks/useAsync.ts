import { useCallback, useEffect, useState } from 'react'

export type AsyncState<T> = {
  value: T | undefined
  loading: boolean
  error: Error | undefined
  reload: () => void
}

/** Runs an async loader, cancelling the state write if the inputs changed first. */
export function useAsync<T>(
  loader: () => Promise<T>,
  deps: readonly unknown[],
): AsyncState<T> {
  const [value, setValue] = useState<T>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error>()
  const [tick, setTick] = useState(0)

  const reload = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let live = true
    setLoading(true)
    loader()
      .then((result) => {
        if (!live) return
        setValue(result)
        setError(undefined)
      })
      .catch((cause: unknown) => {
        if (!live) return
        setError(cause instanceof Error ? cause : new Error(String(cause)))
      })
      .finally(() => {
        if (live) setLoading(false)
      })
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  return { value, loading, error, reload }
}
