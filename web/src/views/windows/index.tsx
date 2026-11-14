import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { useAsync } from '../../api/useAsync'
import type { WindowsResponse } from '../../api/types'
import type { ViewProps } from '../../app/scenario'
import CalendarHeatmap from './CalendarHeatmap'
import CyclesLegend from './CyclesLegend'
import MatchesList from './MatchesList'
import RequirementsPanel from './RequirementsPanel'
import SlipAnalyzer from './SlipAnalyzer'
import {
  DEFAULT_REQUIREMENTS,
  filterMatches,
  passes,
  toQuery,
  validateRequirements,
  type MissionRequirements,
} from './requirements'
import './windows.css'

/** Ile czekamy, zanim zmiana wymagań trafi do zapytania (ms). */
const DEBOUNCE_MS = 400

/** Opóźnia wartość - formularz nie wysyła zapytania przy każdym znaku. */
function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}

/**
 * Widok wyszukiwarki okien (015): panel wymagań, ranking dopasowań i symulator
 * opóźnienia. Lista dopasowań filtruje siatkę z API lokalnie, więc zaostrzenie
 * progu widać natychmiast; zapytanie odświeża się po debounce.
 */
export default function WindowsView({ active, applyWindow }: ViewProps) {
  const searchStart = `${active.start_utc.slice(0, 4)}-01-01T00:00:00Z`
  const searchEnd = `${Number(active.start_utc.slice(0, 4)) + 1}-01-01T00:00:00Z`

  const [requirements, setRequirements] = useState<MissionRequirements>(() => ({
    ...DEFAULT_REQUIREMENTS,
    duration_hours: active.duration_hours,
  }))
  const [slipDays, setSlipDays] = useState(7)

  const debouncedRequirements = useDebounced(requirements, DEBOUNCE_MS)
  const debouncedSlipDays = useDebounced(slipDays, DEBOUNCE_MS)

  const requirementsValid = Object.keys(validateRequirements(debouncedRequirements)).length === 0
  const query = toQuery(
    debouncedRequirements,
    active.lat_deg,
    active.lon_deg,
    searchStart,
    searchEnd,
    { reference_start_utc: active.start_utc, slip_days: debouncedSlipDays },
  )
  const queryKey = requirementsValid ? JSON.stringify(query) : 'invalid-requirements'

  const { data, error, loading } = useAsync<WindowsResponse | null>(
    () => (requirementsValid ? api.windows(query) : Promise.resolve(null)),
    queryKey,
  )

  // Filtrowanie natychmiastowe - używa bieżących wymagań, nie opóźnionych.
  const liveGrid = data
    ? data.grid.map((slot) => ({
        ...slot,
        passes_requirements: passes(slot, requirements),
      }))
    : []
  const matches = data ? filterMatches(liveGrid, requirements) : []

  return (
    <div className="windows">
      <header className="windows-header">
        <h2>Landing windows</h2>
        <p className="windows-meta">
          Search {searchStart.slice(0, 10)} → {searchEnd.slice(0, 10)} · {active.name} (
          {active.lat_deg.toFixed(3)}°, {active.lon_deg.toFixed(3)}°)
          {data && (
            <> · ephemeris “{data.meta.ephemeris}”, horizon “{data.meta.horizon}”</>
          )}
        </p>
      </header>

      {error && <p className="windows-error">Could not load windows: {error}</p>}
      {!data && !error && <p className="windows-loading">{loading ? 'Loading window search…' : ''}</p>}

      {data && (
        <div className="windows-viz">
          <CalendarHeatmap
            grid={liveGrid}
            durationHours={requirements.duration_hours}
            onSelect={applyWindow}
            selectedStartUtc={active.start_utc}
          />
          <CyclesLegend
            cycles={data.cycles_summary}
            focus={liveGrid.find((slot) => slot.start_utc === active.start_utc) ?? null}
          />
        </div>
      )}

      <div className="windows-layout">
        <div className="windows-column">
          <RequirementsPanel value={requirements} onChange={setRequirements} />
        </div>

        <div className="windows-column">
          {data && (
            <>
              <p className="windows-hint" role="status">
                Grid: {data.grid.length} lunar days searched · synodic month{' '}
                {data.cycles_summary.synodic_month_days} d
              </p>

              <MatchesList
                matches={matches}
                durationHours={requirements.duration_hours}
                onUse={applyWindow}
              />

              <SlipAnalyzer
                referenceStartUtc={active.start_utc}
                requirements={requirements}
                grid={data.grid}
                slipAnalysis={data.slip_analysis}
                slipDays={slipDays}
                onSlipDaysChange={setSlipDays}
                onUse={applyWindow}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
