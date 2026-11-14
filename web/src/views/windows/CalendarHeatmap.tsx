import { useMemo, useState } from 'react'
import type { CalendarSlot } from '../../api/types'
import { LUNAR_DAY_HOURS } from '../../app/scenario'
import {
  HEAT_METRICS,
  colorForValue,
  groupByStartYear,
  metricValue,
  scaleBounds,
  type HeatMetric,
} from './heatmap'

interface Props {
  grid: CalendarSlot[]
  durationHours?: number
  onSelect: (start_utc: string, duration_hours?: number) => void
  selectedStartUtc?: string
}

/** Mapa cieplna „data startu × parametr” (zadanie 014). */
export default function CalendarHeatmap({
  grid,
  durationHours = LUNAR_DAY_HOURS,
  onSelect,
  selectedStartUtc,
}: Props) {
  const [metric, setMetric] = useState<HeatMetric>('score')
  const [hover, setHover] = useState<CalendarSlot | null>(null)
  const meta = HEAT_METRICS.find((m) => m.id === metric) ?? HEAT_METRICS[0]

  const { min, max } = useMemo(() => {
    const values = grid.map((slot) => metricValue(slot, metric))
    return scaleBounds(values)
  }, [grid, metric])

  const years = useMemo(() => groupByStartYear(grid), [grid])
  const focus = hover ?? grid.find((s) => s.start_utc === selectedStartUtc) ?? null

  return (
    <section className="windows-heat" aria-label="Landing window heatmap">
      <div className="windows-heat-head">
        <h3>Heatmap</h3>
        <label className="windows-heat-metric">
          Metric
          <select value={metric} onChange={(event) => setMetric(event.target.value as HeatMetric)}>
            {HEAT_METRICS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="windows-heat-legend" aria-hidden>
        <span>worse</span>
        <div className="windows-heat-ramp" />
        <span>better</span>
      </div>

      <div className="windows-heat-years">
        {years.map(({ year, slots }) => (
          <div key={year} className="windows-heat-year">
            <div className="windows-heat-year-label">{year}</div>
            <div className="windows-heat-row" role="list">
              {slots.map((slot) => {
                const value = metricValue(slot, metric)
                const background = colorForValue(value, min, max, meta.invert)
                const selected = slot.start_utc === selectedStartUtc
                return (
                  <button
                    key={slot.start_utc}
                    type="button"
                    role="listitem"
                    className={`windows-heat-cell${slot.passes_requirements ? ' pass' : ''}${selected ? ' selected' : ''}`}
                    style={{ background }}
                    title={`${slot.start_utc.slice(0, 10)} · ${meta.format(value)}${slot.passes_requirements ? ' · meets requirements' : ''}`}
                    aria-pressed={selected}
                    onMouseEnter={() => setHover(slot)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(slot)}
                    onBlur={() => setHover(null)}
                    onClick={() => onSelect(slot.start_utc, durationHours)}
                  >
                    <span className="windows-heat-cell-label">{slot.cycles.lunar_day_index}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {focus && (
        <div className="windows-heat-detail" aria-live="polite">
          <strong>
            {focus.start_utc.replace('T', ' ').replace('Z', ' UTC')} →{' '}
            {focus.end_utc.slice(0, 16).replace('T', ' ')}
          </strong>
          <p>
            Sun {focus.sunlight_hours.toFixed(0)} h ({(focus.sun_visible_fraction * 100).toFixed(0)}%) ·
            longest night {focus.max_darkness_hours.toFixed(0)} h · Earth{' '}
            {(focus.earth_visible_fraction * 100).toFixed(0)}% · max Sun {focus.max_sun_el_deg.toFixed(2)}° ·
            score {focus.score.toFixed(2)}
            {focus.passes_requirements ? ' · requirements: pass' : ' · requirements: fail'}
          </p>
          <p className="windows-hint">
            Seasonal phase {focus.cycles.seasonal_phase_deg.toFixed(1)}° · draconic year phase{' '}
            {focus.cycles.draconic_year_phase_deg.toFixed(1)}° · lunar day #
            {focus.cycles.lunar_day_index}
          </p>
        </div>
      )}
    </section>
  )
}
