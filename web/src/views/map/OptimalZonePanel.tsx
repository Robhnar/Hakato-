// Panel warstwy optymalnego punktu (zadanie 019). Widoczny tylko przy
// włączonej nakładce ON. Pokazuje presety wag, kartę wyznaczonego miejsca,
// ranking kandydatów i legendę stref.

import {
  normalizeWeights,
  WEIGHT_PRESETS,
  ZONE_COLORS,
  ZONE_LABELS,
  ZONE_ORDER,
} from './heatmap'
import type { OptimalSiteResponse, OptimalWeights } from './optimalContract'

interface Props {
  data: OptimalSiteResponse | null
  loading: boolean
  error: string | null
  weights: OptimalWeights
  onWeightsChange: (weights: OptimalWeights) => void
  onMove: (lat_deg: number, lon_deg: number) => void
}

function latitude(lat_deg: number): string {
  return `${Math.abs(lat_deg).toFixed(1)}°${lat_deg >= 0 ? 'N' : 'S'}`
}

function longitude(lon_deg: number): string {
  return `${Math.abs(lon_deg).toFixed(1)}°${lon_deg >= 0 ? 'E' : 'W'}`
}

function percent(fraction: number): string {
  return Number.isFinite(fraction) ? `${Math.round(fraction * 100)}%` : '—'
}

function hours(value: number): string {
  return Number.isFinite(value) ? `${value.toFixed(1)} h` : '—'
}

function sameWeights(a: OptimalWeights, b: OptimalWeights): boolean {
  return (
    Math.abs(a.w_sun - b.w_sun) < 1e-6 &&
    Math.abs(a.w_earth - b.w_earth) < 1e-6 &&
    Math.abs(a.w_overlap - b.w_overlap) < 1e-6
  )
}

/** Krótki opis wag do nagłówka panelu. */
function weightsLabel(weights: OptimalWeights): string {
  const w = normalizeWeights(weights)
  return `Sun ${percent(w.w_sun)} · Earth ${percent(w.w_earth)} · Overlap ${percent(w.w_overlap)}`
}

export default function OptimalZonePanel({
  data,
  loading,
  error,
  weights,
  onWeightsChange,
  onMove,
}: Props) {
  return (
    <section className="optimal-panel" aria-label="Optimal landing zone">
      <div className="optimal-panel-head">
        <h3>Optimal landing zone</h3>
        <p className="optimal-weights">{weightsLabel(weights)}</p>
      </div>

      <div className="optimal-presets" role="group" aria-label="Weight profile presets">
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

      {error && (
        <p className="optimal-status error" role="alert">
          Optimal zone data unavailable: {error}
        </p>
      )}
      {!data && !error && loading && (
        <p className="optimal-status" role="status">
          Searching for the optimal zone…
        </p>
      )}
      {data && loading && (
        <p className="optimal-status" role="status">
          Updating overlay…
        </p>
      )}

      {data && (
        <>
          <div className="optimal-card">
            <div className="optimal-card-head">
              <h4>{data.optimal.name}</h4>
              <span className="optimal-score">{data.optimal.score.toFixed(1)} / 100</span>
            </div>
            <p className="optimal-coords">
              {latitude(data.optimal.lat_deg)}, {longitude(data.optimal.lon_deg)}
              {data.optimal.elevation_m != null && Number.isFinite(data.optimal.elevation_m)
                ? ` · ${Math.round(data.optimal.elevation_m)} m elevation`
                : ''}
            </p>

            <dl className="optimal-metrics">
              <div className="optimal-metric">
                <dt>Sunlight</dt>
                <dd>
                  {percent(data.optimal.sun_visible_fraction)} / {hours(data.optimal.sunlight_hours)}
                </dd>
              </div>
              <div className="optimal-metric">
                <dt>Earth link</dt>
                <dd>
                  {percent(data.optimal.earth_visible_fraction)} / {hours(data.optimal.earth_hours)}
                </dd>
              </div>
              <div className="optimal-metric">
                <dt>Sweet spot (overlap)</dt>
                <dd>
                  {percent(data.optimal.overlap_fraction)} / {hours(data.optimal.overlap_hours)}
                </dd>
              </div>
              <div className="optimal-metric">
                <dt>Max darkness</dt>
                <dd>{hours(data.optimal.max_darkness_hours)}</dd>
              </div>
            </dl>

            <button
              type="button"
              className="optimal-move"
              onClick={() => onMove(data.optimal.lat_deg, data.optimal.lon_deg)}
            >
              Move active scenario to optimal zone
            </button>
          </div>

          {data.ranking.length > 0 && (
            <ol className="optimal-ranking" aria-label="Top candidates">
              {data.ranking.slice(0, 5).map((candidate) => (
                <li key={candidate.id}>
                  <span>
                    {candidate.name} · {latitude(candidate.lat_deg)}, {longitude(candidate.lon_deg)}
                  </span>
                  <span className="optimal-ranking-score">{candidate.score.toFixed(1)}</span>
                </li>
              ))}
            </ol>
          )}
        </>
      )}

      <ul className="optimal-legend" aria-label="Overlay legend">
        {ZONE_ORDER.map((zone) => {
          const [r, g, b, a] = ZONE_COLORS[zone]
          return (
            <li key={zone}>
              <span
                className="optimal-swatch"
                style={{ background: `rgba(${r}, ${g}, ${b}, ${a / 255})` }}
                aria-hidden="true"
              />
              {ZONE_LABELS[zone]}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
