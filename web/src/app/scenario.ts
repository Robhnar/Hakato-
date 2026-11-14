// Scenariusz = miejsce + okno czasu. To jednostka, którą użytkownik porównuje.
// Wspólny typ dla powłoki i wszystkich widoków - zmiana wymaga uzgodnienia.

import type { RangeQuery, Site } from '../api/types'

export interface Scenario {
  id: string
  name: string
  lat_deg: number
  lon_deg: number
  start_utc: string
  duration_hours: number
}

/** Każdy widok dostaje te same dane wejściowe i te same akcje. */
export interface ViewProps {
  scenarios: Scenario[]
  active: Scenario
  /** Chwila wskazywana przez kursor czasu - wspólna dla wszystkich widoków. */
  cursor_utc: string
  setCursorUtc: (utc: string) => void
  selectScenario: (id: string) => void
  /** Ustawia własne współrzędne w aktywnym scenariuszu (np. kliknięcie na mapie). */
  pickLocation: (lat_deg: number, lon_deg: number) => void
}

/** Jeden dzień księżycowy (miesiąc synodyczny) w godzinach. */
export const LUNAR_DAY_HOURS = 708.7

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
