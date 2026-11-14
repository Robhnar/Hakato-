import { api } from '../../api/client'
import { useAsync } from '../../api/useAsync'
import { type Scenario, toRangeQuery } from '../../app/scenario'
import { bandsFromWindows, windowsFromVisibility } from './windows'

/** Pasy okien widoczności na osi godzin od startu (dane z timeline). */
export default function WindowLane({ scenario }: { scenario: Scenario }) {
  const query = toRangeQuery(scenario, 60)
  const { data, error, loading } = useAsync(
    () => api.timeline(query),
    `timeline:${JSON.stringify(query)}`,
  )

  if (error) {
    return <p className="compare-lane-error">Timeline unavailable: {error}</p>
  }
  if (!data) {
    return <p className="compare-lane-loading">{loading ? 'Loading windows…' : ''}</p>
  }

  const sunBands = bandsFromWindows(
    scenario.start_utc,
    scenario.duration_hours,
    windowsFromVisibility(data.times_utc, data.sun.visible),
  )
  const earthBands = bandsFromWindows(
    scenario.start_utc,
    scenario.duration_hours,
    windowsFromVisibility(data.times_utc, data.earth.visible),
  )

  return (
    <div className="compare-lanes" aria-label={`Visibility windows for ${scenario.name}`}>
      <Track label="Sun" bands={sunBands} durationHours={scenario.duration_hours} tone="sun" />
      <Track label="Earth" bands={earthBands} durationHours={scenario.duration_hours} tone="earth" />
      <div className="compare-axis">
        <span>0 h</span>
        <span>{(scenario.duration_hours / 2).toFixed(0)} h</span>
        <span>{scenario.duration_hours.toFixed(0)} h</span>
      </div>
    </div>
  )
}

function Track({
  label,
  bands,
  durationHours,
  tone,
}: {
  label: string
  bands: { startHours: number; endHours: number }[]
  durationHours: number
  tone: 'sun' | 'earth'
}) {
  return (
    <div className="compare-track">
      <span className="compare-track-label">{label}</span>
      <div className="compare-track-bar" role="img" aria-label={`${label} visibility bands`}>
        {bands.map((band) => (
          <span
            key={`${band.startHours}-${band.endHours}`}
            className={`compare-band compare-band-${tone}`}
            style={{
              left: `${(band.startHours / durationHours) * 100}%`,
              width: `${((band.endHours - band.startHours) / durationHours) * 100}%`,
            }}
            title={`${band.startHours.toFixed(1)}–${band.endHours.toFixed(1)} h from start`}
          />
        ))}
      </div>
    </div>
  )
}
