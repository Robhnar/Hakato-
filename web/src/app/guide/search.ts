// Szukanie miejsca i terminu lądowania: pyta /api/windows o każde miejsce i układa wspólny ranking.

import type { Meta, Site, WindowsQuery, WindowsResponse } from '../../api/types'
import { toIsoZ } from '../scenario'
import { monthRangeToSearch } from './format'
import { type Candidate, MISSIONS, type MissionKind, type Priority, type RankedCandidate, rankCandidates } from './ranking'

export interface GuideAnswers {
  mission: MissionKind
  priority: Priority
  earthAtLanding: boolean
  /** Miesiące 'YYYY-MM'. */
  from: string
  to: string
  /** 'auto' = kandydaci z bieguna płd.; inaczej id miejsca z katalogu. */
  place: 'auto' | string
}

export interface SearchResult {
  ranked: RankedCandidate[]
  failedSites: Site[]
  meta: Meta | null
  emptyReason: 'earth-at-landing' | 'no-windows' | null
}

/** Miesiąc synodyczny (dzień księżycowy) w dniach. */
const SYNODIC_MONTH_DAYS = 29.530589
/** Od tej długości backend przesuwa okna co pełny miesiąc synodyczny (windows_search.py). */
const LONG_MISSION_HOURS = 300
const PHASE_SAMPLES = 8

/**
 * Przesunięcia startu wyszukiwania (dni). Dla długich misji backend daje jeden start
 * na dzień księżycowy, zawsze w tej samej fazie — próbkujemy więc 8 faz.
 */
export function phaseOffsetsDays(durationHours: number): number[] {
  if (durationHours < LONG_MISSION_HOURS) return [0]
  return Array.from({ length: PHASE_SAMPLES }, (_, i) => (i * SYNODIC_MONTH_DAYS) / PHASE_SAMPLES)
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
  const offsets = phaseOffsetsDays(duration_hours)
  const settled = await Promise.all(
    targets.map((site) =>
      Promise.allSettled(
        offsets.map((days) =>
          fetchWindows({
            lat_deg: site.lat_deg,
            lon_deg: site.lon_deg,
            duration_hours,
            search_start_utc: toIsoZ(new Date(startMs + days * 86_400_000)),
            search_end_utc: range.search_end_utc,
          }),
        ),
      ),
    ),
  )

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
      for (const slot of response.grid) candidates.push({ site: targets[i], slot })
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
