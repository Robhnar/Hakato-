import { afterEach, expect, test, vi } from 'vitest'

afterEach(() => {
  vi.resetModules()
  vi.unstubAllEnvs()
})

test('optimalSite returns its contract fixture in fixture mode', async () => {
  vi.stubEnv('VITE_USE_FIXTURES', '1')
  const { api } = await import('./client')

  const response = await api.optimalSite({
    start_utc: '2027-01-01T00:00:00Z',
    end_utc: '2027-01-31T00:00:00Z',
  })

  expect(response.optimal).toEqual(response.ranking[0])
  expect(response.cursor_bodies.cursor_utc).toBe('2027-01-01T00:00:00Z')
  expect(response.ranking.some((candidate) => candidate.is_catalog_site)).toBe(true)
  expect(response.ranking.some((candidate) => !candidate.is_catalog_site)).toBe(true)
})
