// Pure math of the grid and great circles for the Moon globe.
//
// No three.js imports: the module only computes coordinates and can be tested
// in Node without WebGL. Converting to vectors and drawing lines is MoonGlobe's job.

export interface GlobePoint {
  lat_deg: number
  lon_deg: number
}

/** Same frame as in `geo.ts`: +X = (0°, 0°), +Y = north pole, +Z = 90°W. */
const DEG = Math.PI / 180

function toVector(lat_deg: number, lon_deg: number): [number, number, number] {
  const lat = lat_deg * DEG
  const lon = lon_deg * DEG
  const r = Math.cos(lat)
  return [r * Math.cos(lon), Math.sin(lat), -r * Math.sin(lon)]
}

function toLatLon(x: number, y: number, z: number): GlobePoint {
  const r = Math.hypot(x, y, z) || 1
  return {
    lat_deg: Math.asin(Math.max(-1, Math.min(1, y / r))) / DEG,
    lon_deg: Math.atan2(-z, x) / DEG,
  }
}

function cross(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
): [number, number, number] {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}

function normalize(v: readonly [number, number, number]): [number, number, number] {
  const length = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / length, v[1] / length, v[2] / length]
}

/** Closed parallel: the last point is a copy of the first. */
export function parallelPoints(lat_deg: number, segments = 180): GlobePoint[] {
  const count = Math.max(1, Math.floor(segments))
  const points: GlobePoint[] = []
  for (let i = 0; i < count; i += 1) {
    points.push({ lat_deg, lon_deg: -180 + (360 * i) / count })
  }
  points.push({ ...points[0] })
  return points
}

/** Meridian from the south pole (−90°) to the north pole (90°). */
export function meridianPoints(lon_deg: number, segments = 90): GlobePoint[] {
  const count = Math.max(1, Math.floor(segments))
  const points: GlobePoint[] = []
  for (let i = 0; i <= count; i += 1) {
    points.push({ lat_deg: -90 + (180 * i) / count, lon_deg })
  }
  return points
}

/**
 * Great circle of points 90° from the center - the terminator for the
 * subsolar point, the Earth visibility limit for the sub-Earth point.
 *
 * Orthonormal basis (u, v) perpendicular to the center vector; for a center near
 * the pole the X axis is too parallel, so Z becomes the helper axis.
 */
export function horizonCircle(center: GlobePoint, segments = 180): GlobePoint[] {
  const count = Math.max(3, Math.floor(segments))
  const c = toVector(center.lat_deg, center.lon_deg)
  const helper: [number, number, number] = Math.abs(c[0]) < 0.9 ? [1, 0, 0] : [0, 0, 1]
  const u = normalize(cross(helper, c))
  const v = cross(c, u)

  const points: GlobePoint[] = []
  for (let i = 0; i < count; i += 1) {
    const theta = (2 * Math.PI * i) / count
    const cos = Math.cos(theta)
    const sin = Math.sin(theta)
    points.push(toLatLon(u[0] * cos + v[0] * sin, u[1] * cos + v[1] * sin, u[2] * cos + v[2] * sin))
  }
  points.push({ ...points[0] })
  return points
}

/** Globe grid: parallels every 30° plus rings at 80° and 85° near the poles. */
export const GRATICULE: { parallels: number[]; meridians: number[] } = {
  parallels: [-85, -80, -60, -30, 0, 30, 60, 80, 85],
  meridians: [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150, 180],
}
