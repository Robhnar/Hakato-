export interface Segment {
  start_utc: string
  end_utc: string
}

/** Ciągłe przedziały, w których seria `visible` jest true. */
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
  // Widoczność do końca okna domyka się na ostatniej próbce.
  if (start !== null) {
    segments.push({ start_utc: start, end_utc: times_utc[times_utc.length - 1] })
  }
  return segments
}

/** Część wspólna dwóch list przedziałów (np. Słońce i Ziemia widoczne naraz). */
export function overlapSegments(a: Segment[], b: Segment[]): Segment[] {
  const out: Segment[] = []
  const at = (iso: string) => Date.parse(iso)

  for (const x of a) {
    for (const y of b) {
      // Zachowujemy oryginalne znaczniki czasu, zamiast formatować je od nowa.
      const start = at(x.start_utc) > at(y.start_utc) ? x.start_utc : y.start_utc
      const end = at(x.end_utc) < at(y.end_utc) ? x.end_utc : y.end_utc
      if (at(end) > at(start)) out.push({ start_utc: start, end_utc: end })
    }
  }
  return out.sort((p, q) => at(p.start_utc) - at(q.start_utc))
}

/**
 * Godziny od `cursor_utc` do najbliższej zmiany widoczności (zachód albo wschód).
 * `null`, gdy w oknie nic się już nie zmienia.
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
  // Kursor na ostatniej próbce albo po niej: dalej nie ma już czego szukać.
  if (at === times_utc.length - 1) return null

  const current = at === -1 ? Boolean(visible[0]) : Boolean(visible[at])
  for (let i = at + 1; i < times_utc.length; i += 1) {
    if (Boolean(visible[i]) !== current) {
      return (Date.parse(times_utc[i]) - cursor) / 3_600_000
    }
  }
  return null
}

/** Krok próbkowania w minutach dobrany do długości okna: 5…120, ~300–1100 próbek. */
export function stepMinutesFor(duration_hours: number): number {
  // Krok rośnie liniowo: ~600 próbek w środku zakresu, 5 min to dolna granica.
  return Math.min(120, Math.max(5, Math.round(duration_hours / 10)))
}

export interface AdvanceResult {
  position: number
  done: boolean
}

/**
 * Jeden krok animacji: przesuwa kursor o `deltaMs` przy prędkości `speed_h_per_s`,
 * nie wychodząc za koniec okna. `done` mówi, że animacja ma się zatrzymać.
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
