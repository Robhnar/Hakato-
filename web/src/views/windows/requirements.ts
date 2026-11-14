// Czysta logika wymagań misji dla widoku "windows" (zadanie 015).
// Bez Reacta i bez efektów ubocznych: panel, ranking i symulator opóźnienia
// używają tych samych progów, więc lista pasujących okien zmienia się natychmiast.

import { LUNAR_DAY_HOURS, toIsoZ } from '../../app/scenario'
import type { CalendarSlot, WindowsQuery } from './contract'

/** Presety czasu trwania są wspólne z powłoką (zadanie 005). */
export { DURATION_PRESETS } from '../../app/scenario'

/** Pola wymagań misji - dokładnie te, które trafiają do WindowsQuery. */
export interface MissionRequirements {
  duration_hours: number
  min_sun_el_at_landing_deg: number
  min_sunlight_hours: number
  max_darkness_hours: number
  require_earth_at_landing: boolean
  min_earth_fraction: number
}

/** Domyślne wartości z briefu 011 (te same co w backendowym schemacie). */
export const DEFAULT_REQUIREMENTS: MissionRequirements = {
  duration_hours: LUNAR_DAY_HOURS,
  min_sun_el_at_landing_deg: 0,
  min_sunlight_hours: 0,
  max_darkness_hours: LUNAR_DAY_HOURS,
  require_earth_at_landing: false,
  min_earth_fraction: 0,
}

/** Pojemności baterii pokazywane jako skróty w panelu wymagań (godziny). */
export const BATTERY_PRESETS: number[] = [48, 100, 350]

export interface MissionProfile {
  id: string
  label: string
  requirements: MissionRequirements
}

/** Typowe profile misji - jedno kliknięcie wypełnia cały formularz. */
export const MISSION_PROFILES: MissionProfile[] = [
  {
    id: 'short-surface-lander',
    label: 'Short surface lander (72 h)',
    requirements: {
      duration_hours: 72,
      min_sun_el_at_landing_deg: 1,
      min_sunlight_hours: 60,
      max_darkness_hours: 12,
      require_earth_at_landing: false,
      min_earth_fraction: 0,
    },
  },
  {
    id: 'polar-rover',
    label: 'Polar rover (1 lunar day, 72 h battery)',
    requirements: {
      duration_hours: LUNAR_DAY_HOURS,
      min_sun_el_at_landing_deg: 2,
      min_sunlight_hours: 600,
      max_darkness_hours: 72,
      require_earth_at_landing: false,
      min_earth_fraction: 0,
    },
  },
  {
    id: 'permanent-relay',
    label: 'Permanent relay station (3 lunar days)',
    requirements: {
      duration_hours: LUNAR_DAY_HOURS * 3,
      min_sun_el_at_landing_deg: 1,
      min_sunlight_hours: 1500,
      max_darkness_hours: LUNAR_DAY_HOURS,
      require_earth_at_landing: true,
      min_earth_fraction: 0.9,
    },
  },
]

export type RequirementField = keyof MissionRequirements
export type RequirementErrors = Partial<Record<RequirementField, string>>

/**
 * Walidacja progów przed wysłaniem zapytania. Zwraca mapę pole -> komunikat;
 * pusta mapa oznacza poprawne wymagania.
 */
export function validateRequirements(requirements: MissionRequirements): RequirementErrors {
  const errors: RequirementErrors = {}

  if (!Number.isFinite(requirements.duration_hours)) {
    errors.duration_hours = 'Enter a mission duration in hours.'
  } else if (requirements.duration_hours <= 0) {
    errors.duration_hours = 'Mission duration must be greater than 0 hours.'
  }

  if (!Number.isFinite(requirements.min_sun_el_at_landing_deg)) {
    errors.min_sun_el_at_landing_deg = 'Enter the minimum Sun elevation at landing.'
  } else if (requirements.min_sun_el_at_landing_deg < 0) {
    errors.min_sun_el_at_landing_deg = 'Minimum Sun elevation cannot be negative.'
  } else if (requirements.min_sun_el_at_landing_deg > 90) {
    errors.min_sun_el_at_landing_deg = 'Minimum Sun elevation cannot exceed 90°.'
  }

  if (!Number.isFinite(requirements.min_sunlight_hours)) {
    errors.min_sunlight_hours = 'Enter the minimum sunlight hours.'
  } else if (requirements.min_sunlight_hours < 0) {
    errors.min_sunlight_hours = 'Minimum sunlight hours cannot be negative.'
  } else if (
    Number.isFinite(requirements.duration_hours) &&
    requirements.duration_hours > 0 &&
    requirements.min_sunlight_hours > requirements.duration_hours
  ) {
    errors.min_sunlight_hours = 'Minimum sunlight hours cannot exceed the mission duration.'
  }

  if (!Number.isFinite(requirements.max_darkness_hours)) {
    errors.max_darkness_hours = 'Enter the maximum darkness hours.'
  } else if (requirements.max_darkness_hours < 0) {
    errors.max_darkness_hours = 'Maximum darkness hours cannot be negative.'
  }

  if (!Number.isFinite(requirements.min_earth_fraction)) {
    errors.min_earth_fraction = 'Enter the required Earth visibility.'
  } else if (requirements.min_earth_fraction < 0 || requirements.min_earth_fraction > 1) {
    errors.min_earth_fraction = 'Earth visibility must be between 0% and 100%.'
  }

  return errors
}

function degree(value: number): string {
  return `${value.toFixed(1)}°`
}

function hours(value: number): string {
  return `${value.toFixed(1)} h`
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`
}

/**
 * Powody, dla których okno nie spełnia wymagań. Równość progu liczy się jako
 * spełnienie (np. sunlight_hours == min_sunlight_hours przechodzi).
 */
export function violations(slot: CalendarSlot, requirements: MissionRequirements): string[] {
  const reasons: string[] = []

  if (!Number.isFinite(slot.sun_el_at_start_deg)) {
    reasons.push('Sun elevation data is missing for this window.')
  } else if (slot.sun_el_at_start_deg < requirements.min_sun_el_at_landing_deg) {
    reasons.push(
      `Sun at landing ${degree(slot.sun_el_at_start_deg)} is below the required ${degree(
        requirements.min_sun_el_at_landing_deg,
      )}.`,
    )
  }

  if (!Number.isFinite(slot.sunlight_hours)) {
    reasons.push('Sunlight data is missing for this window.')
  } else if (slot.sunlight_hours < requirements.min_sunlight_hours) {
    reasons.push(
      `Sunlight ${hours(slot.sunlight_hours)} is below the required ${hours(
        requirements.min_sunlight_hours,
      )}.`,
    )
  }

  if (!Number.isFinite(slot.max_darkness_hours)) {
    reasons.push('Darkness data is missing for this window.')
  } else if (slot.max_darkness_hours > requirements.max_darkness_hours) {
    reasons.push(
      `Longest darkness ${hours(slot.max_darkness_hours)} exceeds the battery limit of ${hours(
        requirements.max_darkness_hours,
      )}.`,
    )
  }

  if (requirements.require_earth_at_landing && !slot.earth_visible_at_start) {
    reasons.push('Earth is not visible at landing.')
  }

  if (!Number.isFinite(slot.earth_visible_fraction)) {
    reasons.push('Earth visibility data is missing for this window.')
  } else if (slot.earth_visible_fraction < requirements.min_earth_fraction) {
    reasons.push(
      `Earth visibility ${percent(slot.earth_visible_fraction)} is below the required ${percent(
        requirements.min_earth_fraction,
      )}.`,
    )
  }

  return reasons
}

export function passes(slot: CalendarSlot, requirements: MissionRequirements): boolean {
  return violations(slot, requirements).length === 0
}

function sortableScore(slot: CalendarSlot): number {
  return Number.isFinite(slot.score) ? slot.score : Number.NEGATIVE_INFINITY
}

/**
 * Filtrowanie po stronie klienta - dzięki temu lista reaguje na zmianę progów
 * bez czekania na odpowiedź backendu. Kolejność: score malejąco, remisy po
 * starcie rosnąco.
 */
export function filterMatches(grid: CalendarSlot[], requirements: MissionRequirements): CalendarSlot[] {
  const matching = grid.filter((slot) => passes(slot, requirements))
  matching.sort((a, b) => {
    const scoreA = sortableScore(a)
    const scoreB = sortableScore(b)
    if (scoreA !== scoreB) return scoreB > scoreA ? 1 : -1
    return a.start_utc.localeCompare(b.start_utc)
  })
  return matching
}

/** Opcjonalny tryb opóźnienia startu w zapytaniu. */
export interface SlipParams {
  reference_start_utc: string
  slip_days: number
}

/** Buduje pełne zapytanie GET /api/windows z aktualnych wymagań. */
export function toQuery(
  requirements: MissionRequirements,
  lat_deg: number,
  lon_deg: number,
  search_start_utc: string,
  search_end_utc: string,
  slip?: SlipParams,
): WindowsQuery {
  return {
    lat_deg,
    lon_deg,
    search_start_utc,
    search_end_utc,
    duration_hours: requirements.duration_hours,
    min_sun_el_at_landing_deg: requirements.min_sun_el_at_landing_deg,
    min_sunlight_hours: requirements.min_sunlight_hours,
    max_darkness_hours: requirements.max_darkness_hours,
    require_earth_at_landing: requirements.require_earth_at_landing,
    min_earth_fraction: requirements.min_earth_fraction,
    reference_start_utc: slip?.reference_start_utc ?? null,
    slip_days: slip?.slip_days ?? 0,
  }
}

export interface SlipComparison {
  delta_sunlight_hours: number
  delta_max_darkness_hours: number
  delta_earth_fraction: number
  original_ok: boolean
  delayed_ok: boolean
  delayed_violations: string[]
}

/**
 * Porównanie okna oryginalnego z opóźnionym. Deltę liczymy jako
 * "opóźniony minus oryginalny", więc dodatnia zmiana ciemności jest zła.
 * Używane, gdy backend nie zwróci slip_analysis, oraz do kontroli jego wyniku.
 */
export function slipComparison(
  original: CalendarSlot,
  delayed: CalendarSlot,
  requirements: MissionRequirements,
): SlipComparison {
  return {
    delta_sunlight_hours: delayed.sunlight_hours - original.sunlight_hours,
    delta_max_darkness_hours: delayed.max_darkness_hours - original.max_darkness_hours,
    delta_earth_fraction: delayed.earth_visible_fraction - original.earth_visible_fraction,
    original_ok: passes(original, requirements),
    delayed_ok: passes(delayed, requirements),
    delayed_violations: violations(delayed, requirements),
  }
}

/** Przesuwa znacznik czasu o pełne lub ułamkowe dni, zwracając ISO z "Z". */
export function shiftUtc(iso: string, days: number): string {
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms) || !Number.isFinite(days)) return ''
  return toIsoZ(new Date(ms + days * 86_400_000))
}

/**
 * Najwcześniejsze okno po `fromUtc`, które spełnia wymagania. `null`, gdy
 * w siatce nie ma już nic pasującego albo data wejściowa jest niepoprawna.
 */
export function nearestEquivalent(
  grid: CalendarSlot[],
  fromUtc: string,
  requirements: MissionRequirements,
): CalendarSlot | null {
  const from = Date.parse(fromUtc)
  if (!Number.isFinite(from)) return null

  let nearest: CalendarSlot | null = null
  let nearestMs = Number.POSITIVE_INFINITY
  for (const slot of grid) {
    const startMs = Date.parse(slot.start_utc)
    if (!Number.isFinite(startMs) || startMs < from) continue
    if (!passes(slot, requirements)) continue
    if (startMs < nearestMs) {
      nearest = slot
      nearestMs = startMs
    }
  }
  return nearest
}

export const SLIP_MIN_DAYS = 1
export const SLIP_MAX_DAYS = 90

/** Ogranicza opóźnienie startu do całkowitej liczby dni z zakresu 1…90. */
export function clampSlipDays(days: number): number {
  if (!Number.isFinite(days)) return SLIP_MIN_DAYS
  return Math.min(SLIP_MAX_DAYS, Math.max(SLIP_MIN_DAYS, Math.round(days)))
}
