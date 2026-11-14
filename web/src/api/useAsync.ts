import { useEffect, useState } from 'react'

export interface AsyncState<T> {
  data: T | null
  error: string | null
  loading: boolean
}

/**
 * Pobiera dane i odświeża je, gdy zmieni się `key`.
 * Przykład: useAsync(() => api.timeline(query), JSON.stringify(query))
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
    // `load` zmienia się przy każdym renderze; o odświeżeniu decyduje `key`.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return state
}
