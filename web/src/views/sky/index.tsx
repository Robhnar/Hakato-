import { api } from '../../api/client'
import type { BodySeries, Horizon, Timeline } from '../../api/types'
import { useAsync } from '../../api/useAsync'
import { type ViewProps, toRangeQuery } from '../../app/scenario'
import { horizonSilhouettePath, trailPaths } from './paths'
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
const HEIGHT = 380
const PADDING = { top: 18, right: 16, bottom: 36, left: 48 }

const CARDINAL: { az: number; label: string }[] = [
  { az: 0, label: 'N' },
  { az: 90, label: 'E' },
  { az: 180, label: 'S' },
  { az: 270, label: 'W' },
]

function buildLayout(horizon: Horizon, timeline: Timeline): PlotLayout {
  const values = [
    ...horizon.elevation_deg,
    ...timeline.sun.el_deg,
    ...timeline.earth.el_deg,
  ]
  const { elMin, elMax } = elevationRange(values)
  return { width: WIDTH, height: HEIGHT, padding: PADDING, elMin, elMax }
}

function formatDeg(value: number, digits = 2): string {
  return `${value.toFixed(digits)}°`
}

function BodyMarker({
  az,
  el,
  visible,
  kind,
  layout,
}: {
  az: number
  el: number
  visible: boolean
  kind: 'sun' | 'earth'
  layout: PlotLayout
}) {
  const { x, y } = toSvgPoint(az, el, layout)
  const r = kind === 'sun' ? 7 : 8
  const className = [
    kind === 'sun' ? 'sky-body-sun' : 'sky-body-earth',
    visible ? '' : 'sky-body-occulted',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <g>
      <circle className={className} cx={x} cy={y} r={r} />
      {!visible && (
        <title>{kind === 'sun' ? 'Sun' : 'Earth'} occulted by terrain</title>
      )}
    </g>
  )
}

function Trail({
  series,
  className,
  layout,
}: {
  series: BodySeries
  className: string
  layout: PlotLayout
}) {
  return (
    <>
      {trailPaths({ az_deg: series.az_deg, el_deg: series.el_deg }, layout).map((d, i) => (
        <path key={i} className={className} d={d} />
      ))}
    </>
  )
}

export default function SkyView({ active, cursor_utc }: ViewProps) {
  const query = toRangeQuery(active, 60)
  const timeline = useAsync(() => api.timeline(query), JSON.stringify(query))
  const horizon = useAsync(
    () => api.horizon(active.lat_deg, active.lon_deg),
    `${active.lat_deg},${active.lon_deg}`,
  )

  if (timeline.error || horizon.error) {
    return <p className="error">{timeline.error ?? horizon.error}</p>
  }
  if (!timeline.data || !horizon.data) return <p>Loading…</p>

  const layout = buildLayout(horizon.data, timeline.data)
  const idx = nearestTimeIndex(timeline.data.times_utc, cursor_utc)
  const sunAz = timeline.data.sun.az_deg[idx]
  const sunEl = timeline.data.sun.el_deg[idx]
  const earthAz = timeline.data.earth.az_deg[idx]
  const earthEl = timeline.data.earth.el_deg[idx]
  const sunVisible = timeline.data.sun.visible[idx]
  const earthVisible = timeline.data.earth.visible[idx]
  const sunHorizonEl = horizonElevationAt(
    sunAz,
    horizon.data.elevation_deg,
    horizon.data.azimuth_step_deg,
  )
  const earthHorizonEl = horizonElevationAt(
    earthAz,
    horizon.data.elevation_deg,
    horizon.data.azimuth_step_deg,
  )

  const horizonPath = horizonSilhouettePath(
    horizon.data.elevation_deg,
    horizon.data.azimuth_step_deg,
    layout,
  )

  const inner = plotInner(layout)
  const yZero = elToY(0, layout)
  const tickEls = niceElevationTicks(layout.elMin, layout.elMax)
  const cardinalMarks = [
    ...CARDINAL.map(({ az, label }) => ({
      x: azToX(az, layout),
      label,
      key: `${label}-${az}`,
    })),
    { x: inner.x + inner.w, label: 'N', key: 'N-360' },
  ]

  return (
    <div className="sky">
      <h2>Sky panorama</h2>
      <p className="sky-hint">
        Azimuth across, elevation up. Terrain silhouette from the local horizon; body positions at
        the shared time cursor.
      </p>

      <div className="sky-panel">
        <svg
          className="sky-svg"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label="Sky panorama with horizon, Sun and Earth"
        >
          {/* Vertical grid / cardinals (N also at right edge = 360°) */}
          {cardinalMarks.map(({ x, label, key }) => (
            <g key={key}>
              <line
                className="sky-grid"
                x1={x}
                y1={PADDING.top}
                x2={x}
                y2={HEIGHT - PADDING.bottom}
              />
              <text className="sky-axis-label" x={x} y={HEIGHT - 12} textAnchor="middle">
                {label}
              </text>
            </g>
          ))}

          {/* Elevation ticks */}
          {tickEls.map((el) => {
            const y = elToY(el, layout)
            return (
              <g key={el}>
                <line
                  className="sky-grid"
                  x1={PADDING.left}
                  y1={y}
                  x2={WIDTH - PADDING.right}
                  y2={y}
                />
                <text
                  className="sky-axis-label"
                  x={PADDING.left - 8}
                  y={y + 3}
                  textAnchor="end"
                >
                  {el.toFixed(el % 1 === 0 ? 0 : 1)}°
                </text>
              </g>
            )
          })}

          {/* Geometric horizon (0°) */}
          {layout.elMin < 0 && layout.elMax > 0 && (
            <line
              className="sky-zero"
              x1={PADDING.left}
              y1={yZero}
              x2={WIDTH - PADDING.right}
              y2={yZero}
            />
          )}

          <path className="sky-horizon" d={horizonPath} />

          <Trail series={timeline.data.sun} className="sky-trail-sun" layout={layout} />
          <Trail series={timeline.data.earth} className="sky-trail-earth" layout={layout} />

          <BodyMarker
            kind="sun"
            az={sunAz}
            el={sunEl}
            visible={sunVisible}
            layout={layout}
          />
          <BodyMarker
            kind="earth"
            az={earthAz}
            el={earthEl}
            visible={earthVisible}
            layout={layout}
          />
        </svg>
      </div>

      <ul className="sky-legend">
        <li>
          <span className="sky-legend-swatch sky-legend-swatch-horizon" />
          Terrain horizon ({horizon.data.source})
        </li>
        <li>
          <span className="sky-legend-swatch sky-legend-swatch-sun" />
          Sun trail / position
        </li>
        <li>
          <span className="sky-legend-swatch sky-legend-swatch-earth" />
          Earth trail / position
        </li>
        <li>Hollow marker = occulted by terrain</li>
      </ul>

      <dl className="sky-readout">
        <div>
          <dt className="sky-sun-label">Sun at cursor</dt>
          <dd>
            az {formatDeg(sunAz, 1)}, el {formatDeg(sunEl)} · horizon under body{' '}
            {formatDeg(sunHorizonEl)} · {sunVisible ? 'visible' : 'occulted'}
          </dd>
        </div>
        <div>
          <dt className="sky-earth-label">Earth at cursor</dt>
          <dd>
            az {formatDeg(earthAz, 1)}, el {formatDeg(earthEl)} · horizon under body{' '}
            {formatDeg(earthHorizonEl)} · {earthVisible ? 'visible' : 'occulted'}
          </dd>
        </div>
        <div>
          <dt>Sample time</dt>
          <dd>{timeline.data.times_utc[idx]}</dd>
        </div>
      </dl>
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
