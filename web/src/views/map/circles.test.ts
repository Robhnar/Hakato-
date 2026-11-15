import { describe, expect, it } from 'vitest'
import { angularDistanceDeg } from './heatmap'
import { GRATICULE, horizonCircle, meridianPoints, parallelPoints } from './circles'

describe('circles', () => {
  it('every point of the horizon circle lies 90° from the center', () => {
    const center = { lat_deg: -1.2, lon_deg: 13 }
    for (const p of horizonCircle(center, 72)) {
      expect(angularDistanceDeg(p.lat_deg, p.lon_deg, center.lat_deg, center.lon_deg)).toBeCloseTo(90, 6)
    }
  })

  it('the horizon circle works for a center at the pole and is closed', () => {
    const circle = horizonCircle({ lat_deg: 90, lon_deg: 0 }, 36)
    expect(circle).toHaveLength(37)
    expect(circle.every((p) => Math.abs(p.lat_deg) < 1e-6)).toBe(true)
    expect(circle[0]).toEqual(circle[36])
  })

  it('a parallel and a meridian have a constant coordinate', () => {
    expect(parallelPoints(-85, 8).every((p) => p.lat_deg === -85)).toBe(true)
    expect(meridianPoints(30, 4).map((p) => p.lat_deg)).toEqual([-90, -45, 0, 45, 90])
  })

  it('a parallel is closed, a meridian joins both poles', () => {
    const parallel = parallelPoints(-80, 12)
    expect(parallel).toHaveLength(13)
    expect(parallel[0]).toEqual(parallel[12])
    const meridian = meridianPoints(0, 8)
    expect(meridian[0].lat_deg).toBe(-90)
    expect(meridian[8].lat_deg).toBe(90)
    expect(meridian.every((p) => p.lon_deg === 0)).toBe(true)
  })

  it('the grid has the equator, the prime meridian and the 80°/85° rings', () => {
    expect(GRATICULE.parallels).toEqual([-85, -80, -60, -30, 0, 30, 60, 80, 85])
    expect(GRATICULE.meridians).toContain(0)
    expect(GRATICULE.meridians).toContain(180)
    expect(GRATICULE.meridians).toHaveLength(12)
  })
})
