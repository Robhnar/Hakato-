import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../../api/client'
import { useAsync } from '../../api/useAsync'
import { formatHours, formatPercent, formatUtc } from '../../app/format'
import { type ViewProps, endUtc, toIsoZ, toRangeQuery } from '../../app/scenario'
import {
  advance,
  dayTicks,
  hoursUntilChange,
  niceTicks,
  overlapSegments,
  stepMinutesFor,
  visibilitySegments,
} from './windows'
import './timeline.css'

// Pasy widoczności i wykres wysokości muszą się zgadzać co do piksela, więc cały
// rysunek jest w jednym SVG o stałym viewBox (skaluje się razem z szerokością).
const VIEW_W = 1000
const PAD_L = 62
// Prawy margines mieści procent pasa i podpisy „Sun" / „Earth" na końcu linii.
const PAD_R = 56
const BAND_H = 10
const BAND_STEP = BAND_H + 8
const BAND_TOP = 14
const CHART_TOP = BAND_TOP + 3 * BAND_STEP + 12
const CHART_H = 140
const AXIS_TOP = CHART_TOP + CHART_H + 22
const VIEW_H = AXIS_TOP + 14
const PLOT_W = VIEW_W - PAD_L - PAD_R

/** Minimalny zakres osi wysokości: przy horyzoncie wartości różnią się o ułamki stopnia. */
const MIN_EL_SPAN_DEG = 2
const SPEEDS = [1, 12, 60, 240]
const TICKS = 6

function xFor(ms: number, startMs: number, endMs: number): number {
  const span = endMs - startMs || 1
  return PAD_L + Math.min(1, Math.max(0, (ms - startMs) / span)) * PLOT_W
}

function yForElevation(value: number, scale: { min: number; max: number }): number {
  const span = scale.max - scale.min || 1
  return CHART_TOP + CHART_H - ((value - scale.min) / span) * CHART_H
}

function clampTime(ms: number, startMs: number, endMs: number): number {
  return Math.min(endMs, Math.max(startMs, ms))
}

/** Podziałka krótkiego okna: dzień i godzina, np. `19 May 19:00`. */
function formatHourTick(ms: number): string {
  const date = new Date(ms)
  const day = date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  return `${day} ${String(date.getUTCHours()).padStart(2, '0')}:00`
}

/** Podziałka wielodniowego okna: sama data, np. `20 May`. */
function formatDayTick(ms: number): string {
  return new Date(ms).toLocaleDateString('en-GB', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

/** Opis najbliższej zmiany: „Sun sets in 12.0 h", „Earth no change". */
function describeChange(label: string, visible: boolean, hours: number | null): string {
  if (hours === null) return `${label} no change`
  return `${label} ${visible ? 'sets' : 'rises'} in ${formatHours(hours)}`
}

function lastVisibleAt(times: string[], visible: boolean[], ms: number): boolean {
  let value = visible[0] ?? false
  for (let index = 0; index < times.length; index += 1) {
    if (Date.parse(times[index]) > ms) break
    value = visible[index]
  }
  return value
}

/** Udział próbek, w których wszystkie podane serie są widoczne (procent 0…100). */
function share(times: string[], ...series: boolean[][]): number {
  if (times.length === 0) return 0
  const visible = times.filter((_, index) => series.every((flags) => flags[index])).length
  return (visible / times.length) * 100
}

/** Ostatnia poprawna wartość serii przeliczona na y wykresu. */
function lastY(series: number[], scale: { min: number; max: number }): number {
  for (let index = series.length - 1; index >= 0; index -= 1) {
    if (Number.isFinite(series[index])) return yForElevation(series[index], scale)
  }
  return CHART_TOP + CHART_H / 2
}

export default function TimelineView({ active, cursor_utc, setCursorUtc }: ViewProps) {
  const step = stepMinutesFor(active.duration_hours)
  const query = useMemo(() => toRangeQuery(active, step), [active, step])
  const timeline = useAsync(() => api.timeline(query), JSON.stringify(query))
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(SPEEDS[1])
  const plotRef = useRef<SVGSVGElement>(null)
  const draggingRef = useRef(false)

  const startMs = Date.parse(active.start_utc)
  const endMs = Date.parse(endUtc(active))
  const cursorMs = clampTime(Date.parse(cursor_utc), startMs, endMs)

  const data = timeline.data
  const geometry = useMemo(() => {
    if (!data) return null
    const times = data.times_utc
    const sunWindows = visibilitySegments(times, data.sun.visible)
    const earthWindows = visibilitySegments(times, data.earth.visible)
    const values = [...data.sun.el_deg, ...data.earth.el_deg, 0].filter((value) => Number.isFinite(value))
    const rawMin = Math.min(...values)
    const rawMax = Math.max(...values)
    // Przy horyzoncie cała skala to ułamek stopnia; rozciągamy ją do MIN_EL_SPAN_DEG.
    const pad = Math.max(MIN_EL_SPAN_DEG - (rawMax - rawMin), 0) / 2
    const scale = { min: rawMin - pad, max: rawMax + pad }
    // Brakującą lub niepoprawną próbkę pomijamy, żeby jeden NaN nie skasował całej linii.
    const path = (series: number[]) => {
      const points: string[] = []
      times.forEach((time, index) => {
        const value = series[index]
        if (!Number.isFinite(value)) return
        const x = xFor(Date.parse(time), startMs, endMs)
        const y = yForElevation(value, scale)
        points.push(`${points.length === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`)
      })
      return points.join(' ')
    }

    return {
      times,
      sunWindows,
      earthWindows,
      bothWindows: overlapSegments(sunWindows, earthWindows),
      scale,
      sunPath: path(data.sun.el_deg),
      earthPath: path(data.earth.el_deg),
      sunEndY: lastY(data.sun.el_deg, scale),
      earthEndY: lastY(data.earth.el_deg, scale),
      shares: {
        sun: share(times, data.sun.visible),
        earth: share(times, data.earth.visible),
        both: share(times, data.sun.visible, data.earth.visible),
      },
    }
  }, [data, startMs, endMs])

  // Animacja: kursor idzie od bieżącej pozycji do końca okna. Pętla nie zależy od
  // `cursor_utc` (każda aktualizacja restartowałaby ją i gubiła czas renderu), więc
  // pozycję startową bierzemy z ref aktualizowanego PRZED tym efektem.
  const cursorRef = useRef(cursorMs)
  useEffect(() => {
    cursorRef.current = cursorMs
  }, [cursorMs])

  useEffect(() => {
    if (!playing) return
    let frame = 0
    let previous = performance.now()
    let emittedAt = previous
    let position = cursorRef.current

    const tick = (now: number) => {
      // Ukryta karta wstrzymuje rAF; bez przycięcia delty powrót przeskoczyłby na koniec okna.
      const step = advance(position, Math.min(now - previous, 250), speed, endMs)
      position = step.position
      previous = now
      // Powłoka przerenderowuje się przy każdym ustawieniu kursora — 8 razy na sekundę wystarczy.
      if (now - emittedAt > 120 || step.done) {
        emittedAt = now
        setCursorUtc(toIsoZ(new Date(position)))
      }
      if (step.done) {
        setPlaying(false)
        return
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing, speed, endMs, setCursorUtc])

  if (timeline.error) return <p className="error">{timeline.error}</p>
  if (!geometry) return <p>Loading…</p>
  if (geometry.times.length === 0) return <p>No visibility samples in this window.</p>

  const { times, sunWindows, earthWindows, bothWindows, scale, sunPath, earthPath, shares } = geometry
  // Kursor może wypaść z okna po zmianie okresu lub godziny startu — liczymy wszystko z przyciętej wartości.
  const cursorIso = toIsoZ(new Date(cursorMs))
  const sunNow = lastVisibleAt(times, data!.sun.visible, cursorMs)
  const earthNow = lastVisibleAt(times, data!.earth.visible, cursorMs)
  const sunChange = hoursUntilChange(times, data!.sun.visible, cursorIso)
  const earthChange = hoursUntilChange(times, data!.earth.visible, cursorIso)
  const cursorX = xFor(cursorMs, startMs, endMs)

  const yZero = yForElevation(0, scale)
  const belowHeight = Math.max(0, CHART_TOP + CHART_H - yZero)
  const elevationTicks = niceTicks(scale.min, scale.max)

  // Podpisy linii na prawym końcu; przy zbliżonych wysokościach rozsuwamy je o 12 px.
  const sunLabelY = Math.min(CHART_TOP + CHART_H, Math.max(CHART_TOP + 10, geometry.sunEndY))
  const earthLabelRaw = Math.abs(geometry.earthEndY - geometry.sunEndY) < 12
    ? geometry.earthEndY + 12
    : geometry.earthEndY
  const earthLabelY = Math.min(CHART_TOP + CHART_H, Math.max(CHART_TOP + 10, earthLabelRaw))

  // Okno do 48 h: dotychczasowe 6 równych podziałek z godziną. Dłuższe: północe UTC.
  const spanHours = (endMs - startMs) / 3_600_000
  const midnightTicks = dayTicks(startMs, endMs)
  const timeTicks: { ms: number; label: string }[] =
    spanHours > 48 && midnightTicks.length > 0
      ? midnightTicks.map((ms) => ({ ms, label: formatDayTick(ms) }))
      : tickTimes(startMs, endMs).map((ms) => ({ ms, label: formatHourTick(ms) }))

  function timeAtClientX(clientX: number): number {
    const rect = plotRef.current?.getBoundingClientRect()
    if (!rect) return cursorMs
    const local = ((clientX - rect.left) * VIEW_W) / rect.width
    const fraction = (local - PAD_L) / PLOT_W
    return clampTime(startMs + fraction * (endMs - startMs), startMs, endMs)
  }

  function moveCursor(ms: number) {
    setPlaying(false)
    setCursorUtc(toIsoZ(new Date(clampTime(ms, startMs, endMs))))
  }

  function onPointerDown(event: React.PointerEvent<SVGSVGElement>) {
    draggingRef.current = true
    moveCursor(timeAtClientX(event.clientX))
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Zdarzenia syntetyczne (testy) nie mają aktywnego wskaźnika - przeciąganie i tak działa.
    }
  }

  function onPointerMove(event: React.PointerEvent<SVGSVGElement>) {
    // Bez pointer capture `pointerup` poza wykresem nie dotrze - odzyskujemy stan po puszczeniu.
    if (event.buttons === 0) draggingRef.current = false
    else if (draggingRef.current) moveCursor(timeAtClientX(event.clientX))
  }

  function onPointerUp() {
    draggingRef.current = false
  }

  function onKeyDown(event: React.KeyboardEvent<SVGSVGElement>) {
    const hour = 3_600_000
    const jumps: Record<string, number | null> = {
      ArrowRight: event.shiftKey ? hour / 10 : hour,
      ArrowLeft: event.shiftKey ? -hour / 10 : -hour,
      PageUp: 24 * hour,
      PageDown: -24 * hour,
      Home: null,
      End: null,
    }
    if (!(event.key in jumps)) return
    event.preventDefault()
    if (event.key === 'Home') moveCursor(startMs)
    else if (event.key === 'End') moveCursor(endMs)
    else moveCursor(cursorMs + (jumps[event.key] ?? 0))
  }

  const summary = `${formatUtc(cursorIso)}. ${describeChange('Sun', sunNow, sunChange)}. ${describeChange(
    'Earth',
    earthNow,
    earthChange,
  )}`

  return (
    <div className="timeline" aria-busy={timeline.loading}>
      <div className="timeline-head">
        <h2>Timeline</h2>
        <span className="timeline-meta">
          {active.name} · <span className="num">{formatHours(active.duration_hours, 0)}</span> · every{' '}
          <span className="num">{step}</span> min (UTC)
        </span>
        <span className="timeline-legend">
          <span className="timeline-chip timeline-chip-sun" /> Sun
          <span className="timeline-chip timeline-chip-earth" /> Earth
          <span className="timeline-chip timeline-chip-both" /> Both
        </span>
      </div>

      <div className="timeline-toolbar">
        <button
          type="button"
          className={playing ? 'selected' : ''}
          onClick={() => {
            // Na końcu okna Play zaczyna od nowa.
            if (!playing && cursorMs >= endMs) setCursorUtc(toIsoZ(new Date(startMs)))
            setPlaying(!playing)
          }}
        >
          {playing ? 'Pause' : 'Play'}
        </button>
        <button type="button" onClick={() => moveCursor(startMs)}>
          Start
        </button>
        <label>
          Speed
          <select value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
            {SPEEDS.map((value) => (
              <option key={value} value={value}>
                {value} h/s
              </option>
            ))}
          </select>
        </label>
        {/* Stały odczyt zamiast dymka nachodzącego na pasy. */}
        <div className="timeline-readout">
          <span className="num timeline-readout-time">{formatUtc(cursorIso)}</span>
          <span className="timeline-readout-change">
            <span className="timeline-chip timeline-chip-sun" aria-hidden="true" />
            {describeChange('Sun', sunNow, sunChange)}
            <span className="timeline-sep" aria-hidden="true">
              ·
            </span>
            <span className="timeline-chip timeline-chip-earth" aria-hidden="true" />
            {describeChange('Earth', earthNow, earthChange)}
          </span>
        </div>
      </div>

      <div className="timeline-canvas">
        <svg
          ref={plotRef}
          className="timeline-plot"
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          role="slider"
          tabIndex={0}
          aria-label="Time cursor over the scenario window"
          aria-valuemin={0}
          aria-valuemax={Math.round(active.duration_hours)}
          aria-valuenow={Math.round((cursorMs - startMs) / 3_600_000)}
          aria-valuetext={summary}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
        >
          <BandRow
            windows={sunWindows}
            y={BAND_TOP}
            tone="sun"
            startMs={startMs}
            endMs={endMs}
          />
          <BandRow
            windows={earthWindows}
            y={BAND_TOP + BAND_STEP}
            tone="earth"
            startMs={startMs}
            endMs={endMs}
          />
          <BandRow
            windows={bothWindows}
            y={BAND_TOP + 2 * BAND_STEP}
            tone="both"
            startMs={startMs}
            endMs={endMs}
          />

          {[
            { label: 'Sun', y: BAND_TOP, percent: shares.sun },
            { label: 'Earth', y: BAND_TOP + BAND_STEP, percent: shares.earth },
            { label: 'Both', y: BAND_TOP + 2 * BAND_STEP, percent: shares.both },
          ].map((row) => (
            <g key={row.label} aria-hidden="true">
              <text
                className="timeline-row-label"
                x={PAD_L - 8}
                y={row.y + BAND_H - 1}
                textAnchor="end"
              >
                {row.label}
              </text>
              <text
                className="timeline-row-percent num"
                x={PAD_L + PLOT_W + 8}
                y={row.y + BAND_H - 1}
              >
                {formatPercent(row.percent / 100)}
              </text>
            </g>
          ))}

          {/* Wykres wysokości */}
          <rect className="timeline-chart-bg" x={PAD_L} y={CHART_TOP} width={PLOT_W} height={CHART_H} />
          {belowHeight > 0 && (
            <>
              <rect
                className="timeline-below"
                x={PAD_L}
                y={yZero}
                width={PLOT_W}
                height={belowHeight}
              />
              <text
                className="timeline-below-label"
                x={PAD_L + 8}
                y={CHART_TOP + CHART_H - 6}
              >
                below horizon
              </text>
            </>
          )}

          {elevationTicks.map((value) => {
            const y = yForElevation(value, scale)
            const isZero = Math.abs(value) < 1e-9
            return (
              <g key={value} aria-hidden="true">
                <line
                  className={isZero ? 'timeline-zero' : 'timeline-grid'}
                  x1={PAD_L}
                  y1={y}
                  x2={PAD_L + PLOT_W}
                  y2={y}
                />
                <text className="timeline-axis-label" x={PAD_L - 8} y={y + 4} textAnchor="end">
                  {Number.isInteger(value) ? `${value}°` : `${value.toFixed(1)}°`}
                </text>
              </g>
            )
          })}

          <path className="timeline-line timeline-line-sun" d={sunPath} />
          <path className="timeline-line timeline-line-earth" d={earthPath} />
          <text className="timeline-line-label timeline-line-label-sun" x={PAD_L + PLOT_W + 8} y={sunLabelY + 4}>
            Sun
          </text>
          <text className="timeline-line-label timeline-line-label-earth" x={PAD_L + PLOT_W + 8} y={earthLabelY + 4}>
            Earth
          </text>

          <g className="timeline-ticks">
            {timeTicks.map((tick, index) => {
              const x = xFor(tick.ms, startMs, endMs)
              const anchor = index === 0 ? 'start' : index === timeTicks.length - 1 ? 'end' : 'middle'
              return (
                // Okno o zerowej długości daje identyczne znaczniki czasu — indeks pilnuje unikalności.
                <g key={`${tick.ms}-${index}`} aria-hidden="true">
                  <line className="timeline-tick" x1={x} y1={CHART_TOP} x2={x} y2={CHART_TOP + CHART_H} />
                  <text className="timeline-axis-label" x={x} y={AXIS_TOP} textAnchor={anchor}>
                    {tick.label}
                  </text>
                </g>
              )
            })}
          </g>

          <line
            className="timeline-cursor"
            x1={cursorX}
            y1={BAND_TOP - 4}
            x2={cursorX}
            y2={CHART_TOP + CHART_H}
          />
          <circle className="timeline-cursor-handle" cx={cursorX} cy={BAND_TOP - 8} r={4} />
        </svg>
      </div>

      <p className="timeline-share">
        Sun visible {formatPercent(shares.sun / 100)} of the window · Earth visible{' '}
        {formatPercent(shares.earth / 100)} · both {formatPercent(shares.both / 100)}.
      </p>
    </div>
  )
}

/** Jeden wiersz pasów widoczności: tor w kolorze linii + wypełnione okna. */
function BandRow({
  windows,
  y,
  tone,
  startMs,
  endMs,
}: {
  windows: { start_utc: string; end_utc: string }[]
  y: number
  tone: 'sun' | 'earth' | 'both'
  startMs: number
  endMs: number
}) {
  return (
    <g>
      {/* Tor pasa: pełna szerokość okna w kolorze linii — pusty pas nadal widać. */}
      <rect className="timeline-track" x={PAD_L} y={y} width={PLOT_W} height={BAND_H} />
      {windows.map((window) => {
        const x1 = xFor(Date.parse(window.start_utc), startMs, endMs)
        const x2 = Math.max(x1 + 1, xFor(Date.parse(window.end_utc), startMs, endMs))
        const width = x2 - x1
        const title = `${formatUtc(window.start_utc)} → ${formatUtc(window.end_utc)}`
        // „Both" to podział pasa w poprzek (góra Słońce, dół Ziemia) — bez gradientu.
        return tone === 'both' ? (
          <g key={window.start_utc}>
            <rect className="timeline-band timeline-band-sun" x={x1} y={y} width={width} height={BAND_H / 2}>
              <title>{title}</title>
            </rect>
            <rect
              className="timeline-band timeline-band-earth"
              x={x1}
              y={y + BAND_H / 2}
              width={width}
              height={BAND_H / 2}
            />
          </g>
        ) : (
          <rect
            key={window.start_utc}
            className={`timeline-band timeline-band-${tone}`}
            x={x1}
            y={y}
            width={width}
            height={BAND_H}
          >
            <title>{title}</title>
          </rect>
        )
      })}
    </g>
  )
}

/** Równe podziałki krótkiego okna (godziny) — sześć, jak dotąd. */
function tickTimes(startMs: number, endMs: number): number[] {
  const span = endMs - startMs
  return Array.from({ length: TICKS }, (_, index) => startMs + (span * index) / (TICKS - 1))
}
