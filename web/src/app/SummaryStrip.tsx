import { api } from '../api/client'
import type { BodySummary, Meta } from '../api/types'
import { useAsync } from '../api/useAsync'
import { type Scenario, toRangeQuery } from './scenario'

function BodyCard({ label, body }: { label: string; body: BodySummary }) {
  const state = body.visible_at_start ? 'Visible at start' : 'Below horizon at start'
  const change =
    body.hours_until_change === null
      ? 'No rise/set in this window'
      : `${body.visible_at_start ? 'Sets' : 'Rises'} in ${body.hours_until_change.toFixed(1)} h`
  const share = `${(body.visible_fraction * 100).toFixed(0)}% of window`

  return (
    <div className={`body-card ${body.visible_at_start ? 'on' : 'off'}`}>
      <h2>{label}</h2>
      <p className="body-state">{state}</p>
      <p>{change}</p>
      <p className="muted">{share} · max elev. {body.max_el_deg.toFixed(2)}°</p>
    </div>
  )
}

function DataNotes({ meta }: { meta: Meta }) {
  return (
    <>
      {meta.ephemeris === 'placeholder' && (
        <p className="warning" role="status">
          Approximate data: ephemeris is a placeholder model, not SPICE.
        </p>
      )}
      {meta.horizon === 'flat' && (
        <p className="hint" role="status">
          Terrain not modelled at this site – flat horizon assumed.
        </p>
      )}
    </>
  )
}

/** Podsumowanie aktywnego scenariusza — zawsze widoczne bez przewijania. */
export default function SummaryStrip({ scenario }: { scenario: Scenario }) {
  const query = toRangeQuery(scenario)
  const { data, error, loading } = useAsync(() => api.summary(query), JSON.stringify(query))

  if (error) {
    return (
      <section className="summary summary-sticky error" aria-live="polite">
        <p>Could not load summary: {error}</p>
      </section>
    )
  }

  if (!data) {
    return (
      <section className="summary summary-sticky" aria-busy={loading} aria-live="polite">
        <p>{loading ? 'Loading power and communications status…' : ''}</p>
      </section>
    )
  }

  return (
    <section className="summary summary-sticky" aria-live="polite">
      <div className="summary-grid">
        <BodyCard label="Sun (power)" body={data.sun} />
        <BodyCard label="Earth (comms)" body={data.earth} />
      </div>
      <DataNotes meta={data.meta} />
    </section>
  )
}
