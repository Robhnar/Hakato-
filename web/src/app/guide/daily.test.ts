import { expect, test } from 'vitest'
import type { Timeline } from '../../api/types'
import { dailyShares } from './daily'

function hourly(hours: number, start: string, sun: (i: number) => boolean, earth: (i: number) => boolean): Timeline {
  const t0 = new Date(start).getTime()
  const times = Array.from({ length: hours }, (_, i) => `${new Date(t0 + i * 3_600_000).toISOString().slice(0, 19)}Z`)
  const series = (on: (i: number) => boolean) => ({
    az_deg: times.map(() => 0),
    el_deg: times.map(() => 0),
    visible: times.map((_, i) => on(i)),
  })
  return { times_utc: times, sun: series(sun), earth: series(earth), meta: { ephemeris: 'spice', horizon: 'lola' } }
}

test('dailyShares groups samples by UTC day', () => {
  const t = hourly(48, '2028-05-01T00:00:00Z', (i) => i < 24, () => true)
  expect(dailyShares(t)).toEqual([
    { day: '2028-05-01', sun: 1, earth: 1 },
    { day: '2028-05-02', sun: 0, earth: 1 },
  ])
})

test('dailyShares counts only the samples of a partial day', () => {
  // start 18:00 → the first day has 6 samples, 3 of them with the Sun
  const t = hourly(12, '2028-05-01T18:00:00Z', (i) => i < 3, (i) => i >= 6)
  expect(dailyShares(t)).toEqual([
    { day: '2028-05-01', sun: 0.5, earth: 0 },
    { day: '2028-05-02', sun: 0, earth: 1 },
  ])
})

test('dailyShares of an empty timeline is empty', () => {
  expect(dailyShares(hourly(0, '2028-05-01T00:00:00Z', () => true, () => true))).toEqual([])
})
