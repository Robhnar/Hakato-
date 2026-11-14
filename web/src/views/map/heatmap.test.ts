import { describe, expect, it } from 'vitest'
import type { Scenario } from '../../app/scenario'
import type { CursorBodies } from '../../api/types'
import {
  angularDistanceDeg,
  buildOverlayPixels,
  classifyZone,
  earthVisibleAt,
  normalizeWeights,
  overlayQuery,
  pixelForLatLon,
  sunVisibleAt,
  WEIGHT_PRESETS,
  ZONE_COLORS,
  ZONE_ORDER,
  zoneAt,
} from './heatmap'

function bodies(
  subsolar: [number, number],
  subearth: [number, number],
): CursorBodies {
  return {
    cursor_utc: '2027-02-01T06:00:00Z',
    subsolar_lat_deg: subsolar[0],
    subsolar_lon_deg: subsolar[1],
    subearth_lat_deg: subearth[0],
    subearth_lon_deg: subearth[1],
  }
}

function pixelAt(pixels: Uint8ClampedArray, width: number, x: number, y: number): number[] {
  const start = (y * width + x) * 4
  return [...pixels.slice(start, start + 4)]
}

describe('angularDistanceDeg', () => {
  it('is zero at the same point and 180° at antipodes', () => {
    expect(angularDistanceDeg(12.5, -40, 12.5, -40)).toBeCloseTo(0, 6)
    expect(angularDistanceDeg(0, 0, 0, 180)).toBeCloseTo(180, 6)
    expect(angularDistanceDeg(90, 0, -90, 0)).toBeCloseTo(180, 6)
  })

  it('measures great-circle arcs', () => {
    expect(angularDistanceDeg(0, 0, 0, 90)).toBeCloseTo(90, 6)
    expect(angularDistanceDeg(-10, 0, 10, 0)).toBeCloseTo(20, 6)
  })

  it('wraps across ±180° longitude', () => {
    expect(angularDistanceDeg(0, 179, 0, -179)).toBeCloseTo(2, 6)
    expect(angularDistanceDeg(0, 179.5, 0, -179.5)).toBeCloseTo(1, 6)
  })

  it('handles both poles without longitude artefacts', () => {
    expect(angularDistanceDeg(90, 0, 90, 123)).toBeCloseTo(0, 6)
    expect(angularDistanceDeg(-90, 0, -90, -75)).toBeCloseTo(0, 6)
  })
})

describe('visibility and zone classification', () => {
  const subsolar = { lat_deg: 0, lon_deg: 0 }

  it('treats the hemisphere within 90° of the body as visible', () => {
    expect(sunVisibleAt(0, 0, subsolar)).toBe(true)
    expect(sunVisibleAt(0, 89, subsolar)).toBe(true)
    expect(sunVisibleAt(0, 91, subsolar)).toBe(false)
    expect(sunVisibleAt(0, 180, subsolar)).toBe(false)
    expect(sunVisibleAt(89.9, 0, subsolar)).toBe(true)
    // Za horyzontem (91°) ciało znika.
    expect(sunVisibleAt(-89, 180, subsolar)).toBe(false)
    expect(earthVisibleAt(0, 45, { lat_deg: 0, lon_deg: 0 })).toBe(true)
  })

  it('classifies all four combinations', () => {
    expect(classifyZone(true, true)).toBe('sweet_spot')
    expect(classifyZone(true, false)).toBe('sun_only')
    expect(classifyZone(false, true)).toBe('earth_only')
    expect(classifyZone(false, false)).toBe('shadow')
  })

  it('uses the cursor bodies for zoneAt', () => {
    const cursor = bodies([0, 0], [0, 180])
    expect(zoneAt(0, 0, cursor)).toBe('sun_only')
    expect(zoneAt(0, 180, cursor)).toBe('earth_only')
    expect(zoneAt(-89, 0, cursor)).toBe('sun_only')
    expect(zoneAt(-89, 180, cursor)).toBe('earth_only')

    const sameBody = bodies([0, 0], [0, 0])
    expect(zoneAt(0, 0, sameBody)).toBe('sweet_spot')
    expect(zoneAt(0, 180, sameBody)).toBe('shadow')
  })
})

describe('pixelForLatLon / buildOverlayPixels', () => {
  const width = 64
  const height = 32

  it('puts row 0 at the north pole and the last row at the south pole', () => {
    expect(pixelForLatLon(width, height, 90, 0).y).toBe(0)
    expect(pixelForLatLon(width, height, -90, 0).y).toBe(height - 1)
    expect(pixelForLatLon(width, height, 0, 0).y).toBe(Math.floor(height / 2))
  })

  it('wraps +180° and −180° to the same column', () => {
    expect(pixelForLatLon(width, height, 0, 180).x).toBe(
      pixelForLatLon(width, height, 0, -180).x,
    )
  })

  it('returns a full RGBA buffer', () => {
    const pixels = buildOverlayPixels(width, height, bodies([0, 0], [0, 180]))
    expect(pixels).toBeInstanceOf(Uint8ClampedArray)
    expect(pixels.length).toBe(width * height * 4)
  })

  it('paints the subsolar point as sun-lit and its antipode as shadow / Earth', () => {
    // Słońce nad (0°, 0°), Ziemia nad przeciwległym punktem (0°, 180°).
    const cursor = bodies([0, 0], [0, 180])
    const pixels = buildOverlayPixels(width, height, cursor)

    const sun = pixelForLatLon(width, height, 0, 0)
    expect(pixelAt(pixels, width, sun.x, sun.y)).toEqual([...ZONE_COLORS.sun_only])

    const earth = pixelForLatLon(width, height, 0, 180)
    expect(pixelAt(pixels, width, earth.x, earth.y)).toEqual([...ZONE_COLORS.earth_only])

    // Gdy oba ciała są nad tym samym punktem, antypoda jest w cieniu.
    const sameBody = buildOverlayPixels(width, height, bodies([0, 0], [0, 0]))
    const shadow = pixelForLatLon(width, height, 0, 180)
    expect(pixelAt(sameBody, width, shadow.x, shadow.y)).toEqual([...ZONE_COLORS.shadow])
  })

  it('marks the point where both bodies are visible as the sweet spot', () => {
    const pixels = buildOverlayPixels(width, height, bodies([0, 0], [0, 0]))
    const center = pixelForLatLon(width, height, 0, 0)
    expect(pixelAt(pixels, width, center.x, center.y)).toEqual([...ZONE_COLORS.sweet_spot])
  })

  it('alfa żadnej strefy nie zasłania terenu', () => {
    for (const zone of ZONE_ORDER) expect(ZONE_COLORS[zone][3]).toBeLessThanOrEqual(120)
  })

  it('wygładza granicę strefy w pasie ±0.6°', () => {
    const pixels = buildOverlayPixels(720, 360, bodies([0, 0], [0, 0]))
    const p = pixelForLatLon(720, 360, 0, 90)
    const alpha = pixelAt(pixels, 720, p.x, p.y)[3]
    expect(alpha).toBeGreaterThan(ZONE_COLORS.sweet_spot[3])
    expect(alpha).toBeLessThan(ZONE_COLORS.shadow[3])
  })
})

describe('normalizeWeights', () => {
  it('sums to one and keeps already-normalized values', () => {
    const weights = normalizeWeights({ w_sun: 0.45, w_earth: 0.25, w_overlap: 0.3 })
    expect(weights.w_sun).toBeCloseTo(0.45, 12)
    expect(weights.w_earth).toBeCloseTo(0.25, 12)
    expect(weights.w_overlap).toBeCloseTo(0.3, 12)
  })

  it('falls back to equal thirds when all weights are zero', () => {
    const weights = normalizeWeights({ w_sun: 0, w_earth: 0, w_overlap: 0 })
    expect(weights.w_sun).toBeCloseTo(1 / 3, 12)
    expect(weights.w_earth).toBeCloseTo(1 / 3, 12)
    expect(weights.w_overlap).toBeCloseTo(1 / 3, 12)
  })

  it('clamps negatives and NaN to zero', () => {
    const weights = normalizeWeights({ w_sun: -5, w_earth: 1, w_overlap: Number.NaN })
    expect(weights).toEqual({ w_sun: 0, w_earth: 1, w_overlap: 0 })
  })

  it('scales arbitrary positive weights', () => {
    const weights = normalizeWeights({ w_sun: 2, w_earth: 1, w_overlap: 1 })
    expect(weights.w_sun).toBeCloseTo(0.5, 12)
    expect(weights.w_earth).toBeCloseTo(0.25, 12)
    expect(weights.w_overlap).toBeCloseTo(0.25, 12)
  })
})

describe('WEIGHT_PRESETS / overlayQuery', () => {
  it('ships the four mission profiles, each summing to one', () => {
    expect(WEIGHT_PRESETS.map((preset) => preset.id)).toEqual([
      'balanced',
      'solar',
      'earth',
      'sweet-spot',
    ])
    for (const preset of WEIGHT_PRESETS) {
      const sum = preset.weights.w_sun + preset.weights.w_earth + preset.weights.w_overlap
      expect(sum).toBeCloseTo(1, 12)
    }
  })

  it('builds the query window from the active scenario', () => {
    const active: Scenario = {
      id: 's1',
      name: 'Test',
      lat_deg: -89,
      lon_deg: 0,
      start_utc: '2027-02-01T00:00:00Z',
      duration_hours: 24,
    }
    const query = overlayQuery(active, '2027-02-01T06:00:00Z', {
      w_sun: 0.5,
      w_earth: 0.2,
      w_overlap: 0.3,
    })
    expect(query).toEqual({
      start_utc: '2027-02-01T00:00:00Z',
      end_utc: '2027-02-02T00:00:00Z',
      cursor_utc: '2027-02-01T06:00:00Z',
      w_sun: 0.5,
      w_earth: 0.2,
      w_overlap: 0.3,
    })
  })
})
