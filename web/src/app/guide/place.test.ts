import { expect, test } from 'vitest'
import type { Site } from '../../api/types'
import { PIN_ID, pinnedSite, siteAt } from './place'

const SITES: Site[] = [
  { id: 'a', name: 'Site A', lat_deg: -89.45, lon_deg: -137.3, category: 'candidate', landing_utc: null },
  { id: 'b', name: 'Site B', lat_deg: -85.5, lon_deg: 30, category: 'clps', landing_utc: null },
]

test('siteAt finds a catalogue site by its exact coordinates', () => {
  expect(siteAt(SITES, -89.45, -137.3)?.id).toBe('a')
})

test('siteAt matches the same longitude written the other way round', () => {
  expect(siteAt(SITES, -89.45, 222.7)?.id).toBe('a')
})

test('siteAt returns null for a point that is only near a site', () => {
  expect(siteAt(SITES, -89.0, -137.3)).toBeNull()
  expect(siteAt(SITES, -85.5, 31)).toBeNull()
})

test('pinnedSite describes the clicked point with the shared coordinate format', () => {
  const pin = pinnedSite(-89.45, 222.7)
  expect(pin.id).toBe(PIN_ID)
  expect(pin.lon_deg).toBeCloseTo(-137.3, 6)
  expect(pin.name).toBe('Pinned place 89.45°S 137.30°W')
  expect(pin.landing_utc).toBeNull()
})
