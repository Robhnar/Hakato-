import { api } from '../../api/client'
import { useAsync } from '../../api/useAsync'
import { type Scenario, toRangeQuery } from '../../app/scenario'
import { bandsFromWindows, windowsFromVisibility } from './windows'

interface Props {
  scenario: Scenario
  /** Shared timeline of all scenarios in hours. */
  maxHours: number
  active: boolean
}

/**
 * Visibility-window bands of one scenario on the shared hour axis.
 * Data from timeline (60 min step), so the bands are more precise than the summary.
 */
export default function WindowLane({ scenario, maxHours, active }: Props) {
  const query = toRangeQuery(scenario, 60)
  const { data, error, loading } = useAsync(
    () => api.timeline(query),
    `timeline:${JSON.stringify(query)}`,
  )

  const axisHours = maxHours > 0 ? maxHours : scenario.duration_hours
  const sunBands = data
    ? bandsFromWindows(
        scenario.start_utc,
        scenario.duration_hours,
        windowsFromVisibility(data.times_utc, data.sun.visible),
      )
    : []
  const earthBands = data
    ? bandsFromWindows(
        scenario.start_utc,
        scenario.duration_hours,
        windowsFromVisibility(data.times_utc, data.earth.visible),
      )
    : []

  return (
    <div className={`compare-lane${active ? ' compare-lane-active' : ''}`}>
      <div className="compare-lane-head">
        <span className="compare-lane-name">{scenario.name}</span>
      </div>

      {error && <p className="compare-lane-error">Timeline unavailable: {error}</p>}
      {!data && !error && (
        <p className="compare-lane-loading">{loading ? 'Loading windows…' : ''}</p>
      )}

      {data && (
        <div
          className="compare-lane-tracks"
          role="img"
          aria-label={`Visibility windows for ${scenario.name} from its own start`}
        >
          <Track label="Sun" bands={sunBands} axisHours={axisHours} tone="sun" />
          <Track label="Earth" bands={earthBands} axisHours={axisHours} tone="earth" />
        </div>
      )}
    </div>
  )
}

function Track({
  label,
  bands,
  axisHours,
  tone,
}: {
  label: string
  bands: { startHours: number; endHours: number }[]
  axisHours: number
  tone: 'sun' | 'earth'
}) {
  return (
    <div className="compare-track">
      <span className={`compare-track-label compare-track-label-${tone}`}>{label}</span>
      <span className="compare-track-bar">
        {bands.map((band) => (
          <span
            key={`${band.startHours}-${band.endHours}`}
            className={`compare-band compare-band-${tone}`}
            style={{
              left: `${(band.startHours / axisHours) * 100}%`,
              width: `${((band.endHours - band.startHours) / axisHours) * 100}%`,
            }}
            title={`${label} ${band.startHours.toFixed(1)}–${band.endHours.toFixed(1)} h from start`}
          />
        ))}
      </span>
    </div>
  )
}
