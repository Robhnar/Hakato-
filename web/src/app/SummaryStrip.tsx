import { api } from '../api/client'
import type { BodySummary } from '../api/types'
import { useAsync } from '../api/useAsync'
import { formatDeg, formatHours, formatPercent } from './format'
import { type Scenario, toRangeQuery } from './scenario'

// Status of the Sun and Earth as four rows of the side panel (task 021).
// Warnings about data sources are in the header badges (`DataBadge`).

function changeText(body: BodySummary): string {
  if (body.hours_until_change === null) return 'no rise or set'
  const verb = body.visible_at_start ? 'sets' : 'rises'
  return `${verb} in ${formatHours(body.hours_until_change)}`
}

function BodyRow({
  label,
  kind,
  body,
}: {
  label: string
  kind: 'sun' | 'earth'
  body: BodySummary
}) {
  return (
    <div className={`body-row body-row-${kind}`}>
      <span className="label">{label}</span>
      <div className="body-row-lines">
        <p>
          {body.visible_at_start ? 'up at start' : 'down at start'}{' '}
          <span className="muted">· {formatPercent(body.visible_fraction)} of window</span>
        </p>
        <p>{changeText(body)}</p>
        <p className="muted num">max {formatDeg(body.max_el_deg)}</p>
      </div>
    </div>
  )
}

/** Data-source badges for the header: approximate ephemerides and a flat horizon. */
export function DataBadge({ scenario }: { scenario: Scenario }) {
  const query = toRangeQuery(scenario)
  const { data } = useAsync(() => api.summary(query), JSON.stringify(query))
  if (!data) return null

  const approximateEphemeris = data.meta.ephemeris === 'placeholder'
  const flatHorizon = data.meta.horizon === 'flat' || data.meta.horizon === 'mixed'
  if (!approximateEphemeris && !flatHorizon) return null

  return (
    <>
      {approximateEphemeris && (
        <span
          className="badge badge-warning"
          role="status"
          title="Sun and Earth positions come from an approximate model, not NASA SPICE kernels."
        >
          approx. ephemeris
        </span>
      )}
      {flatHorizon && (
        <span
          className="badge"
          title="Terrain is not modelled at this site; a flat horizon is assumed."
        >
          flat horizon
        </span>
      )}
    </>
  )
}

/** Summary of the active scenario — always visible in the side panel. */
export default function SummaryStrip({ scenario }: { scenario: Scenario }) {
  const query = toRangeQuery(scenario)
  const { data, error, loading } = useAsync(() => api.summary(query), JSON.stringify(query))

  if (error) {
    return (
      <section className="summary" aria-live="polite">
        <p className="error">Could not load summary: {error}</p>
      </section>
    )
  }

  if (!data) {
    return (
      <section className="summary" aria-busy={loading} aria-live="polite">
        <p className="muted">{loading ? 'Loading power and communications status…' : ''}</p>
      </section>
    )
  }

  return (
    <section className="summary" aria-live="polite">
      <BodyRow label="SUN" kind="sun" body={data.sun} />
      <BodyRow label="EARTH" kind="earth" body={data.earth} />
    </section>
  )
}
