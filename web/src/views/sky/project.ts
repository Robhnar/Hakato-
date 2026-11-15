/** Converting azimuth/elevation to SVG panorama coordinates. */

export interface PlotPadding {
  top: number
  right: number
  bottom: number
  left: number
}

export interface PlotLayout {
  width: number
  height: number
  padding: PlotPadding
  elMin: number
  elMax: number
}

export function plotInner(layout: PlotLayout): { x: number; y: number; w: number; h: number } {
  const { width, height, padding } = layout
  return {
    x: padding.left,
    y: padding.top,
    w: width - padding.left - padding.right,
    h: height - padding.top - padding.bottom,
  }
}

/** Azimuth 0° (north) on the left, 360° on the right. */
export function azToX(az_deg: number, layout: PlotLayout): number {
  const { x, w } = plotInner(layout)
  const az = ((az_deg % 360) + 360) % 360
  return x + (az / 360) * w
}

/** Elevation: elMax at the top, elMin at the bottom. */
export function elToY(el_deg: number, layout: PlotLayout): number {
  const { y, h } = plotInner(layout)
  const { elMin, elMax } = layout
  const span = elMax - elMin
  if (span <= 0) return y + h / 2
  return y + ((elMax - el_deg) / span) * h
}

export function toSvgPoint(az_deg: number, el_deg: number, layout: PlotLayout): { x: number; y: number } {
  return { x: azToX(az_deg, layout), y: elToY(el_deg, layout) }
}

/**
 * Elevation range fitted to the data (pole: a few degrees; equator: up to ~90°).
 * Always includes 0°, with a small margin.
 */
export function elevationRange(values: Iterable<number>, padFraction = 0.12, minPadDeg = 0.4): {
  elMin: number
  elMax: number
} {
  let min = 0
  let max = 0
  for (const value of values) {
    if (!Number.isFinite(value)) continue
    if (value < min) min = value
    if (value > max) max = value
  }
  const span = Math.max(max - min, 1e-6)
  const pad = Math.max(span * padFraction, minPadDeg)
  return { elMin: min - pad, elMax: max + pad }
}

/** Index of the time sample nearest to the cursor. */
export function nearestTimeIndex(times_utc: string[], cursor_utc: string): number {
  if (times_utc.length === 0) return 0
  const target = Date.parse(cursor_utc)
  if (!Number.isFinite(target)) return 0
  let best = 0
  let bestDist = Infinity
  for (let i = 0; i < times_utc.length; i++) {
    const t = Date.parse(times_utc[i])
    if (!Number.isFinite(t)) continue
    const dist = Math.abs(t - target)
    if (dist < bestDist) {
      bestDist = dist
      best = i
    }
  }
  return best
}

/** Horizon elevation at a given azimuth (linear interpolation, 360° wraparound). */
export function horizonElevationAt(
  az_deg: number,
  elevation_deg: number[],
  azimuth_step_deg: number,
): number {
  const n = elevation_deg.length
  if (n === 0 || azimuth_step_deg <= 0) return 0
  const az = ((az_deg % 360) + 360) % 360
  const exact = az / azimuth_step_deg
  const i0 = Math.floor(exact) % n
  const i1 = (i0 + 1) % n
  const frac = exact - Math.floor(exact)
  return elevation_deg[i0] * (1 - frac) + elevation_deg[i1] * frac
}
