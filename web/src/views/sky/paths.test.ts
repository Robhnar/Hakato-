import { expect, test } from 'vitest'
import {
  horizonSilhouettePath,
  polylinePath,
  splitTrailByAzimuthWrap,
  splitTrailByVisibility,
  trailPaths,
} from './paths'
import type { PlotLayout } from './project'

const layout: PlotLayout = {
  width: 400,
  height: 200,
  padding: { top: 10, right: 10, bottom: 20, left: 30 },
  elMin: -1,
  elMax: 2,
}

test('splitTrailByAzimuthWrap breaks at north crossing', () => {
  const segments = splitTrailByAzimuthWrap({
    az_deg: [350, 355, 5, 10],
    el_deg: [1, 1.1, 1.2, 1.3],
  })
  expect(segments).toHaveLength(2)
  expect(segments[0].az_deg).toEqual([350, 355])
  expect(segments[1].az_deg).toEqual([5, 10])
})

test('splitTrailByAzimuthWrap keeps continuous trail intact', () => {
  const segments = splitTrailByAzimuthWrap({
    az_deg: [10, 20, 30],
    el_deg: [0, 0.5, 1],
  })
  expect(segments).toHaveLength(1)
  expect(segments[0].az_deg).toEqual([10, 20, 30])
})

test('polylinePath starts with M and continues with L', () => {
  const d = polylinePath([0, 90], [0, 1], layout)
  expect(d.startsWith('M')).toBe(true)
  expect(d.includes(' L')).toBe(true)
})

test('trailPaths yields one path per wrap segment', () => {
  const paths = trailPaths({ az_deg: [350, 10], el_deg: [0, 0] }, layout)
  expect(paths).toHaveLength(2)
})

test('horizonSilhouettePath closes with Z', () => {
  const d = horizonSilhouettePath([0.5, 1, 0.2, 0], 90, layout)
  expect(d.endsWith('Z')).toBe(true)
  expect(d.startsWith('M')).toBe(true)
})

test('tnie ślad na widoczny i zasłonięty z wspólnym punktem granicznym', () => {
  const parts = splitTrailByVisibility({
    az_deg: [10, 20, 30, 40],
    el_deg: [1, 2, 3, 4],
    visible: [true, true, false, false],
  })
  expect(parts.map((part) => part.visible)).toEqual([true, false])
  expect(parts[0].az_deg).toEqual([10, 20, 30])
  expect(parts[1].az_deg).toEqual([30, 40])
})

test('stała widoczność daje jeden odcinek, pusta seria – zero', () => {
  expect(
    splitTrailByVisibility({ az_deg: [1, 2], el_deg: [0, 0], visible: [true, true] }),
  ).toHaveLength(1)
  expect(splitTrailByVisibility({ az_deg: [], el_deg: [], visible: [] })).toEqual([])
})
