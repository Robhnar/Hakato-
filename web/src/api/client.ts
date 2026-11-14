// Jedyny punkt styku frontendu z backendem. Widoki nie wołają fetch() same.
//
// VITE_USE_FIXTURES=1 (npm run dev:fixtures): zamiast backendu zwraca pliki
// z contracts/fixtures/ - zawsze ten sam scenariusz, niezależnie od parametrów.

import type {
  Horizon,
  OptimalSiteQuery,
  OptimalSiteResponse,
  RangeQuery,
  Site,
  Summary,
  Timeline,
  WindowsQuery,
  WindowsResponse,
} from './types'

const USE_FIXTURES = import.meta.env.VITE_USE_FIXTURES === '1'

type Params = Record<string, string | number | boolean | undefined>

async function get<T>(path: string, params: Params = {}): Promise<T> {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue
    query.set(key, String(value))
  }
  const suffix = query.size > 0 ? `?${query}` : ''
  const response = await fetch(`/api/${path}${suffix}`, {
    signal: typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(15_000) : undefined,
  })
  if (!response.ok) {
    throw new Error(`API ${path}: ${response.status} ${await response.text()}`)
  }
  return (await response.json()) as T
}

async function fixture<T>(load: () => Promise<{ default: unknown }>): Promise<T> {
  return (await load()).default as T
}

export const api = {
  sites: (): Promise<Site[]> =>
    USE_FIXTURES
      ? fixture(() => import('../../../contracts/fixtures/sites.json'))
      : get('sites'),

  horizon: (lat_deg: number, lon_deg: number): Promise<Horizon> =>
    USE_FIXTURES
      ? fixture(() => import('../../../contracts/fixtures/horizon.json'))
      : get('horizon', { lat_deg, lon_deg }),

  timeline: (q: RangeQuery): Promise<Timeline> =>
    USE_FIXTURES
      ? fixture(() => import('../../../contracts/fixtures/timeline.json'))
      : get('timeline', { ...q }),

  summary: (q: RangeQuery): Promise<Summary> =>
    USE_FIXTURES
      ? fixture(() => import('../../../contracts/fixtures/summary.json'))
      : get('summary', { ...q }),

  windows: (q: WindowsQuery): Promise<WindowsResponse> =>
    USE_FIXTURES
      ? fixture(() => import('../../../contracts/fixtures/windows.json'))
      : get('windows', { ...q }),

  optimalSite: (q: OptimalSiteQuery): Promise<OptimalSiteResponse> =>
    USE_FIXTURES
      ? fixture(() => import('../../../contracts/fixtures/optimal_site.json'))
      : get('optimal-site', { ...q }),
}
