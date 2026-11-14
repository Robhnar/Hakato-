import { expect, test } from 'vitest'
import {
  defaultMonthRange,
  formatDay,
  formatDuration,
  formatLocalTime,
  formatPercent,
  formatUtcTime,
  monthRangeToSearch,
} from './format'

test('formatDay renders weekday, day, month and year in UTC', () => {
  expect(formatDay('2028-05-27T15:40:14Z')).toBe('Sat 27 May 2028')
})

test('formatUtcTime renders zero-padded 24h time in UTC', () => {
  expect(formatUtcTime('2028-05-27T15:40:14Z')).toBe('15:40 UTC')
})

test('formatLocalTime converts to the given zone', () => {
  expect(formatLocalTime('2028-05-27T15:40:14Z', 'Europe/Warsaw')).toBe('17:40 your time')
})

test('formatLocalTime falls back to the browser local zone', () => {
  expect(formatLocalTime('2028-05-27T15:40:14Z')).toMatch(/^\d{2}:\d{2} your time$/)
})

test('formatDuration returns none for zero', () => {
  expect(formatDuration(0)).toBe('none')
})

test('formatDuration renders hours and rounds up', () => {
  expect(formatDuration(1)).toBe('1 hour')
  expect(formatDuration(5)).toBe('5 hours')
  expect(formatDuration(23.6)).toBe('24 hours')
})

test('formatDuration renders days from 24h up', () => {
  expect(formatDuration(30)).toBe('about 1 day')
  expect(formatDuration(336)).toBe('about 14 days')
  expect(formatDuration(2126.1)).toBe('about 89 days')
})

test('formatPercent rounds to a whole percent', () => {
  expect(formatPercent(0.512)).toBe('51%')
  expect(formatPercent(1)).toBe('100%')
  expect(formatPercent(0)).toBe('0%')
})

test('defaultMonthRange starts the month after now', () => {
  expect(defaultMonthRange(new Date('2026-11-14T00:00:00Z'))).toEqual({
    from: '2026-12',
    to: '2027-11',
  })
})

test('defaultMonthRange rolls over the year in UTC', () => {
  expect(defaultMonthRange(new Date('2026-12-31T23:00:00Z'))).toEqual({
    from: '2027-01',
    to: '2027-12',
  })
})

test('monthRangeToSearch returns start and end of the range', () => {
  expect(monthRangeToSearch('2028-03', '2028-12')).toEqual({
    search_start_utc: '2028-03-01T00:00:00Z',
    search_end_utc: '2029-01-01T00:00:00Z',
  })
})

test('monthRangeToSearch handles a single month', () => {
  expect(monthRangeToSearch('2028-03', '2028-03')).toEqual({
    search_start_utc: '2028-03-01T00:00:00Z',
    search_end_utc: '2028-04-01T00:00:00Z',
  })
})

test('monthRangeToSearch rejects empty or malformed months', () => {
  expect(monthRangeToSearch('', '2028-12')).toEqual({ error: 'Choose both months.' })
  expect(monthRangeToSearch('2028-13', '2028-12')).toEqual({ error: 'Choose both months.' })
  expect(monthRangeToSearch('2028-03', 'foo')).toEqual({ error: 'Choose both months.' })
})

test('monthRangeToSearch rejects an end before the start', () => {
  expect(monthRangeToSearch('2028-12', '2028-03')).toEqual({
    error: 'The latest month can’t be before the earliest month.',
  })
})

test('monthRangeToSearch rejects more than 24 months', () => {
  expect(monthRangeToSearch('2028-01', '2030-01')).toEqual({
    error: 'Choose a period of 2 years or less.',
  })
})

test('monthRangeToSearch allows exactly 24 months', () => {
  expect(monthRangeToSearch('2028-01', '2029-12')).toEqual({
    search_start_utc: '2028-01-01T00:00:00Z',
    search_end_utc: '2030-01-01T00:00:00Z',
  })
})
