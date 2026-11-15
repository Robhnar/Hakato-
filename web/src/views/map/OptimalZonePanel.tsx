// Optimization Overlay panel (task 021): mission profile, weight sliders, the selected
// candidate, a ranking with ties and a legend. Docked on the right side of the globe.

import type { OptimalWeights, OptimalSiteResponse } from '../../api/types'
import { formatCoords, formatHours, formatPercent, wrapLon } from '../../app/format'
import { scoreColor, scoreRampCss } from '../../app/scale'
import { setWeight, weightsToPercent, type RankedCandidate } from './candidates'
import { WEIGHT_PRESETS, ZONE_COLORS, ZONE_LABELS, ZONE_ORDER } from './heatmap'

interface Props {
  data: OptimalSiteResponse | null
  loading: boolean
  error: string | null
  weights: OptimalWeights
  onWeightsChange: (weights: OptimalWeights) => void
  ranked: RankedCandidate[]
  selectedId: string | null
  highlightId: string | null
  onSelect: (id: string) => void
  onHighlight: (id: string | null) => void
  onMove: (lat_deg: number, lon_deg: number) => void
  onClose: () => void
  onRetry: () => void
}

const SLIDERS = [
  { key: 'w_sun', pct: 'sun', label: 'Sun power', color: 'var(--sun)' },
  { key: 'w_earth', pct: 'earth', label: 'Earth link', color: 'var(--earth)' },
  { key: 'w_overlap', pct: 'overlap', label: 'Both at once', color: 'var(--ok)' },
] as const

function sameWeights(a: OptimalWeights, b: OptimalWeights): boolean {
  return (
    Math.abs(a.w_sun - b.w_sun) < 1e-6 &&
    Math.abs(a.w_earth - b.w_earth) < 1e-6 &&
    Math.abs(a.w_overlap - b.w_overlap) < 1e-6
  )
}

function rankText(row: RankedCandidate): string {
  return `${row.tied ? '=' : ''}${row.rank}`
}

function Bar({ label, color, fraction, hours }: { label: string; color: string; fraction: number; hours: number }) {
  return (
    <div className="optimal-bar">
      <span className="optimal-bar-label">{label}</span>
      <span className="optimal-bar-track" aria-hidden="true">
        <span style={{ width: `${Math.round(Math.min(1, Math.max(0, fraction)) * 100)}%`, background: color }} />
      </span>
      <span className="num">
        {formatPercent(fraction)} · {formatHours(hours)}
      </span>
    </div>
  )
}

export default function OptimalZonePanel({
  data,
  loading,
  error,
  weights,
  onWeightsChange,
  ranked,
  selectedId,
  highlightId,
  onSelect,
  onHighlight,
  onMove,
  onClose,
  onRetry,
}: Props) {
  const percent = weightsToPercent(weights)
  const selected = ranked.find((row) => row.candidate.id === selectedId) ?? null
  const busy = loading && data !== null

  return (
    <aside className="optimal-panel" aria-label="Optimal zones">
      <div className="optimal-panel-head">
        <h3 className="label">Optimal zones</h3>
        {busy && (
          <span className="muted" role="status">
            Updating…
          </span>
        )}
        <button type="button" aria-label="Hide optimal zones" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="optimal-body" aria-busy={busy} style={{ opacity: busy ? 0.5 : 1 }}>
        <p className="label">Mission profile</p>
        <div className="optimal-presets" role="group" aria-label="Mission profile">
          {WEIGHT_PRESETS.map((preset) => {
            const active = sameWeights(weights, preset.weights)
            return (
              <button
                key={preset.id}
                type="button"
                aria-pressed={active}
                className={active ? 'selected' : ''}
                onClick={() => onWeightsChange({ ...preset.weights })}
              >
                {preset.label}
              </button>
            )
          })}
        </div>

        {SLIDERS.map(({ key, pct, label, color }) => (
          <label key={key} className="optimal-slider">
            <span className="optimal-slider-label">
              <span className="optimal-dot" style={{ background: color }} aria-hidden="true" />
              {label}
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={percent[pct]}
              onChange={(event) => onWeightsChange(setWeight(weights, key, Number(event.target.value)))}
            />
            <span className="num">{percent[pct]}%</span>
          </label>
        ))}

        {error && (
          <div className="optimal-status error" role="alert">
            Could not score sites: {error}{' '}
            <button type="button" onClick={onRetry}>
              Retry
            </button>
          </div>
        )}
        {!data && !error && loading && (
          <p className="optimal-status muted" role="status">
            Scoring sites…
          </p>
        )}

        {data && selected && (
          <section className="optimal-card" aria-label="Selected site">
            <p className="label">
              <span className="num">#{rankText(selected)}</span>
            </p>
            <h4>{selected.label}</h4>
            <p className="num optimal-coords">
              {formatCoords(selected.candidate.lat_deg, selected.candidate.lon_deg)}
              {selected.candidate.elevation_m != null && Number.isFinite(selected.candidate.elevation_m)
                ? ` · ${Math.round(selected.candidate.elevation_m)} m`
                : ''}
            </p>
            <p className="optimal-score num">
              {selected.candidate.score.toFixed(1)} <span className="muted">/ 100</span>
            </p>
            <Bar label="Sun" color="var(--sun)" fraction={selected.candidate.sun_visible_fraction} hours={selected.candidate.sunlight_hours} />
            <Bar label="Earth" color="var(--earth)" fraction={selected.candidate.earth_visible_fraction} hours={selected.candidate.earth_hours} />
            <Bar label="Both" color="var(--ok)" fraction={selected.candidate.overlap_fraction} hours={selected.candidate.overlap_hours} />
            <p className="optimal-darkness">
              <span className="muted">Longest darkness</span>{' '}
              <span className="num">{formatHours(selected.candidate.max_darkness_hours)}</span>
            </p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => onMove(selected.candidate.lat_deg, wrapLon(selected.candidate.lon_deg))}
            >
              Move scenario here
            </button>
          </section>
        )}

        {data && ranked.length === 0 && <p className="muted">No candidate sites returned for this window.</p>}
        {ranked.length > 0 && (
          <>
            <table className="optimal-ranking" aria-label="Ranking">
              <tbody>
                {ranked.slice(0, 8).map((row) => (
                  <tr key={row.candidate.id} className={row.candidate.id === selectedId ? 'is-selected' : ''}>
                    <td colSpan={4}>
                      <button
                        type="button"
                        className="optimal-row"
                        onMouseEnter={() => onHighlight(row.candidate.id)}
                        onMouseLeave={() => onHighlight(null)}
                        onFocus={() => onHighlight(row.candidate.id)}
                        onBlur={() => onHighlight(null)}
                        onClick={() => onSelect(row.candidate.id)}
                        aria-current={row.candidate.id === selectedId}
                        data-highlight={row.candidate.id === highlightId}
                      >
                        <span className="num optimal-rank">{rankText(row)}</span>
                        <span className="optimal-name">{row.label}</span>
                        <span className="optimal-minibar" aria-hidden="true">
                          <span style={{ width: `${Math.min(100, Math.max(0, row.candidate.score))}%`, background: scoreColor(row.candidate.score / 100) }} />
                        </span>
                        <span className="num">{row.candidate.score.toFixed(1)}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="muted">{ranked.length} sites scored · catalogue + polar grid</p>
          </>
        )}

        <ul className="optimal-legend" aria-label="Overlay legend">
          {ZONE_ORDER.map((zone) => {
            const [r, g, b, a] = ZONE_COLORS[zone]
            return (
              <li key={zone}>
                <span className="optimal-swatch" style={{ background: `rgba(${r}, ${g}, ${b}, ${a / 255})` }} aria-hidden="true" />
                {ZONE_LABELS[zone]}
              </li>
            )
          })}
        </ul>
        <div className="optimal-ramp">
          <span className="num">0</span>
          <span className="optimal-ramp-bar" style={{ background: scoreRampCss() }} aria-hidden="true" />
          <span className="num">100</span>
        </div>
        <p className="muted">Zones show this instant on a smooth sphere.</p>
        <p className="muted">Scores cover the whole window and include terrain.</p>
      </div>
    </aside>
  )
}
