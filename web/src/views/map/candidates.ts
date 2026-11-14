// Czysta logika rankingu kandydatów nakładki (zadanie 021): etykiety i pozycje
// z remisami. Bez three.js, testowalne w Node.

import type { OptimalCandidate, OptimalWeights } from '../../api/types'
import { formatCoords } from '../../app/format'
import { normalizeWeights } from './heatmap'

export interface RankedCandidate {
  candidate: OptimalCandidate
  rank: number
  tied: boolean
  label: string
}

/** Katalog: nazwa bez przedrostka; punkt siatki: `Grid 88.5°S 45.0°W`. */
export function candidateLabel(
  candidate: Pick<OptimalCandidate, 'name' | 'lat_deg' | 'lon_deg' | 'is_catalog_site'>,
): string {
  if (candidate.is_catalog_site) return candidate.name.replace(/^Artemis candidate: /, '')
  return `Grid ${formatCoords(candidate.lat_deg, candidate.lon_deg, 1)}`
}

/** Sortuje malejąco; wyniki równe po zaokrągleniu do 0.1 dzielą pozycję (1, 1, 1, 4). */
export function rankCandidates(ranking: OptimalCandidate[]): RankedCandidate[] {
  const valid = ranking
    .filter((c) => [c.score, c.lat_deg, c.lon_deg].every(Number.isFinite))
    .sort((a, b) => b.score - a.score)
  const tenth = (c: OptimalCandidate) => Math.round(c.score * 10)
  return valid.map((candidate) => {
    const first = valid.findIndex((c) => tenth(c) === tenth(candidate))
    const tied = valid.filter((c) => tenth(c) === tenth(candidate)).length > 1
    return { candidate, rank: first + 1, tied, label: candidateLabel(candidate) }
  })
}

/** Wagi jako liczby całkowite sumujące się do 100 (metoda największych reszt). */
export function weightsToPercent(weights: OptimalWeights): { sun: number; earth: number; overlap: number } {
  const w = normalizeWeights(weights)
  const raw = [w.w_sun * 100, w.w_earth * 100, w.w_overlap * 100]
  const out = raw.map(Math.floor)
  const order = [0, 1, 2].sort((a, b) => raw[b] - out[b] - (raw[a] - out[a]) || a - b)
  for (let k = 0; k < 100 - out.reduce((x, y) => x + y, 0); k += 1) out[order[k]] += 1
  return { sun: out[0], earth: out[1], overlap: out[2] }
}

/** Ustawia jedną wagę; pozostałe dwie skaluje proporcjonalnie do reszty (suma = 1). */
export function setWeight(weights: OptimalWeights, key: keyof OptimalWeights, percent: number): OptimalWeights {
  const value = Math.min(100, Math.max(0, percent)) / 100
  const others = (['w_sun', 'w_earth', 'w_overlap'] as const).filter((k) => k !== key)
  const rest = 1 - value
  const total = others.reduce((sum, k) => sum + Math.max(0, weights[k]), 0)
  const next = { ...weights, [key]: value }
  for (const k of others) next[k] = total > 0 ? (Math.max(0, weights[k]) / total) * rest : rest / 2
  return next
}
