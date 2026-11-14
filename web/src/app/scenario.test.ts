import { expect, test } from 'vitest'
import {
  duplicateScenario,
  endUtc,
  scenarioFromSite,
  toIsoZ,
  toRangeQuery,
  validateCoords,
} from './scenario'

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

test('validateCoords accepts ME ranges', () => {
  expect(validateCoords(-89.5, 0)).toBeNull()
  expect(validateCoords(90, 180)).toBeNull()
  expect(validateCoords(-90, -180)).toBeNull()
})

test('validateCoords rejects out-of-range values', () => {
  expect(validateCoords(91, 0)).toBe('lat')
  expect(validateCoords(0, 181)).toBe('lon')
  expect(validateCoords(100, 200)).toBe('both')
  expect(validateCoords(Number.NaN, 0)).toBe('lat')
  // Number('') === 0 would pass ranges; callers must reject empty strings first.
  expect(validateCoords(0, 0)).toBeNull()
})

test('duplicateScenario keeps fields and gets a new id', () => {
  const original = scenarioFromSite(site, '2027-01-01T00:00:00Z', 24)
  const copy = duplicateScenario(original)
  expect(copy.id).not.toBe(original.id)
  expect(copy).toMatchObject({
    name: original.name,
    lat_deg: original.lat_deg,
    lon_deg: original.lon_deg,
    start_utc: original.start_utc,
    duration_hours: original.duration_hours,
  })
})
