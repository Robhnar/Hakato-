import { api } from '../../api/client'
import { useAsync } from '../../api/useAsync'
import { LUNAR_DAY_HOURS, type ViewProps } from '../../app/scenario'
import type { CalendarSlot } from '../../api/types'
import './windows.css'

/** Szkielet zakładki Windows (011). Mapa cieplna i formularz: 014/015. */
export default function WindowsView({ active, applyWindow }: ViewProps) {
  const searchStart = `${active.start_utc.slice(0, 4)}-01-01T00:00:00Z`
  const searchEnd = `${Number(active.start_utc.slice(0, 4)) + 1}-01-01T00:00:00Z`
  const queryKey = JSON.stringify({
    lat: active.lat_deg,
    lon: active.lon_deg,
    searchStart,
    searchEnd,
    duration: active.duration_hours,
  })
  const { data, error, loading } = useAsync(
    () =>
      api.windows({
        lat_deg: active.lat_deg,
        lon_deg: active.lon_deg,
        search_start_utc: searchStart,
        search_end_utc: searchEnd,
        duration_hours: active.duration_hours,
      }),
    queryKey,
  )

  return (
    <div className="windows">
      <h2>Landing windows</h2>
      <p className="windows-lead">
        Contract stub for multi-year search (tasks 012–015). Fixture / API returns sample lunar-day
        slots for the active site. Apply a match to set the active scenario start.
      </p>
      <p className="windows-meta">
        Search {searchStart.slice(0, 10)} → {searchEnd.slice(0, 10)} · {active.name} (
        {active.lat_deg.toFixed(3)}°, {active.lon_deg.toFixed(3)}°)
      </p>

      {error && <p className="windows-error">Could not load windows: {error}</p>}
      {!data && !error && <p className="windows-loading">{loading ? 'Loading window search…' : ''}</p>}

      {data && (
        <>
          <p className="windows-hint" role="status">
            ephemeris “{data.meta.ephemeris}”, horizon “{data.meta.horizon}” · synodic month{' '}
            {data.cycles_summary.synodic_month_days} d
          </p>

          <section aria-label="Matching windows">
            <h3>Matches ({data.matches.length})</h3>
            <ul className="windows-list">
              {data.matches.map((slot) => (
                <li key={slot.start_utc}>
                  <SlotRow slot={slot} onApply={() => applyWindow(slot.start_utc, LUNAR_DAY_HOURS)} />
                </li>
              ))}
            </ul>
          </section>

          <section aria-label="Full grid">
            <h3>Grid ({data.grid.length})</h3>
            <ul className="windows-list windows-list-muted">
              {data.grid.map((slot) => (
                <li key={`grid-${slot.start_utc}`}>
                  <SlotRow
                    slot={slot}
                    onApply={() => applyWindow(slot.start_utc, LUNAR_DAY_HOURS)}
                    showPass
                  />
                </li>
              ))}
            </ul>
          </section>

          {data.slip_analysis && (
            <section className="windows-slip" aria-label="Slip analysis stub">
              <h3>Slip analysis (stub)</h3>
              <p>{data.slip_analysis.explanation}</p>
              <p className="windows-hint">
                Δ sunlight {data.slip_analysis.delta_sunlight_hours.toFixed(1)} h · Δ darkness{' '}
                {data.slip_analysis.delta_max_darkness_hours.toFixed(1)} h · Δ Earth fraction{' '}
                {data.slip_analysis.delta_earth_fraction.toFixed(3)}
              </p>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function SlotRow({
  slot,
  onApply,
  showPass = false,
}: {
  slot: CalendarSlot
  onApply: () => void
  showPass?: boolean
}) {
  return (
    <div className="windows-slot">
      <div>
        <strong>{slot.start_utc.replace('T', ' ').replace('Z', ' UTC')}</strong>
        <span className="windows-hint">
          {' '}
          · sun {slot.sunlight_hours.toFixed(0)} h ({(slot.sun_visible_fraction * 100).toFixed(0)}%) ·
          Earth {(slot.earth_visible_fraction * 100).toFixed(0)}% · score {slot.score.toFixed(2)}
          {showPass ? (slot.passes_requirements ? ' · pass' : ' · fail') : ''}
        </span>
      </div>
      <button type="button" onClick={onApply}>
        Apply to scenario
      </button>
    </div>
  )
}
