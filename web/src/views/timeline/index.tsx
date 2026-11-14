import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../../api/client'
import { useAsync } from '../../api/useAsync'
import { type ViewProps, endUtc, toIsoZ, toRangeQuery } from '../../app/scenario'
import { hoursUntilChange, overlapSegments, stepMinutesFor, visibilitySegments } from './windows'
import './timeline.css'

// Pasy widoczności i wykres wysokości muszą się zgadzać co do piksela, więc cały
// rysunek jest w jednym SVG o stałym viewBox (skaluje się razem z szerokością).
const VIEW_W = 1000
const PAD_L = 46
const PAD_R = 14
const BAND_H = 16
const BAND_STEP = BAND_H + 6
const BAND_TOP = 16
const CHART_TOP = BAND_TOP + 3 * BAND_STEP + 12
const CHART_H = 128
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

function formatTick(iso: string): string {
  const date = new Date(iso)
  const day = date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  return `${day} ${String(date.getUTCHours()).padStart(2, '0')}:00`
}

function formatCursor(iso: string): string {
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`
}

/** Odmiana liczby godzin: „sets in 20.0 h", „no change in this window". */
function describeChange(label: string, visible: boolean, hours: number | null): string {
  if (hours === null) return `${label}: no change in this window`
  return `${label} ${visible ? 'sets' : 'rises'} in ${hours.toFixed(1)} h`
}

function lastVisibleAt(times: string[], visible: boolean[], ms: number): boolean {
  let value = visible[0] ?? false
  for (let index = 0; index < times.length; index += 1) {
    if (Date.parse(times[index]) > ms) break
    value = visible[index]
  }
  return value
}

function share(times: string[], ...series: boolean[][]): number {
  if (times.length === 0) return 0
  const visible = times.filter((_, index) => series.every((flags) => flags[index])).length
  return (visible / times.length) * 100
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
    const values = [...data.sun.el_deg, ...data.earth.el_deg, 0]
    const rawMin = Math.min(...values)
    const rawMax = Math.max(...values)
    // Przy horyzoncie cała skala to ułamek stopnia; rozciągamy ją do MIN_EL_SPAN_DEG.
    const pad = Math.max(MIN_EL_SPAN_DEG - (rawMax - rawMin), 0) / 2
    const scale = { min: rawMin - pad, max: rawMax + pad }
    const path = (series: number[]) =>
      times
        .map((time, index) => {
          const x = xFor(Date.parse(time), startMs, endMs)
          const y = yForElevation(series[index], scale)
          return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
        })
        .join(' ')

    return {
      times,
      sunWindows,
      earthWindows,
      bothWindows: overlapSegments(sunWindows, earthWindows),
      scale,
      sunPath: path(data.sun.el_deg),
      earthPath: path(data.earth.el_deg),
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
      // speed to godziny na sekundę, a `position` jest w milisekundach: s → h → ms.
      position = Math.min(endMs, position + ((now - previous) / 1000) * speed * 3_600_000)
      previous = now
      // Powłoka przerenderowuje się przy każdym ustawieniu kursora — 8 razy na sekundę wystarczy.
      if (now - emittedAt > 120 || position >= endMs) {
        emittedAt = now
        setCursorUtc(toIsoZ(new Date(position)))
      }
      if (position >= endMs) {
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
  const sunNow = lastVisibleAt(times, data!.sun.visible, cursorMs)
  const earthNow = lastVisibleAt(times, data!.earth.visible, cursorMs)
  const sunChange = hoursUntilChange(times, data!.sun.visible, cursor_utc)
  const earthChange = hoursUntilChange(times, data!.earth.visible, cursor_utc)
  const cursorX = xFor(cursorMs, startMs, endMs)
  const cursorPercent = (cursorX / VIEW_W) * 100
  const badgeOnLeft = cursorPercent > 62

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
    if (draggingRef.current) moveCursor(timeAtClientX(event.clientX))
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

  const summary = `${formatCursor(cursor_utc)}. ${describeChange('Sun', sunNow, sunChange)}. ${describeChange(
    'Earth',
    earthNow,
    earthChange,
  )}`

  return (
    <div className="timeline">
      <div className="timeline-head">
        <h2>Timeline</h2>
        <span className="timeline-meta">
          {active.name} · {active.duration_hours.toFixed(0)} h · every {step} min (UTC)
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
        <span className="timeline-cursor-label">{formatCursor(cursor_utc)}</span>
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
          <defs>
            <linearGradient id="timeline-both-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="50%" className="timeline-both-stop-sun" />
              <stop offset="50%" className="timeline-both-stop-earth" />
            </linearGradient>
          </defs>

          <rect
            className="timeline-track"
            x={PAD_L}
            y={BAND_TOP}
            width={PLOT_W}
            height={3 * BAND_STEP - 6}
            rx={4}
            aria-hidden="true"
          />

          <Band windows={sunWindows} y={BAND_TOP} startMs={startMs} endMs={endMs} tone="sun" />
          <Band
            windows={earthWindows}
            y={BAND_TOP + BAND_STEP}
            startMs={startMs}
            endMs={endMs}
            tone="earth"
          />
          <Band
            windows={bothWindows}
            y={BAND_TOP + 2 * BAND_STEP}
            startMs={startMs}
            endMs={endMs}
            tone="both"
          />

          <text className="timeline-row-label" x={PAD_L - 8} y={BAND_TOP + 12} textAnchor="end">
            Sun
          </text>
          <text
            className="timeline-row-label"
            x={PAD_L - 8}
            y={BAND_TOP + BAND_STEP + 12}
            textAnchor="end"
          >
            Earth
          </text>
          <text
            className="timeline-row-label"
            x={PAD_L - 8}
            y={BAND_TOP + 2 * BAND_STEP + 12}
            textAnchor="end"
          >
            Both
          </text>

          <rect className="timeline-chart-bg" x={PAD_L} y={CHART_TOP} width={PLOT_W} height={CHART_H} rx={4} />
          <line
            className="timeline-zero"
            x1={PAD_L}
            y1={yForElevation(0, scale)}
            x2={PAD_L + PLOT_W}
            y2={yForElevation(0, scale)}
          />
          <text className="timeline-axis-label" x={PAD_L - 8} y={yForElevation(0, scale) + 4} textAnchor="end">
            0°
          </text>
          <text className="timeline-axis-label" x={PAD_L - 8} y={CHART_TOP + 9} textAnchor="end">
            {scale.max.toFixed(0)}°
          </text>
          <text className="timeline-axis-label" x={PAD_L - 8} y={CHART_TOP + CHART_H} textAnchor="end">
            {scale.min.toFixed(0)}°
          </text>

          <path className="timeline-line timeline-line-sun" d={sunPath} />
          <path className="timeline-line timeline-line-earth" d={earthPath} />

          {tickTimes(startMs, endMs).map((tickMs, index, all) => {
            const x = xFor(tickMs, startMs, endMs)
            const anchor = index === 0 ? 'start' : index === all.length - 1 ? 'end' : 'middle'
            return (
              <g key={tickMs} aria-hidden="true">
                <line className="timeline-tick" x1={x} y1={CHART_TOP} x2={x} y2={CHART_TOP + CHART_H} />
                <text className="timeline-axis-label" x={x} y={AXIS_TOP} textAnchor={anchor}>
                  {formatTick(toIsoZ(new Date(tickMs)))}
                </text>
              </g>
            )
          })}

          <line
            className="timeline-cursor"
            x1={cursorX}
            y1={BAND_TOP - 4}
            x2={cursorX}
            y2={CHART_TOP + CHART_H}
          />
          <circle className="timeline-cursor-handle" cx={cursorX} cy={BAND_TOP - 8} r={4} />
        </svg>

        <div
          className={`timeline-badge${badgeOnLeft ? ' timeline-badge-left' : ''}`}
          style={{ left: `${cursorPercent}%` }}
        >
          <p>
            <span className="timeline-chip timeline-chip-sun" />
            {describeChange('Sun', sunNow, sunChange)}
          </p>
          <p>
            <span className="timeline-chip timeline-chip-earth" />
            {describeChange('Earth', earthNow, earthChange)}
          </p>
        </div>
      </div>

      <p className="timeline-share">
        Sun visible {shares.sun.toFixed(0)}% · Earth visible {shares.earth.toFixed(0)}% · both{' '}
        {shares.both.toFixed(0)}% of the window ({sunWindows.length} sun and {earthWindows.length} earth
        windows)
      </p>
    </div>
  )
}

function Band({
  windows,
  y,
  startMs,
  endMs,
  tone,
}: {
  windows: { start_utc: string; end_utc: string }[]
  y: number
  startMs: number
  endMs: number
  tone: 'sun' | 'earth' | 'both'
}) {
  return (
    <g aria-hidden="true">
      {windows.map((window) => {
        const x1 = xFor(Date.parse(window.start_utc), startMs, endMs)
        const x2 = Math.max(x1 + 1, xFor(Date.parse(window.end_utc), startMs, endMs))
        return (
          <rect
            key={window.start_utc}
            className={`timeline-band timeline-band-${tone}`}
            x={x1}
            y={y}
            width={x2 - x1}
            height={BAND_H}
            rx={3}
          >
            <title>
              {window.start_utc} → {window.end_utc}
            </title>
          </rect>
        )
      })}
    </g>
  )
}

function tickTimes(startMs: number, endMs: number): number[] {
  const span = endMs - startMs
  return Array.from({ length: TICKS }, (_, index) => startMs + (span * index) / (TICKS - 1))
}
