// Wspólna skala koloru wyniku (zadanie 021): jedna barwa od ciemnej do jasnej,
// jaśniej = lepiej. Korzystają z niej mapa cieplna w Windows i warstwa
// kandydatów w nakładce mapy, więc zmiana stopni zmienia oba widoki naraz.

/** Stopnie skali od najgorszego (ciemny) do najlepszego (jasny). */
export const SCORE_STOPS: readonly string[] = [
  '#1b2a2e',
  '#1f4a4f',
  '#2a7170',
  '#4c9a8b',
  '#8cc3a4',
  '#d6ecc6',
]

type Rgb = readonly [number, number, number]

function hexToRgb(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1), 16)
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff]
}

const STOPS: readonly Rgb[] = SCORE_STOPS.map(hexToRgb)

/**
 * Kolor dla pozycji `t` (0 = najgorzej, 1 = najlepiej). Wartości spoza zakresu
 * i NaN przycinamy do 0, więc skala nigdy nie zwraca `NaN`.
 */
export function scoreColor(t: number): string {
  const x = Number.isFinite(t) ? Math.min(1, Math.max(0, t)) : 0
  const scaled = x * (STOPS.length - 1)
  // Ostatni stopień nie ma następnika - interpolacja kończy się na nim.
  const i = Math.min(STOPS.length - 2, Math.floor(scaled))
  const u = scaled - i
  const a = STOPS[i]
  const b = STOPS[i + 1]
  const r = Math.round(a[0] + (b[0] - a[0]) * u)
  const g = Math.round(a[1] + (b[1] - a[1]) * u)
  const bl = Math.round(a[2] + (b[2] - a[2]) * u)
  return `rgb(${r}, ${g}, ${bl})`
}

/** Pasek legendy: gradient przez wszystkie stopnie skali. */
export function scoreRampCss(): string {
  return `linear-gradient(to right, ${SCORE_STOPS.join(', ')})`
}
