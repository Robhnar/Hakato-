import { useEffect } from 'react'
import { api } from '../../api/client'
import { useAsync } from '../../api/useAsync'
import { type Scenario, toRangeQuery } from '../../app/scenario'
import { metricsFromSummary, type ScenarioMetrics } from './metrics'
import WindowLane from './WindowLane'

interface Props {
  scenario: Scenario
  active: boolean
  onSelect: () => void
  columnBest: {
    sunFraction: boolean
    earthFraction: boolean
    sunMaxEl: boolean
    earthMaxEl: boolean
  }
  onMetrics: (scenarioId: string, metrics: ScenarioMetrics | null) => void
}

/** Wiersz jednego scenariusza — własne useAsync, błąd nie psuje innych. */
export default function ScenarioCard({
  scenario,
  active,
  onSelect,
  columnBest,
  onMetrics,
}: Props) {
  const query = toRangeQuery(scenario)
  const { data, error, loading } = useAsync(
    () => api.summary(query),
    `summary:${JSON.stringify(query)}`,
  )

  useEffect(() => {
    onMetrics(scenario.id, data ? metricsFromSummary(data) : null)
  }, [scenario.id, data, onMetrics])

  return (
    <article
      className={`compare-card ${active ? 'compare-card-active' : ''}`}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
      role="button"
      tabIndex={0}
      aria-pressed={active}
    >
      <header className="compare-card-head">
        <h3>{scenario.name}</h3>
        <p className="compare-card-meta">
          {scenario.lat_deg.toFixed(3)}°, {scenario.lon_deg.toFixed(3)}° · start{' '}
          {scenario.start_utc.replace('T', ' ').replace('Z', ' UTC')} ·{' '}
          {scenario.duration_hours.toFixed(1)} h
        </p>
      </header>

      {error && <p className="compare-error">Summary failed: {error}</p>}
      {!data && !error && <p className="compare-loading">{loading ? 'Loading summary…' : ''}</p>}

      {data && (
        <dl className="compare-metrics">
          <Metric
            label="Sun time"
            value={`${(data.sun.visible_fraction * 100).toFixed(0)}%`}
            best={columnBest.sunFraction}
          />
          <Metric
            label="Earth time"
            value={`${(data.earth.visible_fraction * 100).toFixed(0)}%`}
            best={columnBest.earthFraction}
          />
          <Metric
            label="Sun max el."
            value={`${data.sun.max_el_deg.toFixed(2)}°`}
            best={columnBest.sunMaxEl}
          />
          <Metric
            label="Earth max el."
            value={`${data.earth.max_el_deg.toFixed(2)}°`}
            best={columnBest.earthMaxEl}
          />
          <Metric
            label="Sun at start"
            value={describeNow(data.sun.visible_at_start, data.sun.hours_until_change)}
            best={false}
          />
          <Metric
            label="Earth at start"
            value={describeNow(data.earth.visible_at_start, data.earth.hours_until_change)}
            best={false}
          />
        </dl>
      )}

      <WindowLane scenario={scenario} />
    </article>
  )
}

function Metric({ label, value, best }: { label: string; value: string; best: boolean }) {
  return (
    <div className={best ? 'compare-metric best' : 'compare-metric'}>
      <dt>{label}</dt>
      <dd>
        {value}
        {best ? <span className="compare-best-tag"> best</span> : null}
      </dd>
    </div>
  )
}

function describeNow(visible: boolean, hours: number | null): string {
  const state = visible ? 'visible' : 'hidden'
  if (hours === null) return `${state}, no change in window`
  return `${state}, ${visible ? 'sets' : 'rises'} in ${hours.toFixed(1)} h`
}
