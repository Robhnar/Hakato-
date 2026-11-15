// Ranking of landing dates in guided mode (task 020).
// Pure functions: take slots from /api/windows and order them by the layperson's priority.

import type { CalendarSlot, Site } from '../../api/types'
import { LUNAR_DAY_HOURS } from '../scenario'

export type MissionKind = 'quick' | 'twoWeeks' | 'long'

export const MISSIONS: Record<MissionKind, { label: string; hours: number; blurb: string }> = {
  quick: { label: 'Quick visit', hours: 72, blurb: '3 days on the surface' },
  twoWeeks: { label: 'Two weeks', hours: 336, blurb: 'About one lunar daytime' },
  long: { label: 'Long stay', hours: LUNAR_DAY_HOURS * 3, blurb: 'About 3 months, through lunar nights' },
}

export type Priority = 'power' | 'earth' | 'both'

export interface Candidate {
  site: Site
  slot: CalendarSlot
}

export interface RankedCandidate extends Candidate {
  /** Score 0–100 by the user's priority. */
  points: number
}

/** Weights: Sun / Earth / no long darkness. */
const WEIGHTS: Record<Priority, { sun: number; earth: number; dark: number }> = {
  power: { sun: 0.6, earth: 0.15, dark: 0.25 },
  earth: { sun: 0.2, earth: 0.6, dark: 0.2 },
  both: { sun: 0.4, earth: 0.4, dark: 0.2 },
}

/** Landing with the Sun below the horizon is harder — penalty multiplier. */
const DARK_LANDING_FACTOR = 0.8

export function scoreSlot(slot: CalendarSlot, priority: Priority, durationHours: number): number {
  const w = WEIGHTS[priority]
  const darkShare = durationHours > 0 ? Math.min(slot.max_darkness_hours / durationHours, 1) : 0
  let value =
    w.sun * slot.sun_visible_fraction + w.earth * slot.earth_visible_fraction + w.dark * (1 - darkShare)
  if (slot.sun_el_at_start_deg < 0) value *= DARK_LANDING_FACTOR
  return Math.round(value * 1000) / 10
}

export function rankCandidates(
  cands: Candidate[],
  priority: Priority,
  durationHours: number,
  requireEarthAtLanding: boolean,
): RankedCandidate[] {
  return cands
    .filter((c) => !requireEarthAtLanding || c.slot.earth_visible_at_start)
    .map((c) => ({ ...c, points: scoreSlot(c.slot, priority, durationHours) }))
    .sort(
      (a, b) =>
        b.points - a.points ||
        new Date(a.slot.start_utc).getTime() - new Date(b.slot.start_utc).getTime(),
    )
}

export type Rating = 'great' | 'okay' | 'poor'

export function rateFraction(f: number): Rating {
  if (f >= 0.75) return 'great'
  if (f >= 0.4) return 'okay'
  return 'poor'
}

export function rateDarkness(hours: number): Rating {
  if (hours <= 24) return 'great'
  if (hours <= 72) return 'okay'
  return 'poor'
}

/** The best option at the same site if the start slips by `days` days. */
export function nextAfterSlip(
  ranked: RankedCandidate[],
  best: RankedCandidate,
  days: number,
): RankedCandidate | null {
  const earliest = new Date(best.slot.start_utc).getTime() + days * 86_400_000
  return (
    ranked.find(
      (c) => c.site.id === best.site.id && new Date(c.slot.start_utc).getTime() >= earliest,
    ) ?? null
  )
}
