// Shared formatting of time, coordinates and numbers for the shell and the Expert views.
// Pure functions: input is a number or a UTC string, output is text ready to display.

import { LUNAR_DAY_HOURS } from './scenario'

const EM_DASH = '—'
const DAY_HOURS = 24
// Tolerance for matching multiples of the lunar day (in hours).
const LUNAR_TOLERANCE_HOURS = 0.05
// Tolerance for matching whole Earth days (floating-point error).
const DAY_TOLERANCE_HOURS = 1e-6

const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const TIME_FORMAT = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

// A date from ISO or null if the string is not a valid date.
function parseUtc(iso: string): Date | null {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatUtcDate(iso: string): string {
  const date = parseUtc(iso)
  return date ? DATE_FORMAT.format(date) : EM_DASH
}

/** Time in strings: `19 May 2027 19:13 UTC`; an invalid date gives a dash. */
export function formatUtc(iso: string): string {
  const date = parseUtc(iso)
  if (!date) return EM_DASH
  return `${DATE_FORMAT.format(date)} ${TIME_FORMAT.format(date)} UTC`
}

/** Wraps longitude into the range (−180, 180]; −180 and 180 give 180. */
export function wrapLon(lon_deg: number): number {
  const wrapped = ((lon_deg % 360) + 360) % 360
  return wrapped > 180 ? wrapped - 360 : wrapped
}

/** Latitude with hemisphere: `89.45°S`. */
export function formatLat(lat_deg: number, digits = 2): string {
  if (!Number.isFinite(lat_deg)) return EM_DASH
  const hemisphere = lat_deg < 0 ? 'S' : 'N'
  return `${Math.abs(lat_deg).toFixed(digits)}°${hemisphere}`
}

/** Longitude with hemisphere, always in the range −180…180: `137.30°W`. */
export function formatLon(lon_deg: number, digits = 2): string {
  if (!Number.isFinite(lon_deg)) return EM_DASH
  const wrapped = wrapLon(lon_deg)
  const hemisphere = wrapped < 0 ? 'W' : 'E'
  return `${Math.abs(wrapped).toFixed(digits)}°${hemisphere}`
}

/** Coordinate pair: `89.45°S 137.30°W`. */
export function formatCoords(lat_deg: number, lon_deg: number, digits = 2): string {
  return `${formatLat(lat_deg, digits)} ${formatLon(lon_deg, digits)}`
}

/** Hours with a unit: `336.0 h`; NaN gives a dash. */
export function formatHours(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return EM_DASH
  return `${value.toFixed(digits)} h`
}

/** Share as a percentage: `87%`; NaN gives a dash. */
export function formatPercent(fraction: number): string {
  if (!Number.isFinite(fraction)) return EM_DASH
  return `${Math.round(fraction * 100)}%`
}

/** Angle in degrees: `1.57°`. */
export function formatDeg(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return EM_DASH
  return `${value.toFixed(digits)}°`
}

/**
 * Window length in human language: whole days (`14 days`), a multiple of the
 * lunar day (`1 lunar day`, `3 lunar days`), otherwise hours (`336 h`).
 */
export function formatDuration(hours: number): string {
  if (!Number.isFinite(hours)) return EM_DASH

  const lunar = Math.round(hours / LUNAR_DAY_HOURS)
  if (lunar > 0 && Math.abs(hours - lunar * LUNAR_DAY_HOURS) <= LUNAR_TOLERANCE_HOURS) {
    return lunar === 1 ? '1 lunar day' : `${lunar} lunar days`
  }

  const days = Math.round(hours / DAY_HOURS)
  if (days > 0 && Math.abs(hours - days * DAY_HOURS) <= DAY_TOLERANCE_HOURS) {
    return days === 1 ? '1 day' : `${days} days`
  }

  return `${Math.round(hours)} h`
}
