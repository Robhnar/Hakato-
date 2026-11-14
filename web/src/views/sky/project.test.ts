import { expect, test } from 'vitest'
import {
  azToX,
  elToY,
  elevationRange,
  horizonElevationAt,
  nearestTimeIndex,
  type PlotLayout,
  toSvgPoint,
} from './project'

const layout: PlotLayout = {
  width: 800,
  height: 400,
  padding: { top: 20, right: 20, bottom: 40, left: 50 },
  elMin: -2,
  elMax: 8,
}

test('azToX maps 0 / 180 / wrapped 360 onto the plot', () => {
  expect(azToX(0, layout)).toBeCloseTo(50)
  // 360° is north again — same as 0° (left edge); right edge is drawn explicitly in paths.
  expect(azToX(360, layout)).toBeCloseTo(50)
  expect(azToX(180, layout)).toBeCloseTo(415)
})

test('azToX wraps negative and >360 azimuths', () => {
  expect(azToX(-90, layout)).toBeCloseTo(azToX(270, layout))
  expect(azToX(450, layout)).toBeCloseTo(azToX(90, layout))
})

test('elToY puts higher elevation nearer the top', () => {
  const high = elToY(8, layout)
  const low = elToY(-2, layout)
  const mid = elToY(3, layout)
  expect(high).toBeCloseTo(20)
  expect(low).toBeCloseTo(360)
  expect(mid).toBeGreaterThan(high)
  expect(mid).toBeLessThan(low)
})

test('toSvgPoint combines az and el', () => {
  const p = toSvgPoint(90, 8, layout)
  expect(p.x).toBeCloseTo(azToX(90, layout))
  expect(p.y).toBeCloseTo(elToY(8, layout))
})

test('elevationRange pads data and includes zero', () => {
  const polar = elevationRange([-0.5, 1.5, 0.2])
  expect(polar.elMin).toBeLessThan(-0.5)
  expect(polar.elMax).toBeGreaterThan(1.5)

  const equator = elevationRange([-10, 89])
  expect(equator.elMax).toBeGreaterThan(89)
  expect(equator.elMin).toBeLessThan(-10)
})

test('nearestTimeIndex picks the closest sample', () => {
  const times = ['2027-01-01T00:00:00Z', '2027-01-01T01:00:00Z', '2027-01-01T02:00:00Z']
  expect(nearestTimeIndex(times, '2027-01-01T00:50:00Z')).toBe(1)
  expect(nearestTimeIndex(times, '2027-01-01T00:10:00Z')).toBe(0)
  expect(nearestTimeIndex(times, '2026-12-31T23:00:00Z')).toBe(0)
})

test('horizonElevationAt interpolates and wraps', () => {
  const elev = [0, 10, 20, 30]
  expect(horizonElevationAt(0, elev, 90)).toBeCloseTo(0)
  expect(horizonElevationAt(45, elev, 90)).toBeCloseTo(5)
  expect(horizonElevationAt(360, elev, 90)).toBeCloseTo(0)
  // Between last (270°) and first (0°/360°)
  expect(horizonElevationAt(315, elev, 90)).toBeCloseTo(15)
})
