// Wspólne formatowanie czasu, współrzędnych i liczb dla powłoki i widoków Expert.
// Czyste funkcje: wejście liczba lub string UTC, wyjście tekst gotowy do wyświetlenia.

import { LUNAR_DAY_HOURS } from './scenario'

const EM_DASH = '—'
const DAY_HOURS = 24
// Tolerancja dopasowania wielokrotności doby księżycowej (w godzinach).
const LUNAR_TOLERANCE_HOURS = 0.05
// Tolerancja dopasowania pełnych dób ziemskich (błąd zmiennoprzecinkowy).
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

// Data z ISO albo null, jeśli napis nie jest poprawną datą.
function parseUtc(iso: string): Date | null {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatUtcDate(iso: string): string {
  const date = parseUtc(iso)
  return date ? DATE_FORMAT.format(date) : EM_DASH
}

/** Czas w napisach: `19 May 2027 19:13 UTC`; niepoprawna data daje pauzę. */
export function formatUtc(iso: string): string {
  const date = parseUtc(iso)
  if (!date) return EM_DASH
  return `${DATE_FORMAT.format(date)} ${TIME_FORMAT.format(date)} UTC`
}

/** Zawija długość do zakresu (−180, 180]; −180 i 180 dają 180. */
export function wrapLon(lon_deg: number): number {
  const wrapped = ((lon_deg % 360) + 360) % 360
  return wrapped > 180 ? wrapped - 360 : wrapped
}

/** Szerokość geograficzna z półkulą: `89.45°S`. */
export function formatLat(lat_deg: number, digits = 2): string {
  if (!Number.isFinite(lat_deg)) return EM_DASH
  const hemisphere = lat_deg < 0 ? 'S' : 'N'
  return `${Math.abs(lat_deg).toFixed(digits)}°${hemisphere}`
}

/** Długość geograficzna z półkulą, zawsze w zakresie −180…180: `137.30°W`. */
export function formatLon(lon_deg: number, digits = 2): string {
  if (!Number.isFinite(lon_deg)) return EM_DASH
  const wrapped = wrapLon(lon_deg)
  const hemisphere = wrapped < 0 ? 'W' : 'E'
  return `${Math.abs(wrapped).toFixed(digits)}°${hemisphere}`
}

/** Para współrzędnych: `89.45°S 137.30°W`. */
export function formatCoords(lat_deg: number, lon_deg: number, digits = 2): string {
  return `${formatLat(lat_deg, digits)} ${formatLon(lon_deg, digits)}`
}

/** Godziny z jednostką: `336.0 h`; NaN daje pauzę. */
export function formatHours(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return EM_DASH
  return `${value.toFixed(digits)} h`
}

/** Udział jako procent: `87%`; NaN daje pauzę. */
export function formatPercent(fraction: number): string {
  if (!Number.isFinite(fraction)) return EM_DASH
  return `${Math.round(fraction * 100)}%`
}

/** Kąt w stopniach: `1.57°`. */
export function formatDeg(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return EM_DASH
  return `${value.toFixed(digits)}°`
}

/**
 * Długość okna ludzkim językiem: pełne doby (`14 days`), wielokrotność doby
 * księżycowej (`1 lunar day`, `3 lunar days`), inaczej godziny (`336 h`).
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
