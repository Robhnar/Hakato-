// Scenario = site + time window. This is the unit the user compares.
// A type shared by the shell and all views - changing it needs agreement.

import type { RangeQuery, Site } from '../api/types'

export interface Scenario {
  id: string
  name: string
  lat_deg: number
  lon_deg: number
  start_utc: string
  duration_hours: number
}

/** Every view gets the same inputs and the same actions. */
export interface ViewProps {
  scenarios: Scenario[]
  active: Scenario
  /** The moment pointed to by the time cursor - shared by all views. */
  cursor_utc: string
  setCursorUtc: (utc: string) => void
  selectScenario: (id: string) => void
  /** Sets custom coordinates in the active scenario (e.g. a click on the map). */
  pickLocation: (lat_deg: number, lon_deg: number) => void
  /** The Windows view sets the start (and optionally the duration) of the active scenario. */
  applyWindow: (start_utc: string, duration_hours?: number) => void
}

/** One lunar day (synodic month) in hours. */
export const LUNAR_DAY_HOURS = 708.7

/** Scenario limit in the shell (task 005). */
export const MAX_SCENARIOS = 4

export const DURATION_PRESETS: { label: string; hours: number }[] = [
  { label: '24 hours', hours: 24 },
  { label: '1 lunar day', hours: LUNAR_DAY_HOURS },
  { label: '3 lunar days', hours: LUNAR_DAY_HOURS * 3 },
]

export type CoordError = 'lat' | 'lon' | 'both' | null

/** Validation of selenographic ME coordinates (−90…90, −180…180). */
export function validateCoords(lat_deg: number, lon_deg: number): CoordError {
  const latBad = !Number.isFinite(lat_deg) || lat_deg < -90 || lat_deg > 90
  const lonBad = !Number.isFinite(lon_deg) || lon_deg < -180 || lon_deg > 180
  if (latBad && lonBad) return 'both'
  if (latBad) return 'lat'
  if (lonBad) return 'lon'
  return null
}

export function coordErrorMessage(error: CoordError): string | null {
  if (error === 'lat') return 'Latitude must be between −90 and 90 degrees.'
  if (error === 'lon') return 'Longitude must be between −180 and 180 degrees.'
  if (error === 'both') return 'Latitude must be −90…90 and longitude −180…180.'
  return null
}

export function toIsoZ(date: Date): string {
  return `${date.toISOString().slice(0, 19)}Z`
}

export function endUtc(scenario: Scenario): string {
  const start = new Date(scenario.start_utc).getTime()
  return toIsoZ(new Date(start + scenario.duration_hours * 3_600_000))
}

export function toRangeQuery(scenario: Scenario, step_minutes?: number): RangeQuery {
  return {
    lat_deg: scenario.lat_deg,
    lon_deg: scenario.lon_deg,
    start_utc: scenario.start_utc,
    end_utc: endUtc(scenario),
    step_minutes,
  }
}

let nextId = 1

export function scenarioFromSite(
  site: Pick<Site, 'name' | 'lat_deg' | 'lon_deg'>,
  start_utc: string,
  duration_hours: number = LUNAR_DAY_HOURS,
): Scenario {
  return {
    id: `s${nextId++}`,
    name: site.name,
    lat_deg: site.lat_deg,
    lon_deg: site.lon_deg,
    start_utc,
    duration_hours,
  }
}

/** A copy of the scenario with a new id (duplicating in the shell). */
export function duplicateScenario(scenario: Scenario): Scenario {
  return { ...scenario, id: `s${nextId++}` }
}
