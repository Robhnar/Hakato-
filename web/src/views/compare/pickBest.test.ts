import { expect, test } from 'vitest'
import { isBest, pickBestIndices } from './pickBest'

test('pickBestIndices picks the maximum', () => {
  expect(pickBestIndices([0.2, 0.8, 0.5])).toEqual([1])
})

test('pickBestIndices picks the minimum when asked', () => {
  expect(pickBestIndices([12, 3, 7], 'min')).toEqual([1])
})

test('pickBestIndices returns all ties', () => {
  expect(pickBestIndices([0.5, 0.9, 0.9])).toEqual([1, 2])
})

test('pickBestIndices ignores missing data', () => {
  expect(pickBestIndices([null, undefined, Number.NaN, 0.4, 0.1])).toEqual([3])
  expect(pickBestIndices([null, undefined, Number.NaN])).toEqual([])
})

test('isBest matches pickBestIndices', () => {
  const values = [1, 3, 3, 2]
  expect(isBest(values, 1)).toBe(true)
  expect(isBest(values, 2)).toBe(true)
  expect(isBest(values, 0)).toBe(false)
  expect(isBest([null, 2], 0)).toBe(false)
})
