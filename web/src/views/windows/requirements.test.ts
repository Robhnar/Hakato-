import { describe, expect, test } from 'vitest'
import { LUNAR_DAY_HOURS } from '../../app/scenario'
import type { CalendarSlot } from '../../api/types'
import {
  BATTERY_PRESETS,
  DEFAULT_REQUIREMENTS,
  DURATION_PRESETS,
  MISSION_PROFILES,
  SLIP_MAX_DAYS,
  SLIP_MIN_DAYS,
  clampSlipDays,
  filterMatches,
  nearestEquivalent,
  passes,
  shiftUtc,
  slipComparison,
  toQuery,
  validateRequirements,
  violations,
  type MissionRequirements,
} from './requirements'

function slot(overrides: Partial<CalendarSlot> = {}): CalendarSlot {
  return {
    start_utc: '2027-01-01T00:00:00Z',
    end_utc: '2027-01-02T00:00:00Z',
    sunlight_hours: 12,
    sun_visible_fraction: 0.5,
    max_darkness_hours: 10,
    max_sun_el_deg: 20,
    sun_el_at_start_deg: 5,
    earth_hours: 6,
    earth_visible_fraction: 0.25,
    earth_visible_at_start: true,
    passes_requirements: true,
    score: 0.5,
    cycles: { lunar_day_index: 1, seasonal_phase_deg: 0, draconic_year_phase_deg: 41.0 },
    ...overrides,
  }
}

/** Requirements with only the fields we care about overridden. */
function requirements(overrides: Partial<MissionRequirements> = {}): MissionRequirements {
  return { ...DEFAULT_REQUIREMENTS, ...overrides }
}

describe('presets', () => {
  test('default requirements match the 011 brief', () => {
    expect(DEFAULT_REQUIREMENTS).toEqual({
      duration_hours: LUNAR_DAY_HOURS,
      min_sun_el_at_landing_deg: 0,
      min_sunlight_hours: 0,
      max_darkness_hours: LUNAR_DAY_HOURS,
      require_earth_at_landing: false,
      min_earth_fraction: 0,
    })
  })

  test('duration presets are reused from the shell', () => {
    expect(DURATION_PRESETS.map((preset) => preset.hours)).toEqual([24, LUNAR_DAY_HOURS, LUNAR_DAY_HOURS * 3])
  })

  test('battery presets cover 48, 100 and 350 hours', () => {
    expect(BATTERY_PRESETS).toEqual([48, 100, 350])
  })

  test('mission profiles are complete and valid', () => {
    expect(MISSION_PROFILES).toHaveLength(3)
    const short = MISSION_PROFILES.find((profile) => profile.id === 'short-surface-lander')
    const polar = MISSION_PROFILES.find((profile) => profile.id === 'polar-rover')
    const relay = MISSION_PROFILES.find((profile) => profile.id === 'permanent-relay')

    expect(short?.requirements.duration_hours).toBe(72)
    expect(polar?.requirements.duration_hours).toBe(LUNAR_DAY_HOURS)
    expect(polar?.requirements.max_darkness_hours).toBe(72)
    expect(relay?.requirements.duration_hours).toBe(LUNAR_DAY_HOURS * 3)
    expect(relay?.requirements.require_earth_at_landing).toBe(true)
    expect(relay?.requirements.min_earth_fraction).toBe(0.9)

    for (const profile of MISSION_PROFILES) {
      expect(validateRequirements(profile.requirements)).toEqual({})
    }
  })
})

describe('validateRequirements', () => {
  test('accepts the defaults and boundary values', () => {
    expect(validateRequirements(DEFAULT_REQUIREMENTS)).toEqual({})
    expect(
      validateRequirements(
        requirements({
          duration_hours: 1,
          min_sun_el_at_landing_deg: 90,
          min_sunlight_hours: 1,
          max_darkness_hours: 0,
          min_earth_fraction: 1,
        }),
      ),
    ).toEqual({})
    expect(validateRequirements(requirements({ min_earth_fraction: 0 }))).toEqual({})
  })

  test('rejects a missing, zero or negative duration', () => {
    expect(validateRequirements(requirements({ duration_hours: Number.NaN }))).toHaveProperty(
      'duration_hours',
    )
    expect(validateRequirements(requirements({ duration_hours: Number.POSITIVE_INFINITY }))).toHaveProperty(
      'duration_hours',
    )
    expect(validateRequirements(requirements({ duration_hours: 0 }))).toHaveProperty('duration_hours')
    expect(validateRequirements(requirements({ duration_hours: -3 }))).toHaveProperty('duration_hours')
  })

  test('rejects negative or excessive Sun elevation', () => {
    expect(validateRequirements(requirements({ min_sun_el_at_landing_deg: Number.NaN }))).toHaveProperty(
      'min_sun_el_at_landing_deg',
    )
    expect(validateRequirements(requirements({ min_sun_el_at_landing_deg: -0.1 }))).toHaveProperty(
      'min_sun_el_at_landing_deg',
    )
    expect(validateRequirements(requirements({ min_sun_el_at_landing_deg: 90.1 }))).toHaveProperty(
      'min_sun_el_at_landing_deg',
    )
  })

  test('rejects negative sunlight and sunlight longer than the mission', () => {
    expect(validateRequirements(requirements({ min_sunlight_hours: Number.NaN }))).toHaveProperty(
      'min_sunlight_hours',
    )
    expect(validateRequirements(requirements({ min_sunlight_hours: -1 }))).toHaveProperty(
      'min_sunlight_hours',
    )
    expect(validateRequirements(requirements({ duration_hours: 24, min_sunlight_hours: 25 }))).toHaveProperty(
      'min_sunlight_hours',
    )
    // Equality with the duration is valid.
    expect(validateRequirements(requirements({ duration_hours: 24, min_sunlight_hours: 24 }))).toEqual({})
  })

  test('rejects negative darkness but allows a battery larger than the mission', () => {
    expect(validateRequirements(requirements({ max_darkness_hours: Number.NaN }))).toHaveProperty(
      'max_darkness_hours',
    )
    expect(validateRequirements(requirements({ max_darkness_hours: -0.1 }))).toHaveProperty(
      'max_darkness_hours',
    )
    expect(validateRequirements(requirements({ duration_hours: 24, max_darkness_hours: 350 }))).toEqual({})
  })

  test('rejects a fraction outside 0…1', () => {
    expect(validateRequirements(requirements({ min_earth_fraction: Number.NaN }))).toHaveProperty(
      'min_earth_fraction',
    )
    expect(validateRequirements(requirements({ min_earth_fraction: -0.01 }))).toHaveProperty(
      'min_earth_fraction',
    )
    expect(validateRequirements(requirements({ min_earth_fraction: 1.01 }))).toHaveProperty(
      'min_earth_fraction',
    )
  })

  test('reports every broken field at once', () => {
    const errors = validateRequirements({
      duration_hours: -1,
      min_sun_el_at_landing_deg: -1,
      min_sunlight_hours: -1,
      max_darkness_hours: -1,
      require_earth_at_landing: true,
      min_earth_fraction: 2,
    })
    expect(Object.keys(errors).sort()).toEqual([
      'duration_hours',
      'max_darkness_hours',
      'min_earth_fraction',
      'min_sun_el_at_landing_deg',
      'min_sunlight_hours',
    ])
  })
})

describe('violations and passes', () => {
  test('the default slot meets the default requirements', () => {
    expect(violations(slot(), DEFAULT_REQUIREMENTS)).toEqual([])
    expect(passes(slot(), DEFAULT_REQUIREMENTS)).toBe(true)
  })

  test('Sun elevation below the threshold fails, equality passes', () => {
    const threshold = requirements({ min_sun_el_at_landing_deg: 5 })
    expect(violations(slot(), threshold)).toEqual([])
    const reasons = violations(slot({ sun_el_at_start_deg: 4.5 }), threshold)
    expect(reasons).toHaveLength(1)
    expect(reasons[0]).toContain('Sun at landing')
    expect(reasons[0]).toContain('4.5°')
    expect(passes(slot({ sun_el_at_start_deg: 4.5 }), threshold)).toBe(false)
  })

  test('sunlight below the threshold fails, equality passes', () => {
    const threshold = requirements({ min_sunlight_hours: 12 })
    expect(violations(slot(), threshold)).toEqual([])
    const reasons = violations(slot({ sunlight_hours: 11.9 }), threshold)
    expect(reasons).toHaveLength(1)
    expect(reasons[0]).toContain('Sunlight')
  })

  test('darkness above the battery limit fails, equality passes', () => {
    const threshold = requirements({ max_darkness_hours: 10 })
    expect(violations(slot(), threshold)).toEqual([])
    const reasons = violations(slot({ max_darkness_hours: 10.1 }), threshold)
    expect(reasons).toHaveLength(1)
    expect(reasons[0]).toContain('Longest darkness')
    expect(reasons[0]).toContain('battery limit')
  })

  test('Earth at landing is required only when the checkbox is on', () => {
    const hidden = slot({ earth_visible_at_start: false })
    expect(passes(hidden, requirements({ require_earth_at_landing: false }))).toBe(true)
    const reasons = violations(hidden, requirements({ require_earth_at_landing: true }))
    expect(reasons).toEqual(['Earth is not visible at landing.'])
  })

  test('Earth fraction below the threshold fails, equality passes', () => {
    const threshold = requirements({ min_earth_fraction: 0.25 })
    expect(violations(slot(), threshold)).toEqual([])
    const reasons = violations(slot({ earth_visible_fraction: 0.1 }), threshold)
    expect(reasons).toHaveLength(1)
    expect(reasons[0]).toContain('Earth visibility')
    expect(reasons[0]).toContain('10%')
    expect(reasons[0]).toContain('25%')
  })

  test('missing numeric data fails instead of silently passing', () => {
    const broken = slot({
      sun_el_at_start_deg: Number.NaN,
      sunlight_hours: Number.NaN,
      max_darkness_hours: Number.NaN,
      earth_visible_fraction: Number.NaN,
    })
    const reasons = violations(broken, DEFAULT_REQUIREMENTS)
    expect(reasons).toHaveLength(4)
    expect(reasons.every((reason) => reason.includes('missing'))).toBe(true)
    expect(passes(broken, DEFAULT_REQUIREMENTS)).toBe(false)
  })

  test('a slot can fail several requirements at once', () => {
    const broken = slot({ sun_el_at_start_deg: 0, sunlight_hours: 1, max_darkness_hours: 100 })
    const reasons = violations(
      broken,
      requirements({
        min_sun_el_at_landing_deg: 2,
        min_sunlight_hours: 10,
        max_darkness_hours: 48,
      }),
    )
    expect(reasons).toHaveLength(3)
  })
})

describe('filterMatches', () => {
  test('an empty grid gives an empty list', () => {
    expect(filterMatches([], DEFAULT_REQUIREMENTS)).toEqual([])
  })

  test('keeps only passing slots and filters on darkness immediately', () => {
    const grid = [
      slot({ start_utc: '2027-01-01T00:00:00Z', max_darkness_hours: 48 }),
      slot({ start_utc: '2027-01-02T00:00:00Z', max_darkness_hours: 72 }),
      slot({ start_utc: '2027-01-03T00:00:00Z', max_darkness_hours: 100 }),
    ]
    const matching = filterMatches(grid, requirements({ max_darkness_hours: 72 }))
    expect(matching.map((entry) => entry.start_utc)).toEqual([
      '2027-01-01T00:00:00Z',
      '2027-01-02T00:00:00Z',
    ])
  })

  test('sorts by score descending and breaks ties by start ascending', () => {
    const grid = [
      slot({ start_utc: '2027-01-03T00:00:00Z', score: 0.4 }),
      slot({ start_utc: '2027-01-02T00:00:00Z', score: 0.9 }),
      slot({ start_utc: '2027-01-01T00:00:00Z', score: 0.9 }),
      slot({ start_utc: '2027-01-04T00:00:00Z', score: 0.7 }),
    ]
    expect(filterMatches(grid, DEFAULT_REQUIREMENTS).map((entry) => entry.start_utc)).toEqual([
      '2027-01-01T00:00:00Z',
      '2027-01-02T00:00:00Z',
      '2027-01-04T00:00:00Z',
      '2027-01-03T00:00:00Z',
    ])
  })

  test('does not mutate the input grid', () => {
    const grid = [
      slot({ start_utc: '2027-01-02T00:00:00Z', score: 0.1 }),
      slot({ start_utc: '2027-01-01T00:00:00Z', score: 0.9 }),
    ]
    const before = grid.map((entry) => entry.start_utc)
    filterMatches(grid, DEFAULT_REQUIREMENTS)
    expect(grid.map((entry) => entry.start_utc)).toEqual(before)
  })

  test('missing scores sort last but do not break the order', () => {
    const grid = [
      slot({ start_utc: '2027-01-01T00:00:00Z', score: Number.NaN }),
      slot({ start_utc: '2027-01-02T00:00:00Z', score: 0.2 }),
      slot({ start_utc: '2027-01-03T00:00:00Z', score: Number.NaN }),
    ]
    expect(filterMatches(grid, DEFAULT_REQUIREMENTS).map((entry) => entry.start_utc)).toEqual([
      '2027-01-02T00:00:00Z',
      '2027-01-01T00:00:00Z',
      '2027-01-03T00:00:00Z',
    ])
  })

  test('boundary equality counts as passing', () => {
    const edge = slot({ sun_el_at_start_deg: 2, sunlight_hours: 10, max_darkness_hours: 48, earth_visible_fraction: 0.5 })
    const matching = filterMatches(
      [edge],
      requirements({
        min_sun_el_at_landing_deg: 2,
        min_sunlight_hours: 10,
        max_darkness_hours: 48,
        min_earth_fraction: 0.5,
      }),
    )
    expect(matching).toHaveLength(1)
  })
})

describe('toQuery', () => {
  test('copies the requirements and sets slip defaults', () => {
    const query = toQuery(
      requirements({ require_earth_at_landing: true, min_earth_fraction: 0.4 }),
      -89.5,
      0,
      '2027-01-01T00:00:00Z',
      '2035-01-01T00:00:00Z',
    )
    expect(query).toEqual({
      lat_deg: -89.5,
      lon_deg: 0,
      search_start_utc: '2027-01-01T00:00:00Z',
      search_end_utc: '2035-01-01T00:00:00Z',
      duration_hours: LUNAR_DAY_HOURS,
      min_sun_el_at_landing_deg: 0,
      min_sunlight_hours: 0,
      max_darkness_hours: LUNAR_DAY_HOURS,
      require_earth_at_landing: true,
      min_earth_fraction: 0.4,
    })
    expect('reference_start_utc' in query).toBe(false)
    expect('slip_days' in query).toBe(false)
  })

  test('includes the slip mode when asked', () => {
    const query = toQuery(
      DEFAULT_REQUIREMENTS,
      0,
      0,
      '2027-01-01T00:00:00Z',
      '2027-02-01T00:00:00Z',
      { reference_start_utc: '2027-01-10T00:00:00Z', slip_days: 12 },
    )
    expect(query.reference_start_utc).toBe('2027-01-10T00:00:00Z')
    expect(query.slip_days).toBe(12)
  })
})

describe('slipComparison', () => {
  test('deltas are delayed minus original', () => {
    const original = slot()
    const delayed = slot({ sunlight_hours: 8, max_darkness_hours: 15, earth_visible_fraction: 0.1 })
    const comparison = slipComparison(
      original,
      delayed,
      requirements({ min_sunlight_hours: 10, max_darkness_hours: 12, min_earth_fraction: 0.2 }),
    )

    expect(comparison.delta_sunlight_hours).toBeCloseTo(-4, 9)
    expect(comparison.delta_max_darkness_hours).toBeCloseTo(5, 9)
    expect(comparison.delta_earth_fraction).toBeCloseTo(-0.15, 9)
    expect(comparison.original_ok).toBe(true)
    expect(comparison.delayed_ok).toBe(false)
    expect(comparison.delayed_violations).toHaveLength(3)
  })

  test('reports a delayed window that still meets the requirements', () => {
    const comparison = slipComparison(slot(), slot({ sunlight_hours: 14 }), DEFAULT_REQUIREMENTS)
    expect(comparison.delta_sunlight_hours).toBeCloseTo(2, 9)
    expect(comparison.delayed_ok).toBe(true)
    expect(comparison.delayed_violations).toEqual([])
  })

  test('boundary equality in the delayed slot still passes', () => {
    const delayed = slot({ sunlight_hours: 10, max_darkness_hours: 12, earth_visible_fraction: 0.2 })
    const comparison = slipComparison(
      slot(),
      delayed,
      requirements({ min_sunlight_hours: 10, max_darkness_hours: 12, min_earth_fraction: 0.2 }),
    )
    expect(comparison.delayed_ok).toBe(true)
  })
})

describe('shiftUtc', () => {
  test('moves by whole and fractional days and keeps the Z suffix', () => {
    expect(shiftUtc('2027-01-01T00:00:00Z', 1)).toBe('2027-01-02T00:00:00Z')
    expect(shiftUtc('2027-01-01T00:00:00Z', 0.5)).toBe('2027-01-01T12:00:00Z')
    expect(shiftUtc('2027-01-31T06:30:00Z', 1)).toBe('2027-02-01T06:30:00Z')
    expect(shiftUtc('2027-01-01T00:00:00Z', 0)).toBe('2027-01-01T00:00:00Z')
  })

  test('an invalid date or day count gives an empty string', () => {
    expect(shiftUtc('not-a-date', 1)).toBe('')
    expect(shiftUtc('2027-01-01T00:00:00Z', Number.NaN)).toBe('')
  })
})

describe('nearestEquivalent', () => {
  const passing = (start: string) => slot({ start_utc: start })
  const failing = (start: string) => slot({ start_utc: start, max_darkness_hours: 100 })

  test('returns null for an empty grid or an invalid reference date', () => {
    expect(nearestEquivalent([], '2027-01-01T00:00:00Z', DEFAULT_REQUIREMENTS)).toBeNull()
    expect(nearestEquivalent([slot()], 'nope', DEFAULT_REQUIREMENTS)).toBeNull()
  })

  test('skips slots before the reference and failing slots', () => {
    const grid = [
      passing('2027-01-01T00:00:00Z'),
      failing('2027-01-02T00:00:00Z'),
      passing('2027-01-04T00:00:00Z'),
      passing('2027-01-06T00:00:00Z'),
    ]
    const nearest = nearestEquivalent(
      grid,
      '2027-01-02T00:00:00Z',
      requirements({ max_darkness_hours: 48 }),
    )
    expect(nearest?.start_utc).toBe('2027-01-04T00:00:00Z')
  })

  test('a slot starting exactly at the reference counts', () => {
    const grid = [passing('2027-01-02T00:00:00Z')]
    expect(nearestEquivalent(grid, '2027-01-02T00:00:00Z', DEFAULT_REQUIREMENTS)?.start_utc).toBe(
      '2027-01-02T00:00:00Z',
    )
  })

  test('picks the earliest start even when the grid is out of order', () => {
    const grid = [passing('2027-01-05T00:00:00Z'), passing('2027-01-03T00:00:00Z')]
    expect(nearestEquivalent(grid, '2027-01-02T00:00:00Z', DEFAULT_REQUIREMENTS)?.start_utc).toBe(
      '2027-01-03T00:00:00Z',
    )
  })

  test('returns null when nothing later passes', () => {
    const grid = [failing('2027-01-03T00:00:00Z')]
    expect(
      nearestEquivalent(grid, '2027-01-02T00:00:00Z', requirements({ max_darkness_hours: 48 })),
    ).toBeNull()
  })

  test('ignores slots with an unparsable start', () => {
    const grid = [passing('broken'), passing('2027-01-03T00:00:00Z')]
    expect(nearestEquivalent(grid, '2027-01-02T00:00:00Z', DEFAULT_REQUIREMENTS)?.start_utc).toBe(
      '2027-01-03T00:00:00Z',
    )
  })
})

describe('clampSlipDays', () => {
  test('keeps integers inside 1…90', () => {
    expect(clampSlipDays(1)).toBe(SLIP_MIN_DAYS)
    expect(clampSlipDays(30)).toBe(30)
    expect(clampSlipDays(90)).toBe(SLIP_MAX_DAYS)
  })

  test('clamps out-of-range and rounds fractions', () => {
    expect(clampSlipDays(0)).toBe(1)
    expect(clampSlipDays(-5)).toBe(1)
    expect(clampSlipDays(91)).toBe(90)
    expect(clampSlipDays(30.4)).toBe(30)
    expect(clampSlipDays(30.5)).toBe(31)
  })

  test('non-finite input falls back to the minimum', () => {
    expect(clampSlipDays(Number.NaN)).toBe(1)
    expect(clampSlipDays(Number.POSITIVE_INFINITY)).toBe(1)
  })
})
