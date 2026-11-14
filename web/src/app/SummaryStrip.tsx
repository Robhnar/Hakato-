import { api } from '../api/client'
import type { BodySummary } from '../api/types'
import { useAsync } from '../api/useAsync'
import { type Scenario, toRangeQuery } from './scenario'

function describe(label: string, body: BodySummary): string {
  const state = body.visible_at_start ? 'visible' : 'below horizon'
  const change =
    body.hours_until_change === null
      ? 'no change in range'
      : `${body.visible_at_start ? 'sets' : 'rises'} in ${body.hours_until_change.toFixed(1)} h`
  const share = `${(body.visible_fraction * 100).toFixed(0)}% of range`
  return `${label}: ${state}, ${change}, ${share}`
}

/** Minimalne podsumowanie aktywnego scenariusza - dowód, że dane płyną z API. */
export default function SummaryStrip({ scenario }: { scenario: Scenario }) {
  const query = toRangeQuery(scenario)
  const { data, error, loading } = useAsync(() => api.summary(query), JSON.stringify(query))

  if (error) return <p className="summary error">{error}</p>
  if (!data) return <p className="summary">{loading ? 'Loading…' : ''}</p>

  const approximate = data.meta.ephemeris !== 'spice' || data.meta.horizon !== 'lola'
  return (
    <div className="summary">
      <p>{describe('Sun', data.sun)}</p>
      <p>{describe('Earth', data.earth)}</p>
      {approximate && (
        <p className="warning">
          Approximate data: ephemeris “{data.meta.ephemeris}”, horizon “{data.meta.horizon}”.
        </p>
      )}
    </div>
  )
}
