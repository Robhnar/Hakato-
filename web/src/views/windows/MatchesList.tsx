import type { CalendarSlot } from '../../api/types'
import { formatDeg, formatHours, formatPercent, formatUtc } from '../../app/format'
import { scoreColor } from '../../app/scale'
import './windows.css'

interface Props {
  matches: CalendarSlot[]
  durationHours: number
  onUse: (startUtc: string, durationHours: number) => void
  limit?: number
}

const DASH = '—'

function formatScore(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : DASH
}

/** Ranking okien spełniających wymagania (zadania 015 i 021). */
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
        <h3 className="windows-panel-title">Matching windows</h3>
        <span className="num windows-matches-count">{countLabel}</span>
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
                    <time className="num" dateTime={slot.start_utc}>
                      {formatUtc(slot.start_utc)}
                    </time>
                  </td>
                  <td className="windows-num">{formatHours(slot.sunlight_hours)}</td>
                  <td className="windows-num">{formatHours(slot.max_darkness_hours)}</td>
                  <td className="windows-num">{formatDeg(slot.sun_el_at_start_deg)}</td>
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
                  <td className="windows-num">
                    <span className="windows-score-cell">
                      <span
                        className="windows-score-bar"
                        style={{ background: scoreColor(slot.score / 100) }}
                        aria-hidden="true"
                      />
                      <span>{formatScore(slot.score)}</span>
                    </span>
                  </td>
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
