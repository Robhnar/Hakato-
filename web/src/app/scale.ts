// Shared score color scale (task 021): one hue from dark to light,
// lighter = better. It is used by the heatmap in Windows and the layer of
// candidates in the map overlay, so changing the stops changes both views at once.

/** Scale stops from worst (dark) to best (light). */
export const SCORE_STOPS: readonly string[] = [
  '#1b2a2e',
  '#1f4a4f',
  '#2a7170',
  '#4c9a8b',
  '#8cc3a4',
  '#d6ecc6',
]

type Rgb = readonly [number, number, number]

function hexToRgb(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1), 16)
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff]
}

const STOPS: readonly Rgb[] = SCORE_STOPS.map(hexToRgb)

/**
 * Color for position `t` (0 = worst, 1 = best). Out-of-range values
 * and NaN are clamped to 0, so the scale never returns `NaN`.
 */
export function scoreColor(t: number): string {
  const x = Number.isFinite(t) ? Math.min(1, Math.max(0, t)) : 0
  const scaled = x * (STOPS.length - 1)
  // The last stop has no successor - interpolation ends there.
  const i = Math.min(STOPS.length - 2, Math.floor(scaled))
  const u = scaled - i
  const a = STOPS[i]
  const b = STOPS[i + 1]
  const r = Math.round(a[0] + (b[0] - a[0]) * u)
  const g = Math.round(a[1] + (b[1] - a[1]) * u)
  const bl = Math.round(a[2] + (b[2] - a[2]) * u)
  return `rgb(${r}, ${g}, ${bl})`
}

/** Legend bar: a gradient through all the scale stops. */
export function scoreRampCss(): string {
  return `linear-gradient(to right, ${SCORE_STOPS.join(', ')})`
}
