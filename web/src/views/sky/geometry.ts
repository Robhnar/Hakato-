export interface PlotBounds {
  left: number
  top: number
  width: number
  height: number
}

export interface ElevationRange {
  min: number
  max: number
}

export interface PlotPoint {
  x: number
  y: number
}

export interface TrackSegment {
  azimuths: number[]
  elevations: number[]
}

export function getElevationRange(...series: ReadonlyArray<readonly number[]>): ElevationRange {
  let min = 0
  let max = 0
  let hasValue = false
  for (const values of series) {
    for (const value of values) {
      if (Number.isFinite(value)) {
        hasValue = true
        min = Math.min(min, value)
        max = Math.max(max, value)
      }
    }
  }

  if (!hasValue) return { min: -1, max: 1 }
  const padding = Math.max(0.25, (max - min) * 0.06)
  return { min: min - padding, max: max + padding }
}

export function projectPoint(
  azimuth: number,
  elevation: number,
  range: ElevationRange,
  bounds: PlotBounds,
): PlotPoint {
  const azimuthInRange = Math.max(0, Math.min(360, azimuth))
  const elevationFraction = (elevation - range.min) / (range.max - range.min)
  return {
    x: bounds.left + (azimuthInRange / 360) * bounds.width,
    y: bounds.top + (1 - elevationFraction) * bounds.height,
  }
}

export function horizonElevationAt(
  azimuth: number,
  elevations: readonly number[],
  azimuthStep: number,
): number {
  if (elevations.length === 0 || !Number.isFinite(azimuthStep) || azimuthStep <= 0) return 0

  const sample = (((azimuth % 360) + 360) % 360) / azimuthStep
  const firstIndex = Math.floor(sample)
  const fraction = sample - firstIndex
  const first = elevations[firstIndex % elevations.length]
  const second = elevations[(firstIndex + 1) % elevations.length]
  return first + (second - first) * fraction
}

export function splitTrack(
  azimuths: readonly number[],
  elevations: readonly number[],
): TrackSegment[] {
  const length = Math.min(azimuths.length, elevations.length)
  const segments: TrackSegment[] = []

  for (let index = 0; index < length; index += 1) {
    const azimuth = azimuths[index]
    const elevation = elevations[index]
    if (!Number.isFinite(azimuth) || !Number.isFinite(elevation)) continue

    const previous = segments.at(-1)
    const previousAzimuth = previous?.azimuths.at(-1)
    if (previousAzimuth !== undefined && Math.abs(azimuth - previousAzimuth) > 180) {
      segments.push({ azimuths: [], elevations: [] })
    }

    const segment = segments.at(-1)
    if (segment) {
      segment.azimuths.push(azimuth)
      segment.elevations.push(elevation)
    } else {
      segments.push({ azimuths: [azimuth], elevations: [elevation] })
    }
  }

  return segments.filter((segment) => segment.azimuths.length > 0)
}

export function nearestSampleIndex(times: readonly string[], cursorUtc: string): number {
  if (times.length === 0) return -1

  const cursor = Date.parse(cursorUtc)
  if (!Number.isFinite(cursor)) return 0

  let nearest = -1
  let nearestDistance = Number.POSITIVE_INFINITY
  for (let index = 0; index < times.length; index += 1) {
    const time = Date.parse(times[index])
    if (!Number.isFinite(time)) continue
    const distance = Math.abs(time - cursor)
    if (distance < nearestDistance) {
      nearest = index
      nearestDistance = distance
    }
  }
  return nearest
}
