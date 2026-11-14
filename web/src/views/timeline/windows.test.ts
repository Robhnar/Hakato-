import { expect, test } from 'vitest'
import {
  advance,
  dayTicks,
  hoursUntilChange,
  niceTicks,
  overlapSegments,
  stepMinutesFor,
  visibilitySegments,
} from './windows'

// Date.UTC obcina ułamkowe godziny, więc liczymy w milisekundach.
const t = (hours: number) => new Date(Date.UTC(2027, 0, 1) + hours * 3_600_000).toISOString()

test('a segment starts at the first true and closes at the first false', () => {
  // Nierówny krok czasu: znaczniki bierzemy z serii, nie z siatki.
  const times = [t(0), t(0.5), t(1.75), t(3), t(6)]
  expect(visibilitySegments(times, [false, true, true, false, false])).toEqual([
    { start_utc: t(0.5), end_utc: t(3) },
  ])
  expect(visibilitySegments(times, [true, true, false, true, true])).toEqual([
    { start_utc: t(0), end_utc: t(1.75) },
    { start_utc: t(3), end_utc: t(6) },
  ])
})

test('visibility that runs to the end of the window closes on the last sample', () => {
  const times = [t(0), t(2), t(4)]
  expect(visibilitySegments(times, [false, true, true])).toEqual([
    { start_utc: t(2), end_utc: t(4) },
  ])
})

test('a single true sample at the end is a zero-length segment', () => {
  const times = [t(0), t(1), t(2)]
  expect(visibilitySegments(times, [false, false, true])).toEqual([
    { start_utc: t(2), end_utc: t(2) },
  ])
})

test('a series with no visibility and an empty series give no segments', () => {
  expect(visibilitySegments([t(0), t(1), t(2)], [false, false, false])).toEqual([])
  expect(visibilitySegments([], [])).toEqual([])
})

test('overlap keeps only the shared part, touching ends excluded', () => {
  const sun = [
    { start_utc: t(0), end_utc: t(4) },
    { start_utc: t(8), end_utc: t(12) },
  ]
  const earth = [
    // Styka się z pierwszym przedziałem Słońca tylko końcem (4 h) - nie liczy się.
    { start_utc: t(4), end_utc: t(14) },
    // Zagnieżdżony w drugim przedziale Słońca.
    { start_utc: t(9), end_utc: t(10) },
  ]
  expect(overlapSegments(sun, earth)).toEqual([
    { start_utc: t(8), end_utc: t(12) },
    { start_utc: t(9), end_utc: t(10) },
  ])
  expect(overlapSegments(sun, [{ start_utc: t(4), end_utc: t(8) }])).toEqual([])
  expect(overlapSegments([], sun)).toEqual([])
})

test('hoursUntilChange measures the wait to the next flip', () => {
  const times = [t(0), t(1), t(2), t(3), t(4), t(5)]
  const visible = [true, true, false, false, true, true]
  // W kursorze (01:30) widoczność z próbki 01:00, zmiana o 02:00.
  expect(hoursUntilChange(times, visible, t(1.5))).toBeCloseTo(0.5, 9)
  // Kursor dokładnie na próbce nie szuka zmiany w tej samej próbce.
  expect(hoursUntilChange(times, visible, t(2))).toBeCloseTo(2, 9)
  expect(hoursUntilChange(times, visible, t(0))).toBeCloseTo(2, 9)
})

test('a cursor before the first sample borrows the first sample', () => {
  const times = [t(1), t(2), t(3)]
  const visible = [true, true, false]
  // Start serii 01:00, kursor 00:00 - zmiana dopiero o 03:00.
  expect(hoursUntilChange(times, visible, t(0))).toBeCloseTo(3, 9)
})

test('a cursor on or after the last sample has nothing left to find', () => {
  const times = [t(0), t(1), t(2)]
  const visible = [false, true, true]
  expect(hoursUntilChange(times, visible, t(2))).toBeNull()
  expect(hoursUntilChange(times, visible, t(9))).toBeNull()
  expect(hoursUntilChange([], [], t(1))).toBeNull()
})

test('a series that never flips after the cursor gives null', () => {
  const times = [t(0), t(1), t(2)]
  expect(hoursUntilChange(times, [false, false, false], t(0.5))).toBeNull()
})

test('stepMinutesFor stays within 5…120 minutes and never rises with a shorter window', () => {
  expect(stepMinutesFor(0)).toBe(5)
  expect(stepMinutesFor(-3)).toBe(5)
  expect(stepMinutesFor(24)).toBe(5)
  expect(stepMinutesFor(708.7)).toBeGreaterThanOrEqual(60)
  expect(stepMinutesFor(708.7)).toBeLessThanOrEqual(120)
  expect(stepMinutesFor(2126)).toBe(120)

  let previous = 0
  for (let duration = 0.25; duration <= 1600; duration += 0.25) {
    const step = stepMinutesFor(duration)
    expect(Number.isInteger(step)).toBe(true)
    expect(step).toBeGreaterThanOrEqual(5)
    expect(step).toBeLessThanOrEqual(120)
    expect(step).toBeGreaterThanOrEqual(previous)
    // Ponad 1600 h krok 120 min nie zmieściłby się już w 800 próbkach.
    expect((duration * 60) / step).toBeLessThanOrEqual(800)
    previous = step
  }
})

test('advance moves the cursor at the chosen speed and stops at the end of the window', () => {
  const end = 24 * 3_600_000
  // 6 h/s przez 1 s to 6 h, czyli 1/4 okna 24-godzinnego.
  const quarter = advance(0, 1000, 6, end)
  expect(quarter.position).toBeCloseTo(6 * 3_600_000, 0)
  expect(quarter.done).toBe(false)

  // Blisko końca krok jest przycinany do `end` i kończy animację.
  const last = advance(end - 60_000, 1000, 240, end)
  expect(last.position).toBe(end)
  expect(last.done).toBe(true)

  // Ujemna delta (cofnięty zegar) nie przesuwa kursora do tyłu.
  expect(advance(5_000, -1000, 60, end).position).toBe(5_000)
})

test('okrągłe podziałki z zerem', () => {
  expect(niceTicks(-1.2, 6.3)).toEqual([0, 2, 4, 6])
  expect(niceTicks(0, 0)).toEqual([0])
})

test('podziałki dni o północy UTC', () => {
  const ticks = dayTicks(Date.parse('2027-05-19T19:13:00Z'), Date.parse('2027-05-22T19:13:00Z'))
  expect(ticks.map((tick) => new Date(tick).toISOString())).toEqual([
    '2027-05-20T00:00:00.000Z',
    '2027-05-21T00:00:00.000Z',
    '2027-05-22T00:00:00.000Z',
  ])
})

test('podziałki dni rozrzedzają się do limitu', () => {
  const ticks = dayTicks(Date.parse('2027-05-01T00:00:00Z'), Date.parse('2027-06-01T00:00:00Z'))
  expect(ticks.length).toBeLessThanOrEqual(7)
  expect(ticks.length).toBeGreaterThan(1)
  for (const tick of ticks) expect(new Date(tick).getUTCHours()).toBe(0)
})

// Review Focus 4: okno bez wschodów i zachodów nie może dać pustego wykresu.
test('okno ze 100% widocznością to jeden pełny pas i brak zmian', () => {
  const times = [t(0), t(6), t(12), t(18), t(24)]
  expect(visibilitySegments(times, [true, true, true, true, true])).toEqual([
    { start_utc: t(0), end_utc: t(24) },
  ])
  expect(hoursUntilChange(times, [true, true, true, true, true], t(0))).toBeNull()
})

test('okno z zerową widocznością nie daje pasa, ale też nie ma zmian', () => {
  const times = [t(0), t(6), t(12), t(18), t(24)]
  expect(visibilitySegments(times, [false, false, false, false, false])).toEqual([])
  expect(hoursUntilChange(times, [false, false, false, false, false], t(0))).toBeNull()
})
