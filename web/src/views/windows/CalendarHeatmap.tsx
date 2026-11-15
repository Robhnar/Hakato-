import { useMemo, useState } from 'react'
import type { CalendarSlot } from '../../api/types'
import { formatDeg, formatHours, formatPercent, formatUtcDate } from '../../app/format'
import { scoreRampCss } from '../../app/scale'
import { LUNAR_DAY_HOURS } from '../../app/scenario'
import {
  HEAT_METRICS,
  colorForValue,
  colorPosition,
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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
/** Threshold for switching the text to black; black/white gives >= 4.5:1 across the whole scale (task 021/9). */
const DARK_TEXT_FROM = 0.48

function monthOf(iso: string): string {
  const month = Number(iso.slice(5, 7))
  return MONTHS[month - 1] ?? '—'
}

function scoreText(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : '—'
}

/** Heatmap "start date × parameter" (tasks 014 and 021). */
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

  // Inverted metrics (e.g. the longest night) have the lighter, i.e. better, color
  // on the left; hence the legend gradient runs the other way.
  const ramp = meta.invert ? scoreRampCss().replace('to right', 'to left') : scoreRampCss()

  return (
    <section className="windows-heat" aria-label="Landing window heatmap">
      <div className="windows-heat-head">
        <h3 className="windows-panel-title">Heatmap</h3>
        <label className="windows-heat-metric">
          <span className="label">Metric</span>
          <select value={metric} onChange={(event) => setMetric(event.target.value as HeatMetric)}>
            {HEAT_METRICS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="windows-heat-legend">
        <span className="num windows-heat-bound">{meta.format(min)}</span>
        <span className="windows-heat-ramp" style={{ background: ramp }} aria-hidden="true" />
        <span className="num windows-heat-bound">{meta.format(max)}</span>
        <span className="windows-heat-legend-note">lighter = better</span>
      </div>

      <div className="windows-heat-years">
        {years.map(({ year, slots }) => (
          <div key={year} className="windows-heat-year">
            <span className="num windows-heat-year-label">{year}</span>
            <div className="windows-heat-row">
              {slots.map((slot) => {
                const value = metricValue(slot, metric)
                const position = colorPosition(value, min, max, meta.invert)
                const selected = slot.start_utc === selectedStartUtc
                const labelText = `${formatUtcDate(slot.start_utc)} · ${meta.format(value)}${
                  slot.passes_requirements ? ' · meets requirements' : ''
                }`
                return (
                  <button
                    key={slot.start_utc}
                    type="button"
                    className={`windows-heat-cell${slot.passes_requirements ? ' pass' : ''}${
                      selected ? ' selected' : ''
                    }`}
                    style={{
                      background: colorForValue(value, min, max, meta.invert),
                      color: position > DARK_TEXT_FROM ? '#000' : '#fff',
                    }}
                    title={labelText}
                    aria-label={`Lunar day ${slot.cycles.lunar_day_index}, ${labelText}`}
                    aria-pressed={selected}
                    onMouseEnter={() => setHover(slot)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(slot)}
                    onBlur={() => setHover(null)}
                    onClick={() => onSelect(slot.start_utc, durationHours)}
                  >
                    <span className="windows-heat-cell-label">{monthOf(slot.start_utc)}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {focus && (
        <div className="windows-heat-detail" aria-live="polite">
          <div className="windows-heat-detail-scroll">
            <table className="windows-heat-detail-table">
              <thead>
                <tr>
                  <th scope="col">Start</th>
                  <th scope="col">Sunlight</th>
                  <th scope="col">Sun %</th>
                  <th scope="col">Longest night</th>
                  <th scope="col">Earth link</th>
                  <th scope="col">Max Sun</th>
                  <th scope="col">Score</th>
                  <th scope="col">Requirements</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <span className="num">
                      {formatUtcDate(focus.start_utc)} → {formatUtcDate(focus.end_utc)}
                    </span>
                  </td>
                  <td className="num">{formatHours(focus.sunlight_hours)}</td>
                  <td className="num">{formatPercent(focus.sun_visible_fraction)}</td>
                  <td className="num">{formatHours(focus.max_darkness_hours)}</td>
                  <td className="num">{formatPercent(focus.earth_visible_fraction)}</td>
                  <td className="num">{formatDeg(focus.max_sun_el_deg)}</td>
                  <td className="num">{scoreText(focus.score)}</td>
                  <td className={focus.passes_requirements ? 'windows-ok' : 'windows-bad'}>
                    {focus.passes_requirements ? 'Pass' : 'Fail'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="num windows-heat-cycles">
            seasonal {focus.cycles.seasonal_phase_deg.toFixed(1)}° · draconic year{' '}
            {focus.cycles.draconic_year_phase_deg.toFixed(1)}° · lunar day #
            {focus.cycles.lunar_day_index}
          </p>
        </div>
      )}
    </section>
  )
}
