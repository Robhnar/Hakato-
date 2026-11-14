import { expect, test } from 'vitest'
import type { CalendarSlot } from '../../api/types'
import { approximateNote, whyText } from './explain'
import type { RankedCandidate } from './ranking'

function cand(change: Partial<CalendarSlot> = {}): RankedCandidate {
  return {
    site: { id: 'ridge', name: 'Ridge', lat_deg: -89.4, lon_deg: -137, category: 'candidate', landing_utc: null },
    points: 90,
    slot: {
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
    },
  }
}

test('whyText praises constant sunlight for a power mission', () => {
  expect(whyText(cand(), 'power')).toContain('whole mission')
})

test('whyText mentions Earth when contact is the priority', () => {
  expect(whyText(cand({ earth_visible_fraction: 0.95 }), 'earth')).toContain('Earth')
})

test('whyText warns about a long night', () => {
  const text = whyText(cand({ sun_visible_fraction: 0.4, max_darkness_hours: 200 }), 'power')
  expect(text).toContain('night')
  expect(text).toContain('about 8 days')
})

test('whyText warns about landing in the dark', () => {
  expect(whyText(cand({ sun_el_at_start_deg: -1 }), 'power')).toContain('dark')
})

test('approximateNote speaks up only for placeholder data', () => {
  expect(approximateNote({ ephemeris: 'placeholder', horizon: 'lola' })).toContain('approximate')
  expect(approximateNote({ ephemeris: 'spice', horizon: 'lola' })).toBeNull()
  expect(approximateNote(null)).toBeNull()
})

test('whyText does not promise constant sunlight when a short night exists', () => {
  const text = whyText(cand({ sun_visible_fraction: 0.995, max_darkness_hours: 2 }), 'power')
  expect(text).not.toContain('whole mission')
  expect(text).toContain('briefly')
})
