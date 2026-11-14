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

// Odcina szum zmiennoprzecinkowy (np. 0.30000000000000004) i normalizuje -0.
function clean(value: number): number {
  return Math.abs(value) < 1e-9 ? 0 : Number(value.toFixed(10))
}

/**
 * Okrągłe podziałki osi: krok 1, 2 albo 5 × 10ⁿ. Zero wypada zawsze, gdy leży
 * w zakresie (dzięki temu linia horyzontu ma własną podziałkę).
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
  // Limit iteracji chroni przed pętlą, gdyby krok wyszedł niepoprawny.
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
 * Znaczniki osi czasu o północy UTC, rozrzedzone do `max`. Pusta lista, gdy okno
 * nie zawiera żadnej północy (krótsze niż doba i bez trafienia w granicę).
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
