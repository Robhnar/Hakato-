import { expect, test } from 'vitest'
import { bandsFromWindows, hoursFromStart, windowsFromVisibility } from './windows'

test('hoursFromStart measures elapsed hours', () => {
  expect(hoursFromStart('2027-01-01T00:00:00Z', '2027-01-01T12:00:00Z')).toBe(12)
})

test('bandsFromWindows clips to the scenario window', () => {
  const bands = bandsFromWindows('2027-01-01T00:00:00Z', 24, [
    { start_utc: '2026-12-31T20:00:00Z', end_utc: '2027-01-01T06:00:00Z' },
    { start_utc: '2027-01-01T20:00:00Z', end_utc: '2027-01-02T10:00:00Z' },
  ])
  expect(bands).toEqual([
    { startHours: 0, endHours: 6 },
    { startHours: 20, endHours: 24 },
  ])
})

test('windowsFromVisibility merges consecutive true samples', () => {
  const times = [
    '2027-01-01T00:00:00Z',
    '2027-01-01T01:00:00Z',
    '2027-01-01T02:00:00Z',
    '2027-01-01T03:00:00Z',
    '2027-01-01T04:00:00Z',
  ]
  expect(windowsFromVisibility(times, [false, true, true, false, true])).toEqual([
    { start_utc: '2027-01-01T01:00:00Z', end_utc: '2027-01-01T03:00:00Z' },
    { start_utc: '2027-01-01T04:00:00Z', end_utc: '2027-01-01T04:00:00Z' },
  ])
})
