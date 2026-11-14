// TYMCZASOWE lustro kontraktu z zadania 011. Zawiera wyłącznie typy potrzebne
// widokowi "windows"; po scaleniu 011 usunąć ten plik i zaimportować te same
// typy z ../../api/types (WindowsQuery, CalendarSlot, SlipAnalysis, ...).

import type { Meta } from '../../api/types'

/** Parametry zapytania GET /api/windows (lustro schematu Pydantic z 011). */
export interface WindowsQuery {
  lat_deg: number
  lon_deg: number
  search_start_utc: string
  search_end_utc: string
  duration_hours: number
  min_sun_el_at_landing_deg: number
  min_sunlight_hours: number
  max_darkness_hours: number
  require_earth_at_landing: boolean
  min_earth_fraction: number
  reference_start_utc: string | null
  slip_days: number
}

/** Cykle użyte do policzenia danego okna (mapa cieplna i opis sezonu). */
export interface CalendarSlotCycles {
  lunar_day_index: number
  seasonal_phase_deg: number
  draconic_year_Note: string
}

/** Jeden dzień/okno w siatce kalendarza i w rankingu dopasowań. */
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
  passes_requirements: boolean
  score: number
  cycles: CalendarSlotCycles
}

/** Wynik trybu "start opóźnił się o N dni". */
export interface SlipAnalysis {
  original_slot: CalendarSlot
  delayed_slot: CalendarSlot
  delta_sunlight_hours: number
  delta_max_darkness_hours: number
  delta_earth_fraction: number
  nearest_equivalent_slot: CalendarSlot | null
  explanation: string
}

/** Okresy głównych cykli księżycowych użyte w obliczeniach. */
export interface CyclesSummary {
  synodic_month_days: number
  draconic_year_days: number
  nodal_precession_years: number
  libration_month_days: number
}

/** Pełna odpowiedź GET /api/windows. */
export interface WindowsResponse {
  grid: CalendarSlot[]
  matches: CalendarSlot[]
  slip_analysis: SlipAnalysis | null
  cycles_summary: CyclesSummary
  meta: Meta
}
