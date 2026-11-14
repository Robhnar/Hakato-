import { api } from '../../api/client'
import type { BodySeries, Horizon, Timeline } from '../../api/types'
import { useAsync } from '../../api/useAsync'
import { formatDeg, formatUtc } from '../../app/format'
import { type ViewProps, toRangeQuery } from '../../app/scenario'
import { horizonEdgePath, horizonSilhouettePath, trailPathSegments } from './paths'
import {
  azToX,
  elToY,
  elevationRange,
  horizonElevationAt,
  nearestTimeIndex,
  plotInner,
  type PlotLayout,
  toSvgPoint,
} from './project'
import './sky.css'

const WIDTH = 900
const HEIGHT = 400
const PADDING = { top: 24, right: 20, bottom: 56, left: 60 }

/** Podziałka azymutu co 45°: strona świata + stopnie (0° na lewo, 360° na prawo). */
const AZIMUTH_MARKS: { az: number; label: string }[] = [
  { az: 0, label: 'N 0°' },
  { az: 45, label: 'NE 45°' },
  { az: 90, label: 'E 90°' },
  { az: 135, label: 'SE 135°' },
  { az: 180, label: 'S 180°' },
  { az: 225, label: 'SW 225°' },
  { az: 270, label: 'W 270°' },
  { az: 315, label: 'NW 315°' },
]

const TONE = {
  sun: 'Sun',
  earth: 'Earth',
} as const

type Tone = keyof typeof TONE

function buildLayout(horizon: Horizon, timeline: Timeline): PlotLayout {
  const values = [
    ...horizon.elevation_deg,
    ...timeline.sun.el_deg,
    ...timeline.earth.el_deg,
  ]
  const { elMin, elMax } = elevationRange(values)
  return { width: WIDTH, height: HEIGHT, padding: PADDING, elMin, elMax }
}

/** Różnica wysokości ze znakiem: `+0.42°`, `−1.20°`. */
function signedDeg(value: number): string {
  if (!Number.isFinite(value)) return '—'
  return `${value < 0 ? '−' : '+'}${formatDeg(Math.abs(value))}`
}

/** Pierwszy i ostatni poprawny punkt serii (NaN pomijamy). */
function endpoints(series: BodySeries): { first: number; last: number } {
  const n = Math.min(series.az_deg.length, series.el_deg.length)
  let first = -1
  let last = -1
  for (let i = 0; i < n; i += 1) {
    if (!Number.isFinite(series.az_deg[i]) || !Number.isFinite(series.el_deg[i])) continue
    if (first < 0) first = i
    last = i
  }
  return { first, last }
}

function Trail({
  series,
  tone,
  layout,
}: {
  series: BodySeries
  tone: Tone
  layout: PlotLayout
}) {
  const segments = trailPathSegments(series, layout)
  const { first, last } = endpoints(series)
  const start = first < 0 ? null : toSvgPoint(series.az_deg[first], series.el_deg[first], layout)
  const end = last < 0 ? null : toSvgPoint(series.az_deg[last], series.el_deg[last], layout)

  return (
    <g>
      {segments.map((segment, index) => (
        <path
          key={index}
          className={`sky-trail sky-trail-${tone}${segment.visible ? '' : ' sky-trail-hidden'}`}
          d={segment.d}
        />
      ))}
      {start && (
        // Początek okna: puste kółko.
        <circle className={`sky-start sky-mark-${tone}`} cx={start.x} cy={start.y} r={3} />
      )}
      {end && (
        // Koniec okna: krótka pionowa kreska.
        <line
          className={`sky-end sky-mark-${tone}`}
          x1={end.x}
          y1={end.y - 4}
          x2={end.x}
          y2={end.y + 4}
        />
      )}
    </g>
  )
}

function BodyMarker({
  tone,
  az,
  el,
  visible,
  layout,
}: {
  tone: Tone
  az: number
  el: number
  visible: boolean
  layout: PlotLayout
}) {
  if (!Number.isFinite(az) || !Number.isFinite(el)) return null
  const { x, y } = toSvgPoint(az, el, layout)
  // Podpis z prawej, ale przy prawej krawędzi przechodzi na lewo od znacznika.
  const flip = x > WIDTH * 0.8
  const labelX = flip ? x - 10 : x + 10
  const className = `sky-marker sky-marker-${tone}${visible ? '' : ' sky-marker-occulted'}`

  return (
    <g>
      <circle className={className} cx={x} cy={y} r={4} />
      <text
        className={`sky-body-label sky-body-label-${tone}`}
        x={labelX}
        y={y + 4}
        textAnchor={flip ? 'end' : 'start'}
      >
        {TONE[tone]}
      </text>
    </g>
  )
}

export default function SkyView({ active, cursor_utc, setCursorUtc }: ViewProps) {
  const query = toRangeQuery(active, 60)
  const timeline = useAsync(() => api.timeline(query), JSON.stringify(query))
  const horizon = useAsync(
    () => api.horizon(active.lat_deg, active.lon_deg),
    `${active.lat_deg},${active.lon_deg}`,
  )

  if (timeline.error || horizon.error) {
    return <p className="error" role="alert">{timeline.error ?? horizon.error}</p>
  }
  if (!timeline.data || !horizon.data) return <p role="status">Loading…</p>
  const times = timeline.data.times_utc
  if (times.length === 0) {
    return <p role="status">No visibility samples in this window.</p>
  }

  const layout = buildLayout(horizon.data, timeline.data)
  const idx = nearestTimeIndex(times, cursor_utc)
  const sunAz = timeline.data.sun.az_deg[idx]
  const sunEl = timeline.data.sun.el_deg[idx]
  const earthAz = timeline.data.earth.az_deg[idx]
  const earthEl = timeline.data.earth.el_deg[idx]
  const sunVisible = timeline.data.sun.visible[idx]
  const earthVisible = timeline.data.earth.visible[idx]
  const sunTerrain = horizonElevationAt(
    sunAz,
    horizon.data.elevation_deg,
    horizon.data.azimuth_step_deg,
  )
  const earthTerrain = horizonElevationAt(
    earthAz,
    horizon.data.elevation_deg,
    horizon.data.azimuth_step_deg,
  )

  const terrainFill = horizonSilhouettePath(
    horizon.data.elevation_deg,
    horizon.data.azimuth_step_deg,
    layout,
  )
  const terrainEdge = horizonEdgePath(
    horizon.data.elevation_deg,
    horizon.data.azimuth_step_deg,
    layout,
  )

  const inner = plotInner(layout)
  const yZero = elToY(0, layout)
  const elevationTicks = niceElevationTicks(layout.elMin, layout.elMax)
  const rightEdge = inner.x + inner.w

  const rows = [
    {
      tone: 'sun' as Tone,
      az: sunAz,
      el: sunEl,
      terrain: sunTerrain,
      visible: sunVisible,
    },
    {
      tone: 'earth' as Tone,
      az: earthAz,
      el: earthEl,
      terrain: earthTerrain,
      visible: earthVisible,
    },
  ]

  return (
    <div className="sky">
      <h2>Sky panorama</h2>

      <div className="sky-panel">
        <svg
          className="sky-svg"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label="Sky panorama: Sun and Earth against the local terrain horizon"
        >
          {/* Siatka azymutu i opisy stron świata */}
          {AZIMUTH_MARKS.map(({ az, label }) => {
            const x = azToX(az, layout)
            return (
              <g key={az}>
                <line className="sky-grid" x1={x} y1={inner.y} x2={x} y2={inner.y + inner.h} />
                <text
                  className="sky-axis-label"
                  x={x}
                  y={HEIGHT - PADDING.bottom + 18}
                  textAnchor={az === 0 ? 'start' : 'middle'}
                >
                  {label}
                </text>
              </g>
            )
          })}
          <g>
            <line className="sky-grid" x1={rightEdge} y1={inner.y} x2={rightEdge} y2={inner.y + inner.h} />
            <text
              className="sky-axis-label"
              x={rightEdge}
              y={HEIGHT - PADDING.bottom + 18}
              textAnchor="end"
            >
              N 360°
            </text>
          </g>

          {/* Podziałka wysokości */}
          {elevationTicks.map((el) => {
            const y = elToY(el, layout)
            return (
              <g key={el}>
                <line className="sky-grid" x1={inner.x} y1={y} x2={rightEdge} y2={y} />
                <text
                  className="sky-axis-label"
                  x={PADDING.left - 10}
                  y={y + 4}
                  textAnchor="end"
                >
                  {el.toFixed(el % 1 === 0 ? 0 : 1)}°
                </text>
              </g>
            )
          })}

          {/* Geometryczny horyzont 0° */}
          {layout.elMin < 0 && layout.elMax > 0 && (
            <line className="sky-zero" x1={inner.x} y1={yZero} x2={rightEdge} y2={yZero} />
          )}

          {/* Sylwetka terenu: wypełnienie + wyraźna górna krawędź */}
          <path className="sky-terrain" d={terrainFill} />
          <path className="sky-terrain-edge" d={terrainEdge} />

          <Trail series={timeline.data.sun} tone="sun" layout={layout} />
          <Trail series={timeline.data.earth} tone="earth" layout={layout} />

          <BodyMarker tone="sun" az={sunAz} el={sunEl} visible={sunVisible} layout={layout} />
          <BodyMarker tone="earth" az={earthAz} el={earthEl} visible={earthVisible} layout={layout} />

          {/* Opisy osi */}
          <text
            className="sky-axis-title"
            x={16}
            y={inner.y + inner.h / 2}
            textAnchor="middle"
            transform={`rotate(-90 16 ${inner.y + inner.h / 2})`}
          >
            elevation
          </text>
          <text
            className="sky-axis-title"
            x={inner.x + inner.w / 2}
            y={HEIGHT - 8}
            textAnchor="middle"
          >
            azimuth
          </text>
        </svg>
      </div>

      <div className="sky-cursor">
        <input
          className="sky-slider"
          type="range"
          aria-label="Time cursor"
          min={0}
          max={Math.max(0, times.length - 1)}
          value={idx}
          onChange={(event) => {
            const next = times[Number(event.target.value)]
            if (next) setCursorUtc(next)
          }}
        />
        <span className="num sky-cursor-time">{formatUtc(times[idx])}</span>
      </div>

      <ul className="sky-legend">
        <li>
          <span className="sky-legend-swatch sky-legend-sun" />
          Sun
        </li>
        <li>
          <span className="sky-legend-swatch sky-legend-earth" />
          Earth
        </li>
        <li>
          <span className="sky-legend-swatch sky-legend-terrain" />
          Terrain horizon ({horizon.data.source})
        </li>
        <li>
          <span className="sky-legend-dash" />
          behind terrain
        </li>
      </ul>

      <div className="sky-readout-wrap">
        <table className="sky-readout">
          <thead>
            <tr>
              <th scope="col" className="label">
                Body
              </th>
              <th scope="col" className="label">
                Azimuth
              </th>
              <th scope="col" className="label">
                Elevation
              </th>
              <th scope="col" className="label">
                Terrain below
              </th>
              <th scope="col" className="label">
                Clearance
              </th>
              <th scope="col" className="label">
                State
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.tone}>
                <th scope="row" className={`sky-body-name sky-body-name-${row.tone}`}>
                  {TONE[row.tone]}
                </th>
                <td className="num">{formatDeg(row.az, 1)}</td>
                <td className="num">{formatDeg(row.el)}</td>
                <td className="num">{formatDeg(row.terrain)}</td>
                <td className="num">{signedDeg(row.el - row.terrain)}</td>
                <td className={row.visible ? 'sky-state-visible' : 'sky-state-occulted'}>
                  {row.visible ? 'visible' : 'occulted'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Kilka czytelnych znaczników wysokości w zakresie [elMin, elMax]. */
function niceElevationTicks(elMin: number, elMax: number): number[] {
  const span = elMax - elMin
  if (!(span > 0)) return [0]

  const rough = span / 4
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const residual = rough / magnitude
  let step = magnitude
  if (residual >= 5) step = 5 * magnitude
  else if (residual >= 2) step = 2 * magnitude
  else step = magnitude

  const ticks: number[] = []
  const start = Math.ceil(elMin / step) * step
  for (let v = start; v <= elMax + step * 1e-9; v += step) {
    const rounded = Math.abs(v) < step * 1e-9 ? 0 : Number(v.toFixed(6))
    ticks.push(rounded)
  }
  if (!ticks.includes(0) && elMin < 0 && elMax > 0) ticks.push(0)
  return ticks.sort((a, b) => a - b)
}
