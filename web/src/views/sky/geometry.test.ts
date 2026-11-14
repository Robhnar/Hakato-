import { expect, test } from 'vitest'
import {
  getElevationRange,
  horizonElevationAt,
  nearestSampleIndex,
  projectPoint,
  splitTrack,
} from './geometry'

test('elevation scale fits small polar changes and includes the horizon', () => {
  const range = getElevationRange([-0.8, 1.2], [0.4, 2.1], [0])

  expect(range.min).toBeLessThan(-0.8)
  expect(range.max).toBeGreaterThan(2.1)
  expect(range.max - range.min).toBeLessThan(5)
})

test('elevation scale expands for equatorial Sun elevations', () => {
  const range = getElevationRange([-2, 90], [0, 3])

  expect(range.min).toBeLessThan(0)
  expect(range.max).toBeGreaterThan(90)
})

test('projects azimuth and elevation into the chart bounds', () => {
  expect(
    projectPoint(180, 40, { min: -10, max: 90 }, { left: 50, top: 20, width: 360, height: 180 }),
  ).toEqual({ x: 230, y: 110 })
})

test('interpolates the horizon and wraps from 359 degrees to north', () => {
  const elevations = Array.from({ length: 360 }, (_, azimuth) => (azimuth === 359 ? 20 : 0))

  expect(horizonElevationAt(0.5, elevations, 1)).toBe(0)
  expect(horizonElevationAt(359.5, elevations, 1)).toBe(10)
  expect(horizonElevationAt(360.5, elevations, 1)).toBe(0)
})

test('splits a track at the azimuth wrap instead of drawing across the chart', () => {
  expect(splitTrack([350, 355, 2, 8], [1, 2, 3, 4])).toEqual([
    { azimuths: [350, 355], elevations: [1, 2] },
    { azimuths: [2, 8], elevations: [3, 4] },
  ])
})

test('finds the nearest sample to the shared cursor', () => {
  const samples = ['2027-01-01T00:00:00Z', '2027-01-01T01:00:00Z', '2027-01-01T02:00:00Z']

  expect(nearestSampleIndex(samples, '2027-01-01T01:40:00Z')).toBe(2)
  expect(nearestSampleIndex(samples, 'invalid')).toBe(0)
  expect(nearestSampleIndex([], '2027-01-01T00:00:00Z')).toBe(-1)
})
