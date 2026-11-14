// Rozkład dzień po dniu: jaka część każdego dnia UTC ma Słońce i Ziemię nad horyzontem.

import type { Timeline } from '../../api/types'

export interface DayShare {
  /** Dzień UTC, YYYY-MM-DD. */
  day: string
  /** Ułamek próbek dnia ze Słońcem nad horyzontem (0–1). */
  sun: number
  /** Ułamek próbek dnia z Ziemią nad horyzontem (0–1). */
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
