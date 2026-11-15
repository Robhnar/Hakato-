// Day-by-day breakdown: what part of each UTC day has the Sun and Earth above the horizon.

import type { Timeline } from '../../api/types'

export interface DayShare {
  /** UTC day, YYYY-MM-DD. */
  day: string
  /** Fraction of the day's samples with the Sun above the horizon (0–1). */
  sun: number
  /** Fraction of the day's samples with Earth above the horizon (0–1). */
  earth: number
}

export function dailyShares(t: Timeline): DayShare[] {
  const days = new Map<string, { n: number; sun: number; earth: number }>()
  t.times_utc.forEach((utc, i) => {
    const day = utc.slice(0, 10)
    const acc = days.get(day) ?? { n: 0, sun: 0, earth: 0 }
    acc.n += 1
    if (t.sun.visible[i]) acc.sun += 1
    if (t.earth.visible[i]) acc.earth += 1
    days.set(day, acc)
  })
  return [...days].map(([day, acc]) => ({ day, sun: acc.sun / acc.n, earth: acc.earth / acc.n }))
}
