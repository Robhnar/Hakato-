// Searching for a landing site and date: asks /api/windows for each site and builds a shared ranking.

import type { Meta, Site, WindowsQuery, WindowsResponse } from '../../api/types'
import { toIsoZ } from '../scenario'
import { monthRangeToSearch } from './format'
import { type Candidate, MISSIONS, type MissionKind, type Priority, type RankedCandidate, rankCandidates } from './ranking'

export interface GuideAnswers {
  mission: MissionKind
  priority: Priority
  earthAtLanding: boolean
  /** Months 'YYYY-MM'. */
  from: string
  to: string
  /** 'auto' = candidates from the south pole; otherwise a catalog site id. */
  place: 'auto' | string
}

export interface SearchResult {
  ranked: RankedCandidate[]
  failedSites: Site[]
  meta: Meta | null
  emptyReason: 'earth-at-landing' | 'no-windows' | null
}

/** Synodic month (lunar day) in days. */
const SYNODIC_MONTH_DAYS = 29.530589
/** From this length on, the backend steps windows by a whole synodic month (windows_search.py). */
const LONG_MISSION_HOURS = 300
const PHASE_SAMPLES = 8
/** A long stay (~3 lunar days) is barely sensitive to phase — 4 samples are enough. */
const LONG_STAY_HOURS = 1000
const LONG_STAY_PHASE_SAMPLES = 4
/** The backend computes synchronously; more parallel requests only lengthen the queue and cause timeouts. */
const MAX_PARALLEL = 4

/** Runs tasks with a concurrency limit; returns results in task order. */
async function settleWithLimit<T>(tasks: (() => Promise<T>)[], limit: number): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length)
  let next = 0
  async function worker() {
    while (next < tasks.length) {
      const i = next++
      try {
        results[i] = { status: 'fulfilled', value: await tasks[i]() }
      } catch (reason) {
        results[i] = { status: 'rejected', reason }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker))
  return results
}

/**
 * Search start offsets (days). For long missions the backend gives one start
 * per lunar day, always in the same phase — so we sample 8 phases.
 */
export function phaseOffsetsDays(durationHours: number): number[] {
  if (durationHours < LONG_MISSION_HOURS) return [0]
  const n = durationHours >= LONG_STAY_HOURS ? LONG_STAY_PHASE_SAMPLES : PHASE_SAMPLES
  return Array.from({ length: n }, (_, i) => (i * SYNODIC_MONTH_DAYS) / n)
}

export function candidateSites(sites: Site[], place: GuideAnswers['place']): Site[] {
  if (place === 'auto') return sites.filter((site) => site.category === 'candidate')
  return sites.filter((site) => site.id === place)
}

export async function findLandings(
  answers: GuideAnswers,
  sites: Site[],
  fetchWindows: (q: WindowsQuery) => Promise<WindowsResponse>,
): Promise<SearchResult> {
  const range = monthRangeToSearch(answers.from, answers.to)
  if ('error' in range) throw new Error(range.error)
  const duration_hours = MISSIONS[answers.mission].hours
  const targets = candidateSites(sites, answers.place)

  const startMs = new Date(range.search_start_utc).getTime()
  const landBeforeMs = new Date(range.search_end_utc).getTime()
  // The backend keeps only windows ending before the end of the range; "Latest landing month" concerns
  // the landing, so we extend the range by the mission time and cut off later landings below.
  const searchEnd = toIsoZ(new Date(landBeforeMs + duration_hours * 3_600_000))
  const offsets = phaseOffsetsDays(duration_hours)
  const tasks = targets.flatMap((site) =>
    offsets.map(
      (days) => () =>
        fetchWindows({
          lat_deg: site.lat_deg,
          lon_deg: site.lon_deg,
          duration_hours,
          search_start_utc: toIsoZ(new Date(startMs + days * 86_400_000)),
          search_end_utc: searchEnd,
        }),
    ),
  )
  const flat = await settleWithLimit(tasks, MAX_PARALLEL)
  const settled = targets.map((_, i) => flat.slice(i * offsets.length, (i + 1) * offsets.length))

  const candidates: Candidate[] = []
  const failedSites: Site[] = []
  let meta: Meta | null = null
  settled.forEach((outcomes, i) => {
    const ok = outcomes.filter((o) => o.status === 'fulfilled').map((o) => o.value)
    if (ok.length === 0) {
      failedSites.push(targets[i])
      return
    }
    for (const response of ok) {
      meta ??= response.meta
      for (const slot of response.grid) {
        if (new Date(slot.start_utc).getTime() < landBeforeMs) candidates.push({ site: targets[i], slot })
      }
    }
  })
  if (failedSites.length === targets.length) {
    throw new Error('Could not reach the landing calculator.')
  }

  const ranked = rankCandidates(candidates, answers.priority, duration_hours, answers.earthAtLanding)
  let emptyReason: SearchResult['emptyReason'] = null
  if (ranked.length === 0) emptyReason = candidates.length > 0 ? 'earth-at-landing' : 'no-windows'
  return { ranked, failedSites, meta, emptyReason }
}
