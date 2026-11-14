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
  uncertainty?: SolarUncertainty | null
  eclipses?: Eclipse[] | null
}

export interface RangeQuery {
  lat_deg: number
  lon_deg: number
  start_utc: string
  end_utc: string
  step_minutes?: number
}

/** Parametry GET /api/windows (zadanie 011). */
export interface WindowsQuery {
  lat_deg: number
  lon_deg: number
  search_start_utc: string
  search_end_utc: string
  duration_hours?: number
  min_sun_el_at_landing_deg?: number
  min_sunlight_hours?: number
  max_darkness_hours?: number
  require_earth_at_landing?: boolean
  min_earth_fraction?: number
  reference_start_utc?: string
  slip_days?: number
}

export interface SlotCycles {
  lunar_day_index: number
  seasonal_phase_deg: number
  draconic_year_phase_deg: number
  draconic_year_note?: string | null
  libration_phase_deg?: number | null
}

export interface SolarUncertainty {
  typical_sunlight_hours?: number | null
  worst_case_sunlight_hours?: number | null
  best_case_sunlight_hours?: number | null
  horizon_margin_deg?: number | null
  solar_radius_deg?: number | null
}

export type SlotUncertainty = SolarUncertainty

export interface Eclipse {
  start_utc: string
  end_utc: string
  max_obscuration_fraction: number
  duration_hours: number
}

export interface CalendarSlot {
  start_utc: string
  end_utc: string
  sunlight_hours: number
  sun_visible_fraction: number
  max_darkness_hours: number
  max_sun_el_deg: number
  sun_el_at_start_deg: number
  earth_hours: number
  earth_visible_fraction: number
  earth_visible_at_start: boolean
  max_earth_el_deg?: number | null
  passes_requirements: boolean
  score: number
  cycles: SlotCycles
  uncertainty?: SlotUncertainty | null
  eclipses?: Eclipse[] | null
}

export interface SlipAnalysis {
  original_slot: CalendarSlot
  delayed_slot: CalendarSlot
  delta_sunlight_hours: number
  delta_max_darkness_hours: number
  delta_earth_fraction: number
  nearest_equivalent_slot: CalendarSlot | null
  explanation: string
}

export interface CyclesSummary {
  synodic_month_days: number
  draconic_year_days: number
  nodal_precession_years: number
  libration_month_days: number
}

export interface WindowsResponse {
  grid: CalendarSlot[]
  matches: CalendarSlot[]
  slip_analysis: SlipAnalysis | null
  cycles_summary: CyclesSummary
  meta: Meta
}

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

