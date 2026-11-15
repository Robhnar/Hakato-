import type { CalendarSlot, CyclesSummary } from '../../api/types'

interface Props {
  cycles: CyclesSummary
  focus: CalendarSlot | null
}

const PERIODS: { key: keyof CyclesSummary; label: string; hint: string }[] = [
  {
    key: 'synodic_month_days',
    label: 'Synodic month',
    hint: 'Lunar day (~29.5 d) — successive landing windows on the heatmap.',
  },
  {
    key: 'draconic_year_days',
    label: 'Draconic / polar season',
    hint: 'Polar seasons (~347 d, ±1.5° Sun) — long swings in sunlight at the poles.',
  },
  {
    key: 'libration_month_days',
    label: 'Earth libration',
    hint: 'Earth’s apparent wobble (~27.2 d) — comms windows breathe in and out.',
  },
  {
    key: 'nodal_precession_years',
    label: 'Nodal precession',
    hint: '18.6-year cycle of the lunar orbit nodes — slow climate of polar lighting.',
  },
]

/** Astronomical cycles below the heatmap (tasks 014 and 021); collapsed by default. */
export default function CyclesLegend({ cycles, focus }: Props) {
  return (
    <details className="windows-cycles">
      <summary className="windows-cycles-summary">
        <span className="label">Cycles</span>
        <span className="windows-cycles-peek">
          synodic {formatPeriod(cycles.synodic_month_days, 'synodic_month_days')} · draconic{' '}
          {formatPeriod(cycles.draconic_year_days, 'draconic_year_days')}
        </span>
      </summary>

      <dl className="windows-cycles-list">
        {PERIODS.map((period) => (
          <div key={period.key} className="windows-cycles-item">
            <dt>
              {period.label}{' '}
              <span className="num">{formatPeriod(cycles[period.key], period.key)}</span>
            </dt>
            <dd className="windows-hint">{period.hint}</dd>
          </div>
        ))}
      </dl>

      {focus ? (
        <p className="windows-cycles-focus">
          Selected window phase: seasonal{' '}
          <span className="num">{focus.cycles.seasonal_phase_deg.toFixed(1)}°</span> · draconic year{' '}
          <span className="num">{focus.cycles.draconic_year_phase_deg.toFixed(1)}°</span> · lunar day{' '}
          <span className="num">#{focus.cycles.lunar_day_index}</span>
        </p>
      ) : (
        <p className="windows-hint">Hover or select a heatmap cell to see its cycle phase.</p>
      )}
    </details>
  )
}

function formatPeriod(value: number, key: keyof CyclesSummary): string {
  if (key === 'nodal_precession_years') return `${value} yr`
  return `${value} d`
}
