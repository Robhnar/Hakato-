import { describe, expect, it } from 'vitest'
import { formatCoords, formatDuration, formatHours, formatLon, formatPercent, formatUtc, wrapLon } from './format'

describe('format', () => {
  it('UTC time without seconds and the letter T', () => {
    expect(formatUtc('2027-05-19T19:13:16Z')).toBe('19 May 2027 19:13 UTC')
    expect(formatUtc('nie-data')).toBe('—')
  })
  it('longitude always within −180…180 with a hemisphere', () => {
    expect(wrapLon(315)).toBe(-45)
    expect(wrapLon(180)).toBe(180)
    expect(wrapLon(-180)).toBe(180)
    expect(formatLon(315)).toBe('45.00°W')
    expect(formatLon(0)).toBe('0.00°E')
    expect(formatCoords(-89.45, -137.3)).toBe('89.45°S 137.30°W')
    expect(formatCoords(-88.5, 315, 1)).toBe('88.5°S 45.0°W')
  })
  it('invalid values give a dash', () => {
    expect(formatHours(Number.NaN)).toBe('—')
    expect(formatPercent(Number.NaN)).toBe('—')
    expect(formatHours(336)).toBe('336.0 h')
    expect(formatPercent(0.874)).toBe('87%')
  })
  it('window length in human language', () => {
    expect(formatDuration(72)).toBe('3 days')
    expect(formatDuration(336)).toBe('14 days')
    expect(formatDuration(708.7)).toBe('1 lunar day')
    expect(formatDuration(2126.1)).toBe('3 lunar days')
    expect(formatDuration(100)).toBe('100 h')
  })
})
