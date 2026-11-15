import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import type { RangeQuery, Summary } from '../../api/types'
import { formatCoords, formatHours, formatUtc } from '../../app/format'
import type { Scenario, ViewProps } from '../../app/scenario'
import { toRangeQuery } from '../../app/scenario'
import { COMPARE_ROWS, rowBests } from './metrics'
import WindowLane from './WindowLane'
import './compare.css'

// Scenario comparison (tasks 008 and 021). The shell manages the list; here
// a single table: row = metric, column = scenario, plus window bands below it.

interface SummariesState {
  data: Record<string, Summary | null>
  errors: Record<string, string>
  loading: boolean
}

/**
 * Summaries of all scenarios at once. The previous data stays on screen
 * until the response arrives, so the table does not flicker when the scenario changes.
 */
function useSummaries(scenarios: Scenario[]): SummariesState {
  const key = JSON.stringify(
    scenarios.map((scenario) => ({ id: scenario.id, query: toRangeQuery(scenario) })),
  )
  const [state, setState] = useState<SummariesState>({ data: {}, errors: {}, loading: true })

  useEffect(() => {
    let cancelled = false
    const items = JSON.parse(key) as { id: string; query: RangeQuery }[]
    Promise.all(
      items.map(({ id, query }) =>
        api.summary(query).then(
          (summary) => ({ id, summary, error: null as string | null }),
          (error: unknown) => ({ id, summary: null, error: String(error) }),
        ),
      ),
    ).then((results) => {
      if (cancelled) return
      const data: Record<string, Summary | null> = {}
      const errors: Record<string, string> = {}
      for (const result of results) {
        data[result.id] = result.summary
        if (result.error) errors[result.id] = result.error
      }
      setState({ data, errors, loading: false })
    })
    return () => {
      cancelled = true
    }
  }, [key])

  return state
}

export default function CompareView({ scenarios, active, selectScenario }: ViewProps) {
  const { data, errors, loading } = useSummaries(scenarios)
  const summaries = scenarios.map((scenario) => data[scenario.id] ?? null)
  const maxHours = scenarios.reduce(
    (longest, scenario) => Math.max(longest, scenario.duration_hours),
    0,
  )
  const failed = scenarios.filter((scenario) => errors[scenario.id])

  return (
    <div className="compare">
      <header className="compare-head">
        <h2>Compare scenarios</h2>
        <p className="muted compare-hint">
          Click a column header to make that scenario active. Window bars share one time axis
          measured from each scenario&apos;s own start.
        </p>
      </header>

      {scenarios.length < 2 && (
        <p className="compare-note" role="status">
          Add a second scenario (+ in the left panel) to compare sites or dates.
        </p>
      )}

      {loading && !scenarios.some((scenario) => data[scenario.id]) && (
        <p className="muted" role="status">
          Loading summaries…
        </p>
      )}

      <div className="compare-scroll">
        <table className="compare-table">
          <thead>
            <tr>
              <th scope="col" className="compare-metric-head">
                <span className="label">Metric</span>
              </th>
              {scenarios.map((scenario) => (
                <th key={scenario.id} scope="col" className="compare-scenario-head">
                  <button
                    type="button"
                    className="compare-scenario"
                    aria-pressed={scenario.id === active.id}
                    onClick={() => selectScenario(scenario.id)}
                  >
                    <span className="compare-scenario-name">{scenario.name}</span>
                    <span className="num compare-scenario-meta">
                      {formatCoords(scenario.lat_deg, scenario.lon_deg)}
                    </span>
                    <span className="num compare-scenario-meta">
                      {formatUtc(scenario.start_utc)}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARE_ROWS.map((row) => {
              const bests = rowBests(row, summaries)
              return (
                <tr key={row.id}>
                  <th scope="row" className="compare-metric-name">
                    {row.label}
                  </th>
                  {scenarios.map((scenario, index) => {
                    const summary = summaries[index]
                    return (
                      <td
                        key={scenario.id}
                        className={`compare-value${bests[index] ? ' compare-best' : ''}`}
                      >
                        <span className="num">
                          {summary ? row.format(summary) : '—'}
                        </span>
                        {bests[index] && (
                          <span
                            className="compare-best-dot"
                            role="img"
                            aria-label="best in this row"
                          />
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {failed.length > 0 && (
        <ul className="compare-errors">
          {failed.map((scenario) => (
            <li key={scenario.id} className="compare-error">
              Summary failed for {scenario.name}: {errors[scenario.id]}
            </li>
          ))}
        </ul>
      )}

      <section className="compare-lanes" aria-label="Visibility windows by scenario">
        <h3 className="label">Visibility windows</h3>
        {scenarios.map((scenario) => (
          <WindowLane
            key={scenario.id}
            scenario={scenario}
            maxHours={maxHours}
            active={scenario.id === active.id}
          />
        ))}
        <div className="compare-axis num" aria-hidden="true">
          <span>0 h</span>
          <span>{formatHours(maxHours / 2, 0)}</span>
          <span>{formatHours(maxHours, 0)}</span>
        </div>
      </section>
    </div>
  )
}
