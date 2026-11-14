import type { CalendarSlot } from './contract'
import './windows.css'

interface Props {
  matches: CalendarSlot[]
  durationHours: number
  onUse: (startUtc: string, durationHours: number) => void
  limit?: number
}

const DASH = '—'

function formatUtc(iso: string): string {
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return iso || DASH
  const value = new Date(ms).toISOString()
  return `${value.slice(0, 10)} ${value.slice(11, 16)} UTC`
}

function formatHours(value: number): string {
  return Number.isFinite(value) ? `${value.toFixed(1)} h` : DASH
}

function formatDegrees(value: number): string {
  return Number.isFinite(value) ? `${value.toFixed(1)}°` : DASH
}

function formatPercent(fraction: number): string {
  return Number.isFinite(fraction) ? `${Math.round(fraction * 100)}%` : DASH
}

function formatScore(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : DASH
}

/** Ranking okien spełniających wymagania (zadanie 015). */
export default function MatchesList({ matches, durationHours, onUse, limit }: Props) {
  const rows =
    limit === undefined ? matches : matches.slice(0, Math.max(0, Math.trunc(limit)))
  const truncated = rows.length < matches.length
  const countLabel = truncated
    ? `Showing ${rows.length} of ${matches.length} matches`
    : `${matches.length} ${matches.length === 1 ? 'match' : 'matches'}`

  return (
    <section className="windows-matches" aria-label="Matching windows">
      <div className="windows-matches-head">
        <h3>Matching windows</h3>
        <span className="windows-matches-count">{countLabel}</span>
      </div>

      {rows.length === 0 ? (
        <p className="windows-empty">
          {matches.length === 0
            ? 'No windows match the current requirements. Relax the thresholds or search a longer period.'
            : 'No windows to show within the current limit.'}
        </p>
      ) : (
        <div className="windows-table-wrap">
          <table className="windows-matches-table" aria-label="Matching landing windows sorted by score">
            <thead>
              <tr>
                <th scope="col" className="windows-num">
                  Rank
                </th>
                <th scope="col">Start (UTC)</th>
                <th scope="col" className="windows-num">
                  Sunlight
                </th>
                <th scope="col" className="windows-num">
                  Longest night
                </th>
                <th scope="col" className="windows-num">
                  Sun at landing
                </th>
                <th scope="col" className="windows-num">
                  Earth link
                </th>
                <th scope="col" className="windows-num">
                  Score
                </th>
                <th scope="col">
                  <span className="windows-visually-hidden">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((slot, index) => (
                <tr key={`${slot.start_utc}-${index}`}>
                  <td className="windows-num">{index + 1}</td>
                  <td>
                    <time dateTime={slot.start_utc}>{formatUtc(slot.start_utc)}</time>
                  </td>
                  <td className="windows-num">{formatHours(slot.sunlight_hours)}</td>
                  <td className="windows-num">{formatHours(slot.max_darkness_hours)}</td>
                  <td className="windows-num">{formatDegrees(slot.sun_el_at_start_deg)}</td>
                  <td
                    className="windows-num"
                    title={
                      slot.earth_visible_at_start
                        ? 'Earth is visible at landing'
                        : 'Earth is below the horizon at landing'
                    }
                  >
                    {formatPercent(slot.earth_visible_fraction)}
                  </td>
                  <td className="windows-num">{formatScore(slot.score)}</td>
                  <td className="windows-table-action">
                    <button
                      type="button"
                      onClick={() => onUse(slot.start_utc, durationHours)}
                      aria-label={`Use window starting ${formatUtc(slot.start_utc)}`}
                    >
                      Use window
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
