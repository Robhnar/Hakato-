import { expect, test } from 'vitest'
import type { CalendarSlot, Site, WindowsQuery, WindowsResponse } from '../../api/types'
import { candidateSites, findLandings, type GuideAnswers } from './search'

const SITES: Site[] = [
  { id: 'pole', name: 'Pole', lat_deg: -89.5, lon_deg: 0, category: 'candidate', landing_utc: null },
  { id: 'ridge', name: 'Ridge', lat_deg: -89.4, lon_deg: -137, category: 'candidate', landing_utc: null },
  { id: 'a11', name: 'Apollo 11', lat_deg: 0.7, lon_deg: 23.5, category: 'apollo', landing_utc: null },
]

const ANSWERS: GuideAnswers = {
  mission: 'twoWeeks',
  priority: 'power',
  earthAtLanding: false,
  from: '2028-03',
  to: '2028-12',
  place: 'auto',
}

function slot(change: Partial<CalendarSlot> = {}): CalendarSlot {
  return {
    start_utc: '2028-05-01T00:00:00Z',
    end_utc: '2028-05-15T00:00:00Z',
    sunlight_hours: 336,
    sun_visible_fraction: 1,
    max_darkness_hours: 0,
    max_sun_el_deg: 1.4,
    sun_el_at_start_deg: 0.7,
    earth_hours: 168,
    earth_visible_fraction: 0.5,
    earth_visible_at_start: true,
    passes_requirements: true,
    score: 50,
    cycles: { lunar_day_index: 0, seasonal_phase_deg: 0, draconic_year_phase_deg: 0 },
    ...change,
  }
}

function response(grid: CalendarSlot[], ephemeris: 'spice' | 'placeholder' = 'spice'): WindowsResponse {
  return {
    grid,
    matches: grid,
    slip_analysis: null,
    cycles_summary: { synodic_month_days: 29.53, draconic_year_days: 346.62, nodal_precession_years: 18.6, libration_month_days: 27.21 },
    meta: { ephemeris, horizon: 'lola' },
  }
}

test('candidateSites picks south-pole candidates for auto', () => {
  expect(candidateSites(SITES, 'auto').map((s) => s.id)).toEqual(['pole', 'ridge'])
})

test('candidateSites picks the one chosen site', () => {
  expect(candidateSites(SITES, 'a11').map((s) => s.id)).toEqual(['a11'])
})

test('findLandings asks each candidate site with the mission length and month range', async () => {
  const queries: WindowsQuery[] = []
  await findLandings(ANSWERS, SITES, async (q) => {
    queries.push(q)
    return response([slot()])
  })
  expect(queries.map((q) => q.lat_deg)).toEqual([-89.5, -89.4])
  expect(queries[0]).toMatchObject({
    duration_hours: 336,
    search_start_utc: '2028-03-01T00:00:00Z',
    search_end_utc: '2029-01-01T00:00:00Z',
  })
})

test('findLandings ranks slots from every site together', async () => {
  const result = await findLandings(ANSWERS, SITES, async (q) =>
    response([slot({ sun_visible_fraction: q.lat_deg === -89.4 ? 1 : 0.3 })]),
  )
  expect(result.ranked.map((c) => c.site.id)).toEqual(['ridge', 'pole'])
  expect(result.emptyReason).toBeNull()
})

test('findLandings keeps results when one site fails', async () => {
  const result = await findLandings(ANSWERS, SITES, async (q) => {
    if (q.lat_deg === -89.5) throw new Error('boom')
    return response([slot()])
  })
  expect(result.failedSites.map((s) => s.id)).toEqual(['pole'])
  expect(result.ranked.map((c) => c.site.id)).toEqual(['ridge'])
})

test('findLandings rejects when every site fails', async () => {
  await expect(
    findLandings(ANSWERS, SITES, async () => {
      throw new Error('down')
    }),
  ).rejects.toThrow('Could not reach the landing calculator.')
})

test('findLandings explains an empty result caused by the Earth-at-landing wish', async () => {
  const result = await findLandings({ ...ANSWERS, earthAtLanding: true }, SITES, async () =>
    response([slot({ earth_visible_at_start: false })]),
  )
  expect(result.ranked).toEqual([])
  expect(result.emptyReason).toBe('earth-at-landing')
})

test('findLandings reports no windows when the API returns none', async () => {
  const result = await findLandings(ANSWERS, SITES, async () => response([]))
  expect(result.emptyReason).toBe('no-windows')
})

test('findLandings passes on the data quality of the first answer', async () => {
  const result = await findLandings(ANSWERS, SITES, async () => response([slot()], 'placeholder'))
  expect(result.meta?.ephemeris).toBe('placeholder')
})

test('findLandings rejects an invalid month range before calling the API', async () => {
  let called = false
  await expect(
    findLandings({ ...ANSWERS, from: '2028-12', to: '2028-03' }, SITES, async () => {
      called = true
      return response([])
    }),
  ).rejects.toThrow('The end month must be after the start month.')
  expect(called).toBe(false)
})
