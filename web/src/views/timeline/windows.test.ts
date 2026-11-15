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

// Date.UTC truncates fractional hours, so we compute in milliseconds.
const t = (hours: number) => new Date(Date.UTC(2027, 0, 1) + hours * 3_600_000).toISOString()

test('a segment starts at the first true and closes at the first false', () => {
  // Uneven time step: we take timestamps from the series, not from the grid.
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
    // It touches the first Sun interval only at the end (4 h) - it does not count.
    { start_utc: t(4), end_utc: t(14) },
    // Nested in the second Sun interval.
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
  // At the cursor (01:30) visibility from the 01:00 sample, the change at 02:00.
  expect(hoursUntilChange(times, visible, t(1.5))).toBeCloseTo(0.5, 9)
  // A cursor exactly on a sample does not look for a change in the same sample.
  expect(hoursUntilChange(times, visible, t(2))).toBeCloseTo(2, 9)
  expect(hoursUntilChange(times, visible, t(0))).toBeCloseTo(2, 9)
})

test('a cursor before the first sample borrows the first sample', () => {
  const times = [t(1), t(2), t(3)]
  const visible = [true, true, false]
  // Series start 01:00, cursor 00:00 - the change only at 03:00.
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
    // Above 1600 h a 120 min step would no longer fit in 800 samples.
    expect((duration * 60) / step).toBeLessThanOrEqual(800)
    previous = step
  }
})

test('advance moves the cursor at the chosen speed and stops at the end of the window', () => {
  const end = 24 * 3_600_000
  // 6 h/s for 1 s is 6 h, i.e. 1/4 of a 24-hour window.
  const quarter = advance(0, 1000, 6, end)
  expect(quarter.position).toBeCloseTo(6 * 3_600_000, 0)
  expect(quarter.done).toBe(false)

  // Near the end the step is clamped to `end` and finishes the animation.
  const last = advance(end - 60_000, 1000, 240, end)
  expect(last.position).toBe(end)
  expect(last.done).toBe(true)

  // A negative delta (clock set back) does not move the cursor backwards.
  expect(advance(5_000, -1000, 60, end).position).toBe(5_000)
})

test('round ticks including zero', () => {
  expect(niceTicks(-1.2, 6.3)).toEqual([0, 2, 4, 6])
  expect(niceTicks(0, 0)).toEqual([0])
})

test('day ticks at UTC midnight', () => {
  const ticks = dayTicks(Date.parse('2027-05-19T19:13:00Z'), Date.parse('2027-05-22T19:13:00Z'))
  expect(ticks.map((tick) => new Date(tick).toISOString())).toEqual([
    '2027-05-20T00:00:00.000Z',
    '2027-05-21T00:00:00.000Z',
    '2027-05-22T00:00:00.000Z',
  ])
})

test('day ticks thin out to the limit', () => {
  const ticks = dayTicks(Date.parse('2027-05-01T00:00:00Z'), Date.parse('2027-06-01T00:00:00Z'))
  expect(ticks.length).toBeLessThanOrEqual(7)
  expect(ticks.length).toBeGreaterThan(1)
  for (const tick of ticks) expect(new Date(tick).getUTCHours()).toBe(0)
})

// Review Focus 4: a window without sunrises and sunsets must not give an empty chart.
test('a window with 100% visibility is one full band and no changes', () => {
  const times = [t(0), t(6), t(12), t(18), t(24)]
  expect(visibilitySegments(times, [true, true, true, true, true])).toEqual([
    { start_utc: t(0), end_utc: t(24) },
  ])
  expect(hoursUntilChange(times, [true, true, true, true, true], t(0))).toBeNull()
})

test('a window with zero visibility gives no band, but also no changes', () => {
  const times = [t(0), t(6), t(12), t(18), t(24)]
  expect(visibilitySegments(times, [false, false, false, false, false])).toEqual([])
  expect(hoursUntilChange(times, [false, false, false, false, false], t(0))).toBeNull()
})
