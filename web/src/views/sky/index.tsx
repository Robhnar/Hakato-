import { api } from '../../api/client'
import { useAsync } from '../../api/useAsync'
import { type ViewProps, toRangeQuery } from '../../app/scenario'
import {
  getElevationRange,
  horizonElevationAt,
  nearestSampleIndex,
  projectPoint,
  splitTrack,
  type PlotBounds,
} from './geometry'
import './sky.css'

const CHART_WIDTH = 800
const CHART_HEIGHT = 380
const PLOT: PlotBounds = { left: 58, top: 22, width: 710, height: 292 }
const Y_TICK_COUNT = 5

type BodyName = 'sun' | 'earth'

function formatDegrees(value: number): string {
  return `${value.toFixed(1)}°`
}

function trackPath(azimuths: number[], elevations: number[], min: number, max: number): string {
  return splitTrack(azimuths, elevations)
    .map((segment) =>
      segment.azimuths
        .map((azimuth, index) => {
          const point = projectPoint(azimuth, segment.elevations[index], { min, max }, PLOT)
          return `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
        })
        .join(' '),
    )
    .join(' ')
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

  const { times_utc, sun, earth } = timeline.data
  const horizonData = horizon.data
  const sampleIndex = nearestSampleIndex(times_utc, cursor_utc)
  if (sampleIndex < 0) return <p className="error">No sky samples are available for this scenario.</p>

  const range = getElevationRange(
    [0],
    horizonData.elevation_deg,
    sun.el_deg,
    earth.el_deg,
  )
  const y = (elevation: number) => projectPoint(0, elevation, range, PLOT).y
  const bottom = PLOT.top + PLOT.height
  const horizonPoints = horizonData.elevation_deg.map((elevation, index) =>
    projectPoint(index * horizonData.azimuth_step_deg, elevation, range, PLOT),
  )
  const horizonLinePath = horizonPoints
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')
  const horizonFillPath = [
    `M ${PLOT.left} ${bottom}`,
    horizonPoints.map((point) => `L ${point.x} ${point.y}`).join(' '),
    `L ${PLOT.left + PLOT.width} ${bottom} Z`,
  ].join(' ')
  const tickValues = Array.from(
    { length: Y_TICK_COUNT },
    (_, index) => range.max - ((range.max - range.min) * index) / (Y_TICK_COUNT - 1),
  )

  const bodies: Record<BodyName, { az: number; el: number }> = {
    sun: { az: sun.az_deg[sampleIndex], el: sun.el_deg[sampleIndex] },
    earth: { az: earth.az_deg[sampleIndex], el: earth.el_deg[sampleIndex] },
  }
  const horizonAtBody: Record<BodyName, number> = {
    sun: horizonElevationAt(bodies.sun.az, horizonData.elevation_deg, horizonData.azimuth_step_deg),
    earth: horizonElevationAt(
      bodies.earth.az,
      horizonData.elevation_deg,
      horizonData.azimuth_step_deg,
    ),
  }
  const visible: Record<BodyName, boolean> = {
    sun: bodies.sun.el > horizonAtBody.sun,
    earth: bodies.earth.el > horizonAtBody.earth,
  }
  const selectedTime = times_utc[sampleIndex]

  return (
    <section className="sky-view" aria-labelledby="sky-view-title">
      <header className="sky-view__header">
        <div>
          <h2 id="sky-view-title">Sky panorama · {active.name}</h2>
          <p>
            {times_utc[0]} — {times_utc[times_utc.length - 1]} · cursor sample {selectedTime}
          </p>
        </div>
        <div className="sky-view__legend" aria-label="Chart legend">
          <span className="sky-view__legend-item">
            <span className="sky-view__swatch sky-view__swatch--sun" aria-hidden="true" />
            Sun trail
          </span>
          <span className="sky-view__legend-item">
            <span className="sky-view__swatch sky-view__swatch--earth" aria-hidden="true" />
            Earth trail
          </span>
          <span className="sky-view__legend-item">Dashed marker: below terrain horizon</span>
        </div>
      </header>

      <figure className="sky-view__chart">
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          role="img"
          aria-labelledby="sky-chart-title sky-chart-description"
        >
          <title id="sky-chart-title">Sun and Earth above the lunar horizon</title>
          <desc id="sky-chart-description">
            Azimuth runs from north through east, south and west back to north. The shaded area is
            terrain below the local horizon. Trails cover the scenario window; markers show the
            sample nearest the shared time cursor.
          </desc>

          {tickValues.map((value) => {
            const tickY = y(value)
            return (
              <g key={value}>
                <line
                  className="sky-view__grid"
                  x1={PLOT.left}
                  x2={PLOT.left + PLOT.width}
                  y1={tickY}
                  y2={tickY}
                />
                <text className="sky-view__tick" x={PLOT.left - 10} y={tickY + 4} textAnchor="end">
                  {value.toFixed(1)}°
                </text>
              </g>
            )
          })}

          {[0, 90, 180, 270, 360].map((azimuth) => {
            const point = projectPoint(azimuth, 0, range, PLOT)
            const direction = ['N', 'E', 'S', 'W', 'N'][azimuth / 90]
            return (
              <g key={azimuth}>
                <line
                  className="sky-view__grid"
                  x1={point.x}
                  x2={point.x}
                  y1={PLOT.top}
                  y2={bottom}
                />
                <text
                  className="sky-view__tick"
                  x={point.x}
                  y={bottom + 20}
                  textAnchor={azimuth === 0 ? 'start' : azimuth === 360 ? 'end' : 'middle'}
                >
                  {direction} · {azimuth}°
                </text>
              </g>
            )
          })}

          <path className="sky-view__horizon-fill" d={horizonFillPath} />
          <path className="sky-view__horizon-line" d={horizonLinePath} />

          <path className="sky-view__trail sky-view__trail--sun" d={trackPath(sun.az_deg, sun.el_deg, range.min, range.max)} />
          <path
            className="sky-view__trail sky-view__trail--earth"
            d={trackPath(earth.az_deg, earth.el_deg, range.min, range.max)}
          />

          <line
            className="sky-view__cursor"
            x1={projectPoint(bodies.sun.az, 0, range, PLOT).x}
            x2={projectPoint(bodies.sun.az, 0, range, PLOT).x}
            y1={PLOT.top}
            y2={bottom}
          />

          {(['sun', 'earth'] as const).map((body) => {
            const point = projectPoint(bodies[body].az, bodies[body].el, range, PLOT)
            return (
              <circle
                key={body}
                className={`sky-view__marker sky-view__marker--${body}${visible[body] ? '' : ' sky-view__marker--hidden'}`}
                cx={point.x}
                cy={point.y}
                r={body === 'sun' ? 8 : 7}
              >
                <title>
                  {body === 'sun' ? 'Sun' : 'Earth'}: {formatDegrees(bodies[body].az)} azimuth,{' '}
                  {formatDegrees(bodies[body].el)} elevation; horizon{' '}
                  {formatDegrees(horizonAtBody[body])}
                </title>
              </circle>
            )
          })}

          <text
            className="sky-view__axis-label"
            x={PLOT.left + PLOT.width / 2}
            y={CHART_HEIGHT - 7}
            textAnchor="middle"
          >
            Azimuth
          </text>
          <text
            className="sky-view__axis-label"
            transform={`translate(16 ${PLOT.top + PLOT.height / 2}) rotate(-90)`}
            textAnchor="middle"
          >
            Elevation
          </text>
        </svg>
      </figure>

      <div className="sky-view__readouts" aria-label="Positions at the selected time">
        {(['sun', 'earth'] as const).map((body) => (
          <section className="sky-view__readout" key={body} aria-label={body === 'sun' ? 'Sun' : 'Earth'}>
            <h3>{body === 'sun' ? 'Sun' : 'Earth'}</h3>
            <dl>
              <dt>Azimuth</dt>
              <dd>{formatDegrees(bodies[body].az)}</dd>
              <dt>Elevation</dt>
              <dd>{formatDegrees(bodies[body].el)}</dd>
              <dt>Terrain horizon</dt>
              <dd>{formatDegrees(horizonAtBody[body])}</dd>
            </dl>
            <p
              className={`sky-view__visibility sky-view__visibility--${visible[body] ? 'visible' : 'hidden'}`}
            >
              {visible[body] ? 'Above terrain horizon' : 'Below terrain horizon'}
            </p>
          </section>
        ))}
      </div>
    </section>
  )
}
