// Jedyne miejsce, w którym widok mapy sięga po dane optymalnego punktu.
//
// Zadanie 017 (kontrakt `GET /api/optimal-site` + `api.optimalSite`) nie jest
// jeszcze scalone, więc `fetchOptimalSite` na razie odrzuca obietnicę. Po
// scaleniu 017 wystarczy podmienić ciało tej funkcji na `api.optimalSite(q)`
// i przenieść typy z `optimalContract.ts` do `../../api/types`.
//
// Tryb `VITE_USE_FIXTURES=1` (`npm run dev:fixtures`) podstawia poniższą
// próbkę, żeby warstwę ON/OFF dało się obejrzeć bez backendu.

import type {
  OptimalCandidate,
  OptimalSiteQuery,
  OptimalSiteResponse,
} from './optimalContract'

const USE_FIXTURES = import.meta.env.VITE_USE_FIXTURES === '1'

/**
 * Syntetyczna, przykładowa odpowiedź - NIE pochodzi z backendu.
 * Wartości są realistyczne dla okolic bieguna południowego (grzbiet
 * Shackletona) i służą tylko testom oraz podglądowi w trybie fixtures.
 */
const sampleOptimal: OptimalCandidate = {
  id: 'shackleton-ridge',
  name: 'Shackleton ridge',
  lat_deg: -89.45,
  lon_deg: -137.0,
  elevation_m: 1280,
  is_catalog_site: false,
  score: 91.2,
  sun_visible_fraction: 0.78,
  earth_visible_fraction: 0.64,
  overlap_fraction: 0.55,
  sunlight_hours: 18.7,
  earth_hours: 15.4,
  overlap_hours: 13.2,
  max_darkness_hours: 2.1,
  sun_visible_at_cursor: true,
  earth_visible_at_cursor: true,
}

const sampleRanking: OptimalCandidate[] = [
  sampleOptimal,
  {
    id: 'connecting-ridge',
    name: 'Connecting Ridge',
    lat_deg: -89.3,
    lon_deg: -30.0,
    elevation_m: 1140,
    is_catalog_site: false,
    score: 88.4,
    sun_visible_fraction: 0.72,
    earth_visible_fraction: 0.58,
    overlap_fraction: 0.48,
    sunlight_hours: 17.3,
    earth_hours: 13.9,
    overlap_hours: 11.5,
    max_darkness_hours: 2.8,
    sun_visible_at_cursor: true,
    earth_visible_at_cursor: true,
  },
  {
    id: 'malapert-massif',
    name: 'Malapert Massif',
    lat_deg: -86.0,
    lon_deg: -2.0,
    elevation_m: 4200,
    is_catalog_site: false,
    score: 85.1,
    sun_visible_fraction: 0.81,
    earth_visible_fraction: 0.46,
    overlap_fraction: 0.42,
    sunlight_hours: 19.4,
    earth_hours: 11.0,
    overlap_hours: 10.1,
    max_darkness_hours: 2.3,
    sun_visible_at_cursor: true,
    earth_visible_at_cursor: false,
  },
  {
    id: 'leibnitz-beta',
    name: 'Leibnitz Beta',
    lat_deg: -85.5,
    lon_deg: -30.0,
    elevation_m: 2300,
    is_catalog_site: false,
    score: 82.6,
    sun_visible_fraction: 0.69,
    earth_visible_fraction: 0.51,
    overlap_fraction: 0.4,
    sunlight_hours: 16.6,
    earth_hours: 12.2,
    overlap_hours: 9.6,
    max_darkness_hours: 3.4,
    sun_visible_at_cursor: true,
    earth_visible_at_cursor: true,
  },
  {
    id: 'de-gerlache-rim',
    name: 'de Gerlache rim',
    lat_deg: -88.5,
    lon_deg: -87.0,
    elevation_m: 1750,
    is_catalog_site: false,
    score: 80.9,
    sun_visible_fraction: 0.66,
    earth_visible_fraction: 0.49,
    overlap_fraction: 0.36,
    sunlight_hours: 15.8,
    earth_hours: 11.8,
    overlap_hours: 8.6,
    max_darkness_hours: 4.1,
    sun_visible_at_cursor: true,
    earth_visible_at_cursor: false,
  },
  {
    id: 'amundsen-rim',
    name: 'Amundsen rim',
    lat_deg: -84.5,
    lon_deg: 35.0,
    elevation_m: 980,
    is_catalog_site: false,
    score: 78.3,
    sun_visible_fraction: 0.62,
    earth_visible_fraction: 0.53,
    overlap_fraction: 0.34,
    sunlight_hours: 14.9,
    earth_hours: 12.7,
    overlap_hours: 8.2,
    max_darkness_hours: 4.6,
    sun_visible_at_cursor: false,
    earth_visible_at_cursor: true,
  },
]

export const SAMPLE_OPTIMAL_SITE: OptimalSiteResponse = {
  optimal: sampleOptimal,
  ranking: sampleRanking,
  cursor_bodies: {
    cursor_utc: '2027-02-01T06:00:00Z',
    subsolar_lat_deg: -1.5,
    subsolar_lon_deg: -12.4,
    // Lekko południowa libracja sprawia, że z okolic bieguna południowego
    // widać też Ziemię - próbka pokazuje wtedy strefę sweet spot.
    subearth_lat_deg: -1.5,
    subearth_lon_deg: -3.1,
  },
  weights: { w_sun: 0.45, w_earth: 0.25, w_overlap: 0.3 },
  meta: { ephemeris: 'placeholder', horizon: 'synthetic' },
}

/**
 * Pobiera optymalny punkt dla okna scenariusza.
 *
 * Po scaleniu zadania 017 zamień to na:
 *   `return api.optimalSite(query)`
 * i usuń `SAMPLE_OPTIMAL_SITE` razem z `optimalContract.ts`.
 */
export async function fetchOptimalSite(_query: OptimalSiteQuery): Promise<OptimalSiteResponse> {
  if (USE_FIXTURES) return SAMPLE_OPTIMAL_SITE
  throw new Error('Optimal site API (task 017) is not available yet')
}
