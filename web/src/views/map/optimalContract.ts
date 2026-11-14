// TYMCZASOWE lustro kontraktu z zadania 017 (`GET /api/optimal-site`).
// Zadanie 017 nie jest jeszcze scalone, więc typy trzymamy lokalnie w widoku mapy.
// Po scaleniu 017 usunąć ten plik i importować te typy z `../../api/types`
// (oraz podmienić `fetchOptimalSite` na `api.optimalSite` w `optimalSource.ts`).
//
// Kształt pól musi odpowiadać schematom Pydantic z `backend/app/api/schemas.py`
// i typom z `web/src/api/types.ts` - zmiana kontraktu wymaga osobnego PR.

import type { Meta } from '../../api/types'

export interface OptimalWeights {
  w_sun: number
  w_earth: number
  w_overlap: number
}

export interface CursorBodies {
  cursor_utc: string
  subsolar_lat_deg: number
  subsolar_lon_deg: number
  subearth_lat_deg: number
  subearth_lon_deg: number
}

export interface OptimalCandidate {
  id: string
  name: string
  lat_deg: number
  lon_deg: number
  elevation_m?: number | null
  is_catalog_site: boolean
  score: number
  sun_visible_fraction: number
  earth_visible_fraction: number
  overlap_fraction: number
  sunlight_hours: number
  earth_hours: number
  overlap_hours: number
  max_darkness_hours: number
  sun_visible_at_cursor: boolean
  earth_visible_at_cursor: boolean
}

export interface OptimalSiteResponse {
  optimal: OptimalCandidate
  ranking: OptimalCandidate[]
  cursor_bodies: CursorBodies
  weights: OptimalWeights
  meta: Meta
}

export interface OptimalSiteQuery {
  start_utc: string
  end_utc: string
  cursor_utc?: string
  step_minutes?: number
  w_sun?: number
  w_earth?: number
  w_overlap?: number
}
