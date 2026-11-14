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

/** Krótka legenda cykli astronomicznych dla wybranego okna (014). */
export default function CyclesLegend({ cycles, focus }: Props) {
  return (
    <section className="windows-cycles" aria-label="Astronomical cycles">
      <h3>Cycles</h3>
      <ul className="windows-cycles-list">
        {PERIODS.map((period) => (
          <li key={period.key}>
            <strong>
              {period.label}: {formatPeriod(cycles[period.key], period.key)}
            </strong>
            <span className="windows-hint"> — {period.hint}</span>
          </li>
        ))}
      </ul>
      {focus ? (
        <p className="windows-cycles-focus">
          Selected window phase: seasonal {focus.cycles.seasonal_phase_deg.toFixed(1)}° · draconic year{' '}
          {focus.cycles.draconic_year_phase_deg.toFixed(1)}° · lunar day index{' '}
          {focus.cycles.lunar_day_index}.
        </p>
      ) : (
        <p className="windows-hint">Hover or select a heatmap cell to see its cycle phase.</p>
      )}
    </section>
  )
}

function formatPeriod(value: number, key: keyof CyclesSummary): string {
  if (key === 'nodal_precession_years') return `${value} yr`
  return `${value} d`
}
