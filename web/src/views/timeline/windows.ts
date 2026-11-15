export interface Segment {
  start_utc: string
  end_utc: string
}

/** Continuous intervals in which the `visible` series is true. */
export function visibilitySegments(times_utc: string[], visible: boolean[]): Segment[] {
  const segments: Segment[] = []
  let start: string | null = null

  for (let i = 0; i < times_utc.length; i += 1) {
    const on = Boolean(visible[i])
    if (on && start === null) {
      start = times_utc[i]
    } else if (!on && start !== null) {
      segments.push({ start_utc: start, end_utc: times_utc[i] })
      start = null
    }
  }
  // Visibility up to the end of the window closes at the last sample.
  if (start !== null) {
    segments.push({ start_utc: start, end_utc: times_utc[times_utc.length - 1] })
  }
  return segments
}

/** Intersection of two lists of intervals (e.g. Sun and Earth visible at once). */
export function overlapSegments(a: Segment[], b: Segment[]): Segment[] {
  const out: Segment[] = []
  const at = (iso: string) => Date.parse(iso)

  for (const x of a) {
    for (const y of b) {
      // We keep the original timestamps instead of formatting them anew.
      const start = at(x.start_utc) > at(y.start_utc) ? x.start_utc : y.start_utc
      const end = at(x.end_utc) < at(y.end_utc) ? x.end_utc : y.end_utc
      if (at(end) > at(start)) out.push({ start_utc: start, end_utc: end })
    }
  }
  return out.sort((p, q) => at(p.start_utc) - at(q.start_utc))
}

/**
 * Hours from `cursor_utc` to the nearest visibility change (set or rise).
 * `null` when nothing changes in the window any more.
 */
export function hoursUntilChange(
  times_utc: string[],
  visible: boolean[],
  cursor_utc: string,
): number | null {
  if (times_utc.length === 0) return null

  const cursor = Date.parse(cursor_utc)
  let at = -1
  for (let i = 0; i < times_utc.length; i += 1) {
    if (Date.parse(times_utc[i]) <= cursor) at = i
  }
  // Cursor at or past the last sample: there is nothing more to look for.
  if (at === times_utc.length - 1) return null

  const current = at === -1 ? Boolean(visible[0]) : Boolean(visible[at])
  for (let i = at + 1; i < times_utc.length; i += 1) {
    if (Boolean(visible[i]) !== current) {
      return (Date.parse(times_utc[i]) - cursor) / 3_600_000
    }
  }
  return null
}

/** Sampling step in minutes chosen for the window length: 5…120, ~300–1100 samples. */
export function stepMinutesFor(duration_hours: number): number {
  // The step grows linearly: ~600 samples mid-range, 5 min is the lower bound.
  return Math.min(120, Math.max(5, Math.round(duration_hours / 10)))
}

// Cuts floating-point noise (e.g. 0.30000000000000004) and normalizes -0.
function clean(value: number): number {
  return Math.abs(value) < 1e-9 ? 0 : Number(value.toFixed(10))
}

/**
 * Round axis ticks: step 1, 2 or 5 × 10ⁿ. Zero always falls on a tick when it lies
 * in the range (so the horizon line has its own tick).
 */
export function niceTicks(min: number, max: number, target = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return []
  const low = Math.min(min, max)
  const high = Math.max(min, max)
  if (!(high > low)) return [clean(low)]

  const rough = (high - low) / Math.max(1, target)
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const residual = rough / magnitude
  const factor = residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 5 ? 5 : 10
  const step = factor * magnitude

  const ticks: number[] = []
  const first = Math.ceil(low / step) * step
  // The iteration limit protects against a loop if the step comes out invalid.
  for (let i = 0; i < 200; i += 1) {
    const value = first + i * step
    if (value > high + step * 1e-9) break
    ticks.push(clean(value))
  }
  if (low < 0 && high > 0 && !ticks.includes(0)) {
    ticks.push(0)
    ticks.sort((a, b) => a - b)
  }
  return ticks
}

const DAY_MS = 86_400_000

/**
 * Timeline ticks at UTC midnight, thinned to `max`. An empty list when the window
 * contains no midnight (shorter than a day and not hitting the boundary).
 */
export function dayTicks(startMs: number, endMs: number, max = 7): number[] {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return []

  const ticks: number[] = []
  const firstMidnight = Math.ceil(startMs / DAY_MS) * DAY_MS
  for (let value = firstMidnight; value <= endMs && ticks.length < 4000; value += DAY_MS) {
    ticks.push(value)
  }
  if (ticks.length <= max) return ticks

  const stride = Math.ceil(ticks.length / max)
  return ticks.filter((_, index) => index % stride === 0)
}

export interface AdvanceResult {
  position: number
  done: boolean
}

/**
 * One animation step: moves the cursor by `deltaMs` at speed `speed_h_per_s`,
 * without going past the end of the window. `done` says the animation should stop.
 */
export function advance(
  position_ms: number,
  delta_ms: number,
  speed_h_per_s: number,
  end_ms: number,
): AdvanceResult {
  const next = Math.min(end_ms, position_ms + Math.max(0, delta_ms) * 0.001 * speed_h_per_s * 3_600_000)
  return { position: next, done: next >= end_ms }
}
