// Rows of the scenario comparison table (task 021).
// Each row is one metric: how to compare (for picking the best
// value in the row) and ready text to display. The ranking logic lives
// in `pickBest.ts` and stays unchanged.

import type { Summary } from '../../api/types'
import { formatDeg, formatHours, formatPercent } from '../../app/format'
import { isBest } from './pickBest'

export interface CompareRow {
  id: string
  label: string
  /** Number to compare in the row; `null` = a row without a "best" value. */
  metric: ((summary: Summary) => number) | null
  format: (summary: Summary) => string
}

/** State of the body at the window start: visible + when it sets/rises. */
function describeAtStart(visible: boolean, hoursUntilChange: number | null): string {
  if (hoursUntilChange === null) return `${visible ? 'up' : 'down'} · no change`
  const change = `${visible ? 'sets' : 'rises'} in ${formatHours(hoursUntilChange)}`
  return `${visible ? 'up' : 'down'} · ${change}`
}

export const COMPARE_ROWS: CompareRow[] = [
  {
    id: 'sun-time',
    label: 'Sun time',
    metric: (summary) => summary.sun.visible_fraction,
    format: (summary) => formatPercent(summary.sun.visible_fraction),
  },
  {
    id: 'earth-time',
    label: 'Earth time',
    metric: (summary) => summary.earth.visible_fraction,
    format: (summary) => formatPercent(summary.earth.visible_fraction),
  },
  {
    id: 'sun-max-el',
    label: 'Sun max elevation',
    metric: (summary) => summary.sun.max_el_deg,
    format: (summary) => formatDeg(summary.sun.max_el_deg),
  },
  {
    id: 'earth-max-el',
    label: 'Earth max elevation',
    metric: (summary) => summary.earth.max_el_deg,
    format: (summary) => formatDeg(summary.earth.max_el_deg),
  },
  {
    id: 'sun-at-start',
    label: 'Sun at start',
    metric: null,
    format: (summary) =>
      describeAtStart(summary.sun.visible_at_start, summary.sun.hours_until_change),
  },
  {
    id: 'earth-at-start',
    label: 'Earth at start',
    metric: null,
    format: (summary) =>
      describeAtStart(summary.earth.visible_at_start, summary.earth.hours_until_change),
  },
]

/** "Best in row" flag for each column; no data = no flag. */
export function rowBests(row: CompareRow, summaries: (Summary | null)[]): boolean[] {
  const metric = row.metric
  if (!metric) return summaries.map(() => false)
  const values = summaries.map((summary) => (summary ? metric(summary) : null))
  return summaries.map((_, index) => isBest(values, index))
}
