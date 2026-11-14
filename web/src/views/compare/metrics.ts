import type { Summary } from '../../api/types'
import { isBest } from './pickBest'

export interface ScenarioMetrics {
  sunFraction: number | null
  earthFraction: number | null
  sunMaxEl: number | null
  earthMaxEl: number | null
}

export function emptyMetrics(): ScenarioMetrics {
  return { sunFraction: null, earthFraction: null, sunMaxEl: null, earthMaxEl: null }
}

export function metricsFromSummary(summary: Summary | null): ScenarioMetrics {
  if (!summary) return emptyMetrics()
  return {
    sunFraction: summary.sun.visible_fraction,
    earthFraction: summary.earth.visible_fraction,
    sunMaxEl: summary.sun.max_el_deg,
    earthMaxEl: summary.earth.max_el_deg,
  }
}

/** Flagę „best” dla każdej metryki w wierszu. */
export function columnBests(rows: ScenarioMetrics[]): {
  sunFraction: boolean[]
  earthFraction: boolean[]
  sunMaxEl: boolean[]
  earthMaxEl: boolean[]
} {
  return {
    sunFraction: rows.map((_, i) => isBest(rows.map((r) => r.sunFraction), i)),
    earthFraction: rows.map((_, i) => isBest(rows.map((r) => r.earthFraction), i)),
    sunMaxEl: rows.map((_, i) => isBest(rows.map((r) => r.sunMaxEl), i)),
    earthMaxEl: rows.map((_, i) => isBest(rows.map((r) => r.earthMaxEl), i)),
  }
}

export function sameMetrics(a: ScenarioMetrics | null | undefined, b: ScenarioMetrics | null): boolean {
  if (a === b) return true
  if (!a || !b) return a === b
  return (
    a.sunFraction === b.sunFraction &&
    a.earthFraction === b.earthFraction &&
    a.sunMaxEl === b.sunMaxEl &&
    a.earthMaxEl === b.earthMaxEl
  )
}
