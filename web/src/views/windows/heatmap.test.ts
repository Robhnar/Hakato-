import { describe, expect, it } from 'vitest'
import type { CalendarSlot } from '../../api/types'
import { scoreColor } from '../../app/scale'
import {
  colorForValue,
  groupByStartYear,
  heatColor,
  metricValue,
  scaleBounds,
} from './heatmap'

function slot(partial: Partial<CalendarSlot> & Pick<CalendarSlot, 'start_utc'>): CalendarSlot {
  return {
    end_utc: partial.end_utc ?? '2027-01-30T00:00:00Z',
    sunlight_hours: partial.sunlight_hours ?? 100,
    sun_visible_fraction: partial.sun_visible_fraction ?? 0.2,
    max_darkness_hours: partial.max_darkness_hours ?? 200,
    max_sun_el_deg: partial.max_sun_el_deg ?? 1,
    sun_el_at_start_deg: partial.sun_el_at_start_deg ?? 0,
    earth_hours: partial.earth_hours ?? 100,
    earth_visible_fraction: partial.earth_visible_fraction ?? 0.3,
    earth_visible_at_start: partial.earth_visible_at_start ?? false,
    passes_requirements: partial.passes_requirements ?? false,
    score: partial.score ?? 0.5,
    cycles: partial.cycles ?? {
      lunar_day_index: 0,
      seasonal_phase_deg: 0,
      draconic_year_phase_deg: 0,
    },
    uncertainty: null,
    ...partial,
  }
}

describe('scaleBounds', () => {
  it('returns padded range for a single value', () => {
    const { min, max } = scaleBounds([10])
    expect(min).toBeLessThan(10)
    expect(max).toBeGreaterThan(10)
  })

  it('uses real min/max for multiple values', () => {
    expect(scaleBounds([1, 5, 3])).toEqual({ min: 1, max: 5 })
  })
})

describe('colorForValue', () => {
  it('maps extremes to different colours', () => {
    expect(colorForValue(0, 0, 10, false)).not.toBe(colorForValue(10, 0, 10, false))
  })

  it('uses the shared score scale', () => {
    expect(heatColor(0)).toBe(scoreColor(0))
    expect(heatColor(1)).toBe(scoreColor(1))
    expect(colorForValue(0, 0, 10, true)).toBe(scoreColor(1))
  })

  it('inverts darkness so lower night is warmer', () => {
    const good = colorForValue(10, 0, 100, true)
    const bad = colorForValue(90, 0, 100, true)
    expect(good).toBe(heatColor(0.9))
    expect(bad).toBe(heatColor(0.1))
  })
})

describe('metricValue / groupByStartYear', () => {
  it('reads the selected metric', () => {
    const s = slot({ start_utc: '2027-02-01T00:00:00Z', score: 0.77 })
    expect(metricValue(s, 'score')).toBe(0.77)
  })

  it('groups and sorts slots by start year', () => {
    const groups = groupByStartYear([
      slot({ start_utc: '2028-06-01T00:00:00Z' }),
      slot({ start_utc: '2027-03-01T00:00:00Z' }),
      slot({ start_utc: '2027-01-01T00:00:00Z' }),
    ])
    expect(groups.map((g) => g.year)).toEqual([2027, 2028])
    expect(groups[0].slots.map((s) => s.start_utc)).toEqual([
      '2027-01-01T00:00:00Z',
      '2027-03-01T00:00:00Z',
    ])
  })
})
