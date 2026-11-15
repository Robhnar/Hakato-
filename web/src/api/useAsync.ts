import { useEffect, useState } from 'react'

export interface AsyncState<T> {
  data: T | null
  error: string | null
  loading: boolean
}

/**
 * Fetches data and refreshes it when `key` changes.
 * Example: useAsync(() => api.timeline(query), JSON.stringify(query))
 */
export function useAsync<T>(load: () => Promise<T>, key: string): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: null, error: null, loading: true })

  useEffect(() => {
    let cancelled = false
    setState((previous) => ({ ...previous, loading: true }))
    load().then(
      (data) => {
        if (!cancelled) setState({ data, error: null, loading: false })
      },
      (error: unknown) => {
        if (!cancelled) setState({ data: null, error: String(error), loading: false })
      },
    )
    return () => {
      cancelled = true
    }
    // `load` changes on every render; `key` decides about refreshing.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return state
}
