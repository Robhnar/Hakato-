import { azToX, elToY, plotInner, type PlotLayout, toSvgPoint } from './project'

export interface AzElSeries {
  az_deg: number[]
  el_deg: number[]
}

/** A track segment of constant visibility (Sun/Earth above the terrain line). */
export interface VisibleTrailSegment {
  visible: boolean
  az_deg: number[]
  el_deg: number[]
}

/**
 * Splits the track into segments of constant visibility; adjacent segments share the
 * boundary point so the solid and dashed lines meet without a gap. An azimuth
 * jump > 180° (crossing north) always starts a new segment — otherwise
 * a horizontal line across the whole chart would appear.
 */
export function splitTrailByVisibility(series: AzElSeries & { visible: boolean[] }): VisibleTrailSegment[] {
  const { az_deg, el_deg } = series
  const n = Math.min(az_deg.length, el_deg.length)
  if (n === 0) return []

  const visibleAt = (index: number) => series.visible[index] ?? true
  const segments: VisibleTrailSegment[] = []
  let current: VisibleTrailSegment = {
    visible: visibleAt(0),
    az_deg: [az_deg[0]],
    el_deg: [el_deg[0]],
  }

  for (let i = 1; i < n; i += 1) {
    const wraps = Math.abs(az_deg[i] - az_deg[i - 1]) > 180
    const flag = visibleAt(i)

    if (flag !== current.visible) {
      // The boundary point belongs to both segments — a shared joint instead of a gap.
      if (!wraps) {
        current.az_deg.push(az_deg[i])
        current.el_deg.push(el_deg[i])
      }
      segments.push(current)
      current = { visible: flag, az_deg: [az_deg[i]], el_deg: [el_deg[i]] }
    } else if (wraps) {
      segments.push(current)
      current = { visible: flag, az_deg: [az_deg[i]], el_deg: [el_deg[i]] }
    } else {
      current.az_deg.push(az_deg[i])
      current.el_deg.push(el_deg[i])
    }
  }

  segments.push(current)
  return segments
}

/**
 * Splits the track into segments when crossing north (azimuth jump > 180°),
 * so no horizontal line is drawn across the whole chart.
 */
export function splitTrailByAzimuthWrap(series: AzElSeries): AzElSeries[] {
  const { az_deg, el_deg } = series
  const n = Math.min(az_deg.length, el_deg.length)
  if (n === 0) return []

  const segments: AzElSeries[] = []
  let azSeg = [az_deg[0]]
  let elSeg = [el_deg[0]]

  for (let i = 1; i < n; i++) {
    const jump = Math.abs(az_deg[i] - az_deg[i - 1])
    if (jump > 180) {
      segments.push({ az_deg: azSeg, el_deg: elSeg })
      azSeg = [az_deg[i]]
      elSeg = [el_deg[i]]
    } else {
      azSeg.push(az_deg[i])
      elSeg.push(el_deg[i])
    }
  }
  segments.push({ az_deg: azSeg, el_deg: elSeg })
  return segments
}

export function polylinePath(az_deg: number[], el_deg: number[], layout: PlotLayout): string {
  const n = Math.min(az_deg.length, el_deg.length)
  if (n === 0) return ''
  const parts: string[] = []
  for (let i = 0; i < n; i++) {
    const { x, y } = toSvgPoint(az_deg[i], el_deg[i], layout)
    parts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`)
  }
  return parts.join(' ')
}

/** Filled terrain silhouette: the horizon profile + closure along the bottom edge of the chart. */
export function horizonSilhouettePath(
  elevation_deg: number[],
  azimuth_step_deg: number,
  layout: PlotLayout,
): string {
  if (elevation_deg.length === 0 || azimuth_step_deg <= 0) return ''

  const parts: string[] = []
  for (let i = 0; i < elevation_deg.length; i++) {
    const az = i * azimuth_step_deg
    const x = azToX(az, layout)
    const y = elToY(elevation_deg[i], layout)
    parts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`)
  }

  // Close to the right edge of the panorama (az 360°), then down to elMin and left.
  // azToX(360) wraps to 0°, so we take the right edge from the chart geometry.
  const lastEl = elevation_deg[elevation_deg.length - 1]
  const inner = plotInner(layout)
  const x360 = inner.x + inner.w
  const yLast = elToY(lastEl, layout)
  const yFloor = elToY(layout.elMin, layout)
  const x0 = inner.x
  parts.push(`L${x360.toFixed(2)} ${yLast.toFixed(2)}`)
  parts.push(`L${x360.toFixed(2)} ${yFloor.toFixed(2)}`)
  parts.push(`L${x0.toFixed(2)} ${yFloor.toFixed(2)}`)
  parts.push('Z')
  return parts.join(' ')
}

/** Top edge of the terrain silhouette (line only, no fill) extended to 360°. */
export function horizonEdgePath(
  elevation_deg: number[],
  azimuth_step_deg: number,
  layout: PlotLayout,
): string {
  if (elevation_deg.length === 0 || azimuth_step_deg <= 0) return ''

  const parts: string[] = []
  for (let i = 0; i < elevation_deg.length; i++) {
    const x = azToX(i * azimuth_step_deg, layout)
    const y = elToY(elevation_deg[i], layout)
    parts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`)
  }
  if (elevation_deg.length * azimuth_step_deg < 360) {
    const inner = plotInner(layout)
    const y = elToY(elevation_deg[elevation_deg.length - 1], layout)
    parts.push(`L${(inner.x + inner.w).toFixed(2)} ${y.toFixed(2)}`)
  }
  return parts.join(' ')
}

export function trailPaths(series: AzElSeries, layout: PlotLayout): string[] {
  return splitTrailByAzimuthWrap(series)
    .map((segment) => polylinePath(segment.az_deg, segment.el_deg, layout))
    .filter((d) => d.length > 0)
}

/** Track paths split into visible (solid) and occluded (dashed). */
export function trailPathSegments(
  series: AzElSeries & { visible: boolean[] },
  layout: PlotLayout,
): { d: string; visible: boolean }[] {
  return splitTrailByVisibility(series)
    .map((segment) => ({
      d: polylinePath(segment.az_deg, segment.el_deg, layout),
      visible: segment.visible,
    }))
    .filter((segment) => segment.d.length > 0)
}
