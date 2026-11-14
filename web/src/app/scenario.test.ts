import { expect, test } from 'vitest'
import { endUtc, scenarioFromSite, toIsoZ, toRangeQuery } from './scenario'

const site = { name: 'Test', lat_deg: -89.5, lon_deg: 0 }

test('toIsoZ drops milliseconds', () => {
  expect(toIsoZ(new Date('2027-01-01T00:00:00.123Z'))).toBe('2027-01-01T00:00:00Z')
})

test('endUtc adds the duration', () => {
  const scenario = scenarioFromSite(site, '2027-01-01T00:00:00Z', 36)
  expect(endUtc(scenario)).toBe('2027-01-02T12:00:00Z')
})

test('scenarios get distinct ids', () => {
  const a = scenarioFromSite(site, '2027-01-01T00:00:00Z')
  const b = scenarioFromSite(site, '2027-01-01T00:00:00Z')
  expect(a.id).not.toBe(b.id)
})

test('toRangeQuery carries site and time range', () => {
  const scenario = scenarioFromSite(site, '2027-01-01T00:00:00Z', 24)
  expect(toRangeQuery(scenario, 30)).toEqual({
    lat_deg: -89.5,
    lon_deg: 0,
    start_utc: '2027-01-01T00:00:00Z',
    end_utc: '2027-01-02T00:00:00Z',
    step_minutes: 30,
  })
})
