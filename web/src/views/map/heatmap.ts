// Czysta logika warstwy ON/OFF na globusie (zadanie 019): strefy zasilania
// i łączności, paleta kolorów, bufor RGBA mapy cieplnej i presety wag.
//
// Brak importów three.js - ten moduł liczy tylko matematykę i da się testować
// w Node bez WebGL. Mapowanie bufora na sferę robi `MoonGlobe.tsx`.

import { endUtc, type Scenario } from '../../app/scenario'
import type {
  CursorBodies,
  OptimalCandidate,
  OptimalSiteQuery,
  OptimalWeights,
} from './optimalContract'

export type Zone = 'sun_only' | 'earth_only' | 'sweet_spot' | 'shadow'

/** Kolejność stref w legendzie panelu. */
export const ZONE_ORDER: Zone[] = ['sun_only', 'earth_only', 'sweet_spot', 'shadow']

/** Kolory RGBA nakładki zgodne ze zgłoszeniem #29. */
export const ZONE_COLORS: Record<Zone, readonly [number, number, number, number]> = {
  sun_only: [242, 193, 78, 235], // bursztyn/złoto - widoczne Słońce
  earth_only: [74, 144, 226, 235], // błękit - widoczna Ziemia
  sweet_spot: [60, 200, 130, 240], // szmaragd - Słońce + Ziemia
  shadow: [8, 10, 16, 210], // ciemna, półprzezroczysta noc
}

export const ZONE_LABELS: Record<Zone, string> = {
  sun_only: 'Sun power',
  earth_only: 'Earth link',
  sweet_spot: 'Sweet spot (Sun + Earth)',
  shadow: 'Shadow',
}

const DEG = Math.PI / 180
const HORIZON_DEG = 90
/** Kolor, w stronę którego rozjaśniamy piksele wokół kandydatów z rankingu. */
const CANDIDATE_GLOW: readonly [number, number, number] = [150, 255, 200]
const MAX_CANDIDATE_GLOW = 0.6

/** Różnica długości geograficznej w zakresie (−180°, 180°]. */
function wrapLonDelta(delta_deg: number): number {
  return ((delta_deg + 540) % 360) - 180
}

/** Indeks [0, 1) dla wartości ułamkowej. */
function wrap01(value: number): number {
  return ((value % 1) + 1) % 1
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

/**
 * Odległość kątowa dwóch punktów na kuli (haversine / great-circle).
 * Odporna na bieguny i przejście przez ±180° długości geograficznej.
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
 * Czy Słońce jest nad horyzontem w punkcie (lat, lon)?
 * Prosty model kulisty: punkt widzi ciało, gdy odległość kątowa od punktu
 * podsłonecznego jest mniejsza niż 90°. Bez rzeźby terenu i refrakcji.
 */
export function sunVisibleAt(lat_deg: number, lon_deg: number, subsolar: BodyPoint): boolean {
  return angularDistanceDeg(lat_deg, lon_deg, subsolar.lat_deg, subsolar.lon_deg) < HORIZON_DEG
}

/**
 * Czy Ziemia jest nad horyzontem w punkcie (lat, lon)?
 * Ten sam model kulisty co dla Słońca: odległość od punktu podziemskiego < 90°.
 * Bez rzeźby terenu - na Księżycu horyzont jest niższy, więc to uproszczenie.
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

/** Strefa w punkcie dla ciał niebieskich wskazanych przez kursor czasu. */
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
 * Najbliższy piksel equirectangular dla punktu (lat, lon).
 *
 * Układ zgodny z `SphereGeometry` i teksturą LROC w `MoonGlobe.tsx`:
 * wiersz 0 = +90° (biegun północny), wiersz height−1 = −90°,
 * kolumna 0 wypada na długości 180° (zawijanej do −180°).
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

/** Współrzędne środka piksela (x, y) w buforze equirectangular. */
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

function blendPixel(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  color: readonly [number, number, number],
  amount: number,
): void {
  if (y < 0 || y >= height || amount <= 0) return
  const wrappedX = ((x % width) + width) % width
  const index = (y * width + wrappedX) * 4
  const t = clamp01(amount)
  pixels[index] = pixels[index] + (color[0] - pixels[index]) * t
  pixels[index + 1] = pixels[index + 1] + (color[1] - pixels[index + 1]) * t
  pixels[index + 2] = pixels[index + 2] + (color[2] - pixels[index + 2]) * t
  // Alfa zostaje z podkładu strefy - rozjaśniamy tylko kolor.
}

/**
 * Rozjaśnia piksele wokół kandydatów z rankingu (gauss, waga = score).
 * Dzięki temu czapa polarna pokazuje jakość kandydatów, a nie tylko strefy.
 */
function addCandidateGlow(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  ranking: OptimalCandidate[],
): void {
  if (ranking.length === 0) return
  const radiusPx = Math.max(2, Math.round(Math.min(width, height) / 64))
  const sigma = radiusPx / 2

  for (const candidate of ranking) {
    const score = Number.isFinite(candidate.score) ? clamp01(candidate.score / 100) : 0
    if (score <= 0) continue
    const center = pixelForLatLon(width, height, candidate.lat_deg, candidate.lon_deg)
    const reach = Math.ceil(radiusPx * 2)
    for (let dy = -reach; dy <= reach; dy += 1) {
      const y = center.y + dy
      if (y < 0 || y >= height) continue
      for (let dx = -reach; dx <= reach; dx += 1) {
        const distance = Math.hypot(dx, dy)
        if (distance > reach) continue
        const gaussian = Math.exp(-0.5 * (distance / sigma) ** 2)
        blendPixel(pixels, width, height, center.x + dx, y, CANDIDATE_GLOW, gaussian * score * MAX_CANDIDATE_GLOW)
      }
    }
  }
}

/**
 * Buduje bufor RGBA (Uint8ClampedArray) mapy cieplnej w układzie
 * equirectangular zgodnym z teksturą LROC na sferze w `MoonGlobe.tsx`.
 * Wiersz 0 = +90°, wiersz height−1 = −90°.
 */
export function buildOverlayPixels(
  width: number,
  height: number,
  cursorBodies: CursorBodies,
  ranking: OptimalCandidate[] = [],
): Uint8ClampedArray {
  const w = Math.max(1, Math.floor(width))
  const h = Math.max(1, Math.floor(height))
  const pixels = new Uint8ClampedArray(w * h * 4)

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const { lat_deg, lon_deg } = latLonForPixel(w, h, x, y)
      const zone = zoneAt(lat_deg, lon_deg, cursorBodies)
      const color = ZONE_COLORS[zone]
      const index = (y * w + x) * 4
      pixels[index] = color[0]
      pixels[index + 1] = color[1]
      pixels[index + 2] = color[2]
      pixels[index + 3] = color[3]
    }
  }

  addCandidateGlow(pixels, w, h, ranking)
  return pixels
}

function sanitizeWeight(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0
}

/**
 * Sprowadza wagi do sumy 1. Wartości ujemne/NaN traktujemy jak 0,
 * a gdy wszystkie są zerowe - dzielimy po równo (1/3, 1/3, 1/3).
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

/** Presety profilu misji (zadanie 019) - wartości jako ułamki. */
export const WEIGHT_PRESETS: WeightPreset[] = [
  {
    id: 'balanced',
    label: 'Balanced (45/25/30)',
    weights: { w_sun: 0.45, w_earth: 0.25, w_overlap: 0.3 },
  },
  {
    id: 'solar',
    label: 'Solar Power Priority (70/10/20)',
    weights: { w_sun: 0.7, w_earth: 0.1, w_overlap: 0.2 },
  },
  {
    id: 'earth',
    label: 'Earth Comms Priority (15/55/30)',
    weights: { w_sun: 0.15, w_earth: 0.55, w_overlap: 0.3 },
  },
  {
    id: 'sweet-spot',
    label: 'Sweet-Spot Priority (20/20/60)',
    weights: { w_sun: 0.2, w_earth: 0.2, w_overlap: 0.6 },
  },
]

/**
 * Zapytanie do `/api/optimal-site` dla aktywnego scenariusza:
 * okno = początek + długość, kursor czasu i wagi przekazane przez panel.
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
