// Szukanie miejsca i terminu lądowania: pyta /api/windows o każde miejsce i układa wspólny ranking.

import type { Meta, Site, WindowsQuery, WindowsResponse } from '../../api/types'
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

  const settled = await Promise.allSettled(
    targets.map((site) =>
      fetchWindows({ lat_deg: site.lat_deg, lon_deg: site.lon_deg, duration_hours, ...range }),
    ),
  )

  const candidates: Candidate[] = []
  const failedSites: Site[] = []
  let meta: Meta | null = null
  settled.forEach((outcome, i) => {
    if (outcome.status === 'rejected') {
      failedSites.push(targets[i])
      return
    }
    meta ??= outcome.value.meta
    for (const slot of outcome.value.grid) candidates.push({ site: targets[i], slot })
  })
  if (failedSites.length === targets.length) {
    throw new Error('Could not reach the landing calculator.')
  }

  const ranked = rankCandidates(candidates, answers.priority, duration_hours, answers.earthAtLanding)
  let emptyReason: SearchResult['emptyReason'] = null
  if (ranked.length === 0) emptyReason = candidates.length > 0 ? 'earth-at-landing' : 'no-windows'
  return { ranked, failedSites, meta, emptyReason }
}
