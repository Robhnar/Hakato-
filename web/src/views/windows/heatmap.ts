import type { CalendarSlot } from '../../api/types'

/** Parametry dostępne na mapie cieplnej (014). */
export type HeatMetric =
  | 'sunlight_hours'
  | 'sun_visible_fraction'
  | 'max_darkness_hours'
  | 'earth_visible_fraction'
  | 'max_sun_el_deg'
  | 'score'

export const HEAT_METRICS: { id: HeatMetric; label: string; invert: boolean; format: (v: number) => string }[] =
  [
    { id: 'sunlight_hours', label: 'Sunlight hours', invert: false, format: (v) => `${v.toFixed(0)} h` },
    {
      id: 'sun_visible_fraction',
      label: 'Sunlight %',
      invert: false,
      format: (v) => `${(v * 100).toFixed(0)}%`,
    },
    {
      id: 'max_darkness_hours',
      label: 'Longest night (h)',
      invert: true,
      format: (v) => `${v.toFixed(0)} h`,
    },
    {
      id: 'earth_visible_fraction',
      label: 'Earth comms %',
      invert: false,
      format: (v) => `${(v * 100).toFixed(0)}%`,
    },
    { id: 'max_sun_el_deg', label: 'Max Sun elevation (°)', invert: false, format: (v) => `${v.toFixed(2)}°` },
    { id: 'score', label: 'Overall score', invert: false, format: (v) => v.toFixed(2) },
  ]

export function metricValue(slot: CalendarSlot, metric: HeatMetric): number {
  return slot[metric]
}

/** Zakres skali; przy jednym punkcie dodaje ±epsilon, żeby kolor nie był NaN. */
export function scaleBounds(values: number[]): { min: number; max: number } {
  if (values.length === 0) return { min: 0, max: 1 }
  let min = Math.min(...values)
  let max = Math.max(...values)
  if (min === max) {
    const pad = Math.abs(min) > 1e-9 ? Math.abs(min) * 0.05 : 0.05
    min -= pad
    max += pad
  }
  return { min, max }
}

/** t∈[0,1] → kolor od chłodnego (słabo) do ciepłego (dobrze). */
export function heatColor(t: number): string {
  const x = Math.min(1, Math.max(0, t))
  // navy → teal → amber
  const stops = [
    { t: 0, r: 30, g: 41, b: 59 },
    { t: 0.45, r: 14, g: 116, b: 144 },
    { t: 0.75, r: 234, g: 179, b: 8 },
    { t: 1, r: 249, g: 115, b: 22 },
  ]
  let i = 0
  while (i < stops.length - 2 && x > stops[i + 1].t) i += 1
  const a = stops[i]
  const b = stops[i + 1]
  const u = (x - a.t) / (b.t - a.t || 1)
  const r = Math.round(a.r + (b.r - a.r) * u)
  const g = Math.round(a.g + (b.g - a.g) * u)
  const bl = Math.round(a.b + (b.b - a.b) * u)
  return `rgb(${r}, ${g}, ${bl})`
}

/**
 * Kolor komórki. `invert=true` (np. najdłuższa noc): niższa wartość = lepszy kolor.
 */
export function colorForValue(
  value: number,
  min: number,
  max: number,
  invert = false,
): string {
  const span = max - min || 1
  let t = (value - min) / span
  if (invert) t = 1 - t
  return heatColor(t)
}

/** Grupuje sloty po roku startu (etykiety osi). */
export function groupByStartYear(grid: CalendarSlot[]): { year: number; slots: CalendarSlot[] }[] {
  const map = new Map<number, CalendarSlot[]>()
  for (const slot of grid) {
    const year = Number(slot.start_utc.slice(0, 4))
    const list = map.get(year) ?? []
    list.push(slot)
    map.set(year, list)
  }
  return [...map.entries()]
    .sort(([a], [b]) => a - b)
    .map(([year, slots]) => ({
      year,
      slots: [...slots].sort((a, b) => a.start_utc.localeCompare(b.start_utc)),
    }))
}
