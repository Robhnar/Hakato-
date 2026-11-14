// Kształt odpowiedzi API. Lustrzane odbicie backend/app/api/schemas.py -
// to jest kontrakt, zmiana wymaga osobnego PR (patrz AGENTS.md).

export type SiteCategory = 'apollo' | 'clps' | 'commercial' | 'international' | 'candidate'
export type HorizonSource = 'flat' | 'lola' | 'synthetic'
export type EphemerisSource = 'placeholder' | 'spice'

export interface Site {
  id: string
  name: string
  lat_deg: number
  lon_deg: number
  category: SiteCategory
  landing_utc: string | null
}

export interface Horizon {
  azimuth_step_deg: number
  elevation_deg: number[]
  source: HorizonSource
}

export interface Meta {
  ephemeris: EphemerisSource
  horizon: HorizonSource
}

export interface BodySeries {
  az_deg: number[]
  el_deg: number[]
  visible: boolean[]
}

export interface Timeline {
  times_utc: string[]
  sun: BodySeries
  earth: BodySeries
  meta: Meta
}

export interface VisibilityWindow {
  start_utc: string
  end_utc: string
}

export interface BodySummary {
  visible_fraction: number
  max_el_deg: number
  windows: VisibilityWindow[]
  visible_at_start: boolean
  hours_until_change: number | null
}

export interface Summary {
  sun: BodySummary
  earth: BodySummary
  meta: Meta
}

export interface RangeQuery {
  lat_deg: number
  lon_deg: number
  start_utc: string
  end_utc: string
  step_minutes?: number
}
