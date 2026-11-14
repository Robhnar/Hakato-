import { describe, expect, it } from 'vitest'
import type { OptimalCandidate } from '../../api/types'
import { candidateLabel, rankCandidates, setWeight, weightsToPercent } from './candidates'

const base = { is_catalog_site: false, score: 50 } as OptimalCandidate

describe('candidates', () => {
  it('nazywa punkt siatki współrzędnymi z półkulą', () => {
    expect(candidateLabel({ name: 'Polar Grid (-88.5°, 315.0°)', lat_deg: -88.5, lon_deg: 315, is_catalog_site: false }))
      .toBe('Grid 88.5°S 45.0°W')
    expect(candidateLabel({ name: 'Artemis candidate: ridge near Shackleton', lat_deg: -89.45, lon_deg: -137.3, is_catalog_site: true }))
      .toBe('ridge near Shackleton')
  })
  it('remisy dzielą pozycję, kolejne miejsce przeskakuje', () => {
    const ranked = rankCandidates([
      { ...base, id: 'a', score: 100, lat_deg: -88, lon_deg: 0 },
      { ...base, id: 'b', score: 99.8, lat_deg: -87, lon_deg: 0 },
      { ...base, id: 'c', score: 100.04, lat_deg: -86, lon_deg: 0 },
    ])
    expect(ranked.map((r) => [r.candidate.id, r.rank, r.tied])).toEqual([['c', 1, true], ['a', 1, true], ['b', 3, false]])
  })
  it('odrzuca kandydatów z niepoprawnymi liczbami, pusty ranking daje pustą listę', () => {
    expect(rankCandidates([{ ...base, id: 'x', score: Number.NaN, lat_deg: 0, lon_deg: 0 }])).toEqual([])
    expect(rankCandidates([{ ...base, id: 'y', lat_deg: Number.NaN, lon_deg: 0 }])).toEqual([])
    expect(rankCandidates([])).toEqual([])
  })
  it('procenty wag sumują się do 100', () => {
    const p = weightsToPercent({ w_sun: 1, w_earth: 1, w_overlap: 1 })
    expect(p.sun + p.earth + p.overlap).toBe(100)
    expect(weightsToPercent({ w_sun: 0, w_earth: 0, w_overlap: 0 })).toEqual({ sun: 34, earth: 33, overlap: 33 })
  })
  it('zmiana jednej wagi skaluje pozostałe i zachowuje sumę 1', () => {
    const w = setWeight({ w_sun: 0.45, w_earth: 0.25, w_overlap: 0.3 }, 'w_sun', 80)
    expect(w.w_sun).toBeCloseTo(0.8)
    expect(w.w_earth + w.w_overlap).toBeCloseTo(0.2)
    expect(w.w_earth / w.w_overlap).toBeCloseTo(0.25 / 0.3)
  })
  it('suwak na 100 zeruje pozostałe, powrót z 100 dzieli resztę po równo', () => {
    const full = setWeight({ w_sun: 0.45, w_earth: 0.25, w_overlap: 0.3 }, 'w_sun', 100)
    expect(full).toEqual({ w_sun: 1, w_earth: 0, w_overlap: 0 })
    const back = setWeight(full, 'w_sun', 50)
    expect(back.w_earth).toBeCloseTo(0.25)
    expect(back.w_overlap).toBeCloseTo(0.25)
  })
})
