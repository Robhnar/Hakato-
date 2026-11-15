// Pure logic of the ON/OFF layer on the globe (task 019): power zones
// and communication, color palette, the RGBA heatmap buffer and weight presets.
//
// No three.js imports - this module only does math and can be tested
// in Node without WebGL. Mapping the buffer onto the sphere is done by `MoonGlobe.tsx`.

import { endUtc, type Scenario } from '../../app/scenario'
import type {
  CursorBodies,
  OptimalSiteQuery,
  OptimalWeights,
} from '../../api/types'

export type Zone = 'sun_only' | 'earth_only' | 'sweet_spot' | 'shadow'

/** Order of zones in the panel legend. */
export const ZONE_ORDER: Zone[] = ['sun_only', 'earth_only', 'sweet_spot', 'shadow']

/** Overlay RGBA colors: a subtle tint so the terrain underneath stays visible. */
export const ZONE_COLORS: Record<Zone, readonly [number, number, number, number]> = {
  sun_only: [233, 180, 76, 56],
  earth_only: [90, 162, 224, 56],
  sweet_spot: [125, 187, 120, 48],
  shadow: [0, 0, 0, 120],
}

export const ZONE_LABELS: Record<Zone, string> = {
  sun_only: 'Sun only',
  earth_only: 'Earth only',
  sweet_spot: 'Sun + Earth',
  shadow: 'Neither',
}

const DEG = Math.PI / 180
const HORIZON_DEG = 90
/** Half the width of the zone boundary smoothing band (degrees). */
const EDGE_DEG = 0.6

/** Longitude difference in the range (−180°, 180°]. */
function wrapLonDelta(delta_deg: number): number {
  return ((delta_deg + 540) % 360) - 180
}

/** Index [0, 1) for a fractional value. */
function wrap01(value: number): number {
  return ((value % 1) + 1) % 1
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

/**
 * Angular distance of two points on a sphere (haversine / great-circle).
 * Robust at the poles and when crossing ±180° longitude.
 */
export function angularDistanceDeg(
  lat1_deg: number,
  lon1_deg: number,
  lat2_deg: number,
  lon2_deg: number,
): number {
  const phi1 = lat1_deg * DEG
  const phi2 = lat2_deg * DEG
  const dPhi = (lat2_deg - lat1_deg) * DEG
  const dLambda = wrapLonDelta(lon2_deg - lon1_deg) * DEG

  const sinPhi = Math.sin(dPhi / 2)
  const sinLambda = Math.sin(dLambda / 2)
  const a = sinPhi * sinPhi + Math.cos(phi1) * Math.cos(phi2) * sinLambda * sinLambda
  return (2 * Math.asin(Math.sqrt(clamp01(a)))) / DEG
}

export interface BodyPoint {
  lat_deg: number
  lon_deg: number
}

/**
 * Is the Sun above the horizon at the point (lat, lon)?
 * Simple spherical model: a point sees a body when its angular distance from the
 * subsolar point is less than 90°. No terrain relief and no refraction.
 */
export function sunVisibleAt(lat_deg: number, lon_deg: number, subsolar: BodyPoint): boolean {
  return angularDistanceDeg(lat_deg, lon_deg, subsolar.lat_deg, subsolar.lon_deg) < HORIZON_DEG
}

/**
 * Is Earth above the horizon at the point (lat, lon)?
 * The same spherical model as for the Sun: distance from the sub-Earth point < 90°.
 * No terrain relief - on the Moon the horizon is lower, so this is a simplification.
 */
export function earthVisibleAt(lat_deg: number, lon_deg: number, subearth: BodyPoint): boolean {
  return angularDistanceDeg(lat_deg, lon_deg, subearth.lat_deg, subearth.lon_deg) < HORIZON_DEG
}

export function classifyZone(sunVisible: boolean, earthVisible: boolean): Zone {
  if (sunVisible && earthVisible) return 'sweet_spot'
  if (sunVisible) return 'sun_only'
  if (earthVisible) return 'earth_only'
  return 'shadow'
}

/** The zone at a point for the celestial bodies pointed to by the time cursor. */
export function zoneAt(lat_deg: number, lon_deg: number, cursorBodies: CursorBodies): Zone {
  const sun = sunVisibleAt(lat_deg, lon_deg, {
    lat_deg: cursorBodies.subsolar_lat_deg,
    lon_deg: cursorBodies.subsolar_lon_deg,
  })
  const earth = earthVisibleAt(lat_deg, lon_deg, {
    lat_deg: cursorBodies.subearth_lat_deg,
    lon_deg: cursorBodies.subearth_lon_deg,
  })
  return classifyZone(sun, earth)
}

/**
 * The nearest equirectangular pixel for the point (lat, lon).
 *
 * Layout consistent with `SphereGeometry` and the LROC texture in `MoonGlobe.tsx`:
 * row 0 = +90° (north pole), row height−1 = −90°,
 * column 0 falls at longitude 180° (wrapped to −180°).
 */
export function pixelForLatLon(
  width: number,
  height: number,
  lat_deg: number,
  lon_deg: number,
): { x: number; y: number } {
  const u = wrap01(lon_deg / 360 - 0.5)
  const x = Math.min(width - 1, Math.max(0, Math.round(u * width - 0.5)))
  const y = Math.min(
    height - 1,
    Math.max(0, Math.round(((90 - lat_deg) / 180) * height - 0.5)),
  )
  return { x, y }
}

/** Coordinates of the pixel center (x, y) in the equirectangular buffer. */
function latLonForPixel(
  width: number,
  height: number,
  x: number,
  y: number,
): { lat_deg: number; lon_deg: number } {
  const u = (x + 0.5) / width
  const lon = ((u + 0.5) * 360) % 360
  return {
    lat_deg: 90 - 180 * ((y + 0.5) / height),
    lon_deg: lon > 180 ? lon - 360 : lon,
  }
}

/**
 * Builds the RGBA buffer (Uint8ClampedArray) of the heatmap in the
 * equirectangular layout consistent with the LROC texture on the sphere in `MoonGlobe.tsx`.
 * Row 0 = +90°, row height−1 = −90°.
 */
export function buildOverlayPixels(
  width: number,
  height: number,
  cursorBodies: CursorBodies,
): Uint8ClampedArray {
  const w = Math.max(1, Math.floor(width))
  const h = Math.max(1, Math.floor(height))
  const pixels = new Uint8ClampedArray(w * h * 4)
  // Share (0..1) of "body visible": linear within a ±EDGE_DEG band around 90°.
  const inside = (d: number) => clamp01((HORIZON_DEG + EDGE_DEG - d) / (2 * EDGE_DEG))

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const { lat_deg, lon_deg } = latLonForPixel(w, h, x, y)
      const s = inside(angularDistanceDeg(lat_deg, lon_deg, cursorBodies.subsolar_lat_deg, cursorBodies.subsolar_lon_deg))
      const e = inside(angularDistanceDeg(lat_deg, lon_deg, cursorBodies.subearth_lat_deg, cursorBodies.subearth_lon_deg))
      const weights: Record<Zone, number> = {
        sweet_spot: s * e,
        sun_only: s * (1 - e),
        earth_only: (1 - s) * e,
        shadow: (1 - s) * (1 - e),
      }
      const index = (y * w + x) * 4
      for (const zone of ZONE_ORDER) {
        const color = ZONE_COLORS[zone]
        for (let c = 0; c < 4; c += 1) pixels[index + c] += color[c] * weights[zone]
      }
    }
  }
  return pixels
}

function sanitizeWeight(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0
}

/**
 * Normalizes the weights to a sum of 1. Negative/NaN values are treated as 0,
 * and when all are zero - we split equally (1/3, 1/3, 1/3).
 */
export function normalizeWeights(weights: OptimalWeights): OptimalWeights {
  const sun = sanitizeWeight(weights.w_sun)
  const earth = sanitizeWeight(weights.w_earth)
  const overlap = sanitizeWeight(weights.w_overlap)
  const total = sun + earth + overlap
  if (total <= 0) return { w_sun: 1 / 3, w_earth: 1 / 3, w_overlap: 1 / 3 }
  return { w_sun: sun / total, w_earth: earth / total, w_overlap: overlap / total }
}

export interface WeightPreset {
  id: string
  label: string
  weights: OptimalWeights
}

/** Mission profile presets (task 019) - values as fractions. */
export const WEIGHT_PRESETS: WeightPreset[] = [
  {
    id: 'balanced',
    label: 'Balanced',
    weights: { w_sun: 0.45, w_earth: 0.25, w_overlap: 0.3 },
  },
  {
    id: 'solar',
    label: 'Power first',
    weights: { w_sun: 0.7, w_earth: 0.1, w_overlap: 0.2 },
  },
  {
    id: 'earth',
    label: 'Comms first',
    weights: { w_sun: 0.15, w_earth: 0.55, w_overlap: 0.3 },
  },
  {
    id: 'sweet-spot',
    label: 'Both at once',
    weights: { w_sun: 0.2, w_earth: 0.2, w_overlap: 0.6 },
  },
]

/**
 * Query to `/api/optimal-site` for the active scenario:
 * window = start + duration, the time cursor and the weights passed by the panel.
 */
export function overlayQuery(
  active: Scenario,
  cursor_utc: string,
  weights: OptimalWeights,
): OptimalSiteQuery {
  return {
    start_utc: active.start_utc,
    end_utc: endUtc(active),
    cursor_utc,
    w_sun: weights.w_sun,
    w_earth: weights.w_earth,
    w_overlap: weights.w_overlap,
  }
}
