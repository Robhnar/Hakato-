import { expect, test } from 'vitest'
import type { CalendarSlot, Site } from '../../api/types'
import {
  MISSIONS,
  type Candidate,
  nextAfterSlip,
  rankCandidates,
  rateDarkness,
  rateFraction,
  scoreSlot,
} from './ranking'

function slot(change: Partial<CalendarSlot> = {}): CalendarSlot {
  return {
    start_utc: '2028-05-01T00:00:00Z',
    end_utc: '2028-05-15T00:00:00Z',
    sunlight_hours: 336,
    sun_visible_fraction: 1,
    max_darkness_hours: 0,
    max_sun_el_deg: 1.4,
    sun_el_at_start_deg: 0.7,
    earth_hours: 168,
    earth_visible_fraction: 0.5,
    earth_visible_at_start: true,
    passes_requirements: true,
    score: 50,
    cycles: { lunar_day_index: 0, seasonal_phase_deg: 0, draconic_year_phase_deg: 0 },
    ...change,
  }
}

function site(id: string): Site {
  return { id, name: id, lat_deg: -89, lon_deg: 0, category: 'candidate', landing_utc: null }
}

test('mission lengths match the spec', () => {
  expect(MISSIONS.quick.hours).toBe(72)
  expect(MISSIONS.twoWeeks.hours).toBe(336)
  expect(MISSIONS.long.hours).toBeCloseTo(708.7 * 3)
})

test('scoreSlot weights sunlight for a power priority', () => {
  expect(scoreSlot(slot(), 'power', 336)).toBe(92.5)
})

test('scoreSlot penalises landing in darkness', () => {
  expect(scoreSlot(slot({ sun_el_at_start_deg: -1 }), 'power', 336)).toBe(74)
})

test('scoreSlot weights Earth contact for an earth priority', () => {
  // 0.2*1 + 0.6*0.5 + 0.2*1 = 0.7
  expect(scoreSlot(slot(), 'earth', 336)).toBe(70)
})

test('scoreSlot counts long darkness against the slot', () => {
  // both: 0.4*0.5 + 0.4*0.5 + 0.2*(1 - 168/336) = 0.5
  const dark = slot({ sun_visible_fraction: 0.5, max_darkness_hours: 168 })
  expect(scoreSlot(dark, 'both', 336)).toBe(50)
})

test('rankCandidates drops slots without Earth at landing when required', () => {
  const cands: Candidate[] = [
    { site: site('a'), slot: slot({ earth_visible_at_start: false }) },
    { site: site('b'), slot: slot() },
  ]
  const ranked = rankCandidates(cands, 'power', 336, true)
  expect(ranked.map((c) => c.site.id)).toEqual(['b'])
})

test('rankCandidates sorts by points, then by earlier start', () => {
  const cands: Candidate[] = [
    { site: site('late'), slot: slot({ start_utc: '2028-06-01T00:00:00Z' }) },
    { site: site('weak'), slot: slot({ sun_visible_fraction: 0.2 }) },
    { site: site('early'), slot: slot({ start_utc: '2028-04-01T00:00:00Z' }) },
  ]
  const ranked = rankCandidates(cands, 'power', 336, false)
  expect(ranked.map((c) => c.site.id)).toEqual(['early', 'late', 'weak'])
  expect(ranked[0].points).toBe(92.5)
})

test('rateFraction thresholds', () => {
  expect(rateFraction(0.75)).toBe('great')
  expect(rateFraction(0.4)).toBe('okay')
  expect(rateFraction(0.39)).toBe('poor')
})

test('rateDarkness thresholds', () => {
  expect(rateDarkness(24)).toBe('great')
  expect(rateDarkness(72)).toBe('okay')
  expect(rateDarkness(73)).toBe('poor')
})

test('nextAfterSlip finds the best later option at the same site', () => {
  const ranked = rankCandidates(
    [
      { site: site('a'), slot: slot({ start_utc: '2028-05-01T00:00:00Z' }) },
      { site: site('b'), slot: slot({ start_utc: '2028-05-20T00:00:00Z' }) },
      { site: site('a'), slot: slot({ start_utc: '2028-05-05T00:00:00Z' }) },
      { site: site('a'), slot: slot({ start_utc: '2028-05-30T00:00:00Z', sun_visible_fraction: 0.5 }) },
      { site: site('a'), slot: slot({ start_utc: '2028-05-10T00:00:00Z', sun_visible_fraction: 0.8 }) },
    ],
    'power',
    336,
    false,
  )
  const best = ranked[0]
  expect(best.slot.start_utc).toBe('2028-05-01T00:00:00Z')
  expect(nextAfterSlip(ranked, best, 7)?.slot.start_utc).toBe('2028-05-10T00:00:00Z')
})

test('nextAfterSlip returns null when nothing later exists', () => {
  const ranked = rankCandidates([{ site: site('a'), slot: slot() }], 'power', 336, false)
  expect(nextAfterSlip(ranked, ranked[0], 7)).toBeNull()
})
