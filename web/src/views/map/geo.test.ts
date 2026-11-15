import { expect, test } from 'vitest'
import { latLonToVector3, subBodyPoint, type Vec3, vectorFromAzEl, vectorToLatLon } from './geo'

function close(actual: Vec3, expected: Vec3, digits = 9) {
  expect(actual.x).toBeCloseTo(expected.x, digits)
  expect(actual.y).toBeCloseTo(expected.y, digits)
  expect(actual.z).toBeCloseTo(expected.z, digits)
}

test('(0°, 0°) is +X, north pole is +Y, 90°E is −Z', () => {
  close(latLonToVector3(0, 0), { x: 1, y: 0, z: 0 })
  close(latLonToVector3(90, 0), { x: 0, y: 1, z: 0 })
  close(latLonToVector3(-90, 123), { x: 0, y: -1, z: 0 })
  close(latLonToVector3(0, 90), { x: 0, y: 0, z: -1 })
  close(latLonToVector3(0, -90), { x: 0, y: 0, z: 1 })
  close(latLonToVector3(0, 180), { x: -1, y: 0, z: 0 })
})

test('radius scales the vector', () => {
  const unit = latLonToVector3(30, 45, 1)
  close(latLonToVector3(30, 45, 2), { x: 2 * unit.x, y: 2 * unit.y, z: 2 * unit.z })
  expect(Math.hypot(...Object.values(latLonToVector3(30, 45, 2)))).toBeCloseTo(2, 9)
})

test('lat/lon survives a round trip, poles and ±180° included', () => {
  const cases = [
    [0, 0],
    [0.674, 23.473],
    [20.191, 30.772],
    [-45.445, 177.599],
    [-89.5, 0],
    [12.5, -179.9],
    [-33, 180],
  ]
  for (const [lat, lon] of cases) {
    const back = vectorToLatLon(latLonToVector3(lat, lon))
    expect(back.lat_deg).toBeCloseTo(lat, 9)
    // ±180° is the same point on the sphere - atan2 returns one of the two values.
    const lonDiff = Math.abs(((back.lon_deg - lon + 540) % 360) - 180)
    expect(lonDiff).toBeCloseTo(0, 6)
  }
})

test('a survey point on the visible side sits east of the disc centre', () => {
  // The camera stands on +X (subsolar/sub-Earth point ~(0°,0°)), east is −Z.
  const apollo11 = latLonToVector3(0.674, 23.473) // Mare Tranquillitatis
  const crisium = latLonToVector3(17, 59) // Mare Crisium, farther east
  expect(apollo11.x).toBeGreaterThan(0.9)
  expect(apollo11.z).toBeLessThan(-0.3)
  expect(crisium.z).toBeLessThan(apollo11.z)
})

test('azimuth 0 → north, 90 → east, zenith → up', () => {
  close(vectorFromAzEl(0, 0, 0, 0), { x: 0, y: 1, z: 0 })
  close(vectorFromAzEl(0, 0, 90, 0), { x: 0, y: 0, z: -1 })
  close(vectorFromAzEl(0, 0, 180, 0), { x: 0, y: -1, z: 0 })
  close(vectorFromAzEl(0, 0, 0, 90), { x: 1, y: 0, z: 0 })
  close(vectorFromAzEl(60, 0, 0, 90), latLonToVector3(60, 0), 9)
})

test('az/el at an off-equator site keeps the frame orthonormal', () => {
  const up = latLonToVector3(60, 30)
  const north = vectorFromAzEl(60, 30, 0, 0)
  const east = vectorFromAzEl(60, 30, 90, 0)
  const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z
  expect(dot(up, north)).toBeCloseTo(0, 9)
  expect(dot(up, east)).toBeCloseTo(0, 9)
  expect(dot(north, east)).toBeCloseTo(0, 9)
  expect(Math.hypot(east.x, east.y, east.z)).toBeCloseTo(1, 9)
})

test('the subsolar point recovered from az/el is the point the Sun stands over', () => {
  // The Sun over (10°, 40°E) seen from (0°, 0°): azimuth and elevation straight from the sphere.
  const site = { lat: 0, lon: 0 }
  const target = latLonToVector3(10, 40)
  const latRad = site.lat * (Math.PI / 180)
  const lonRad = site.lon * (Math.PI / 180)
  const up = latLonToVector3(site.lat, site.lon)
  const north = { x: -Math.sin(latRad) * Math.cos(lonRad), y: Math.cos(latRad), z: Math.sin(latRad) * Math.sin(lonRad) }
  const east = { x: -Math.sin(lonRad), y: 0, z: -Math.cos(lonRad) }
  const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z
  const el = (Math.asin(dot(target, up)) * 180) / Math.PI
  const az = (Math.atan2(dot(target, east), dot(target, north)) * 180) / Math.PI

  const back = vectorToLatLon(vectorFromAzEl(0, 0, az, el))
  expect(back.lat_deg).toBeCloseTo(10, 6)
  expect(back.lon_deg).toBeCloseTo(40, 6)
})

// Values from /api/timeline (lat 0, lon 0) and /api/optimal-site (cursor_bodies) for 2027-03-10T12:00:00Z.
test('subBodyPoint finds the subsolar point from az/el seen at (0°, 0°)', () => {
  const point = subBodyPoint(88.521, -59.622)
  expect(point.lat_deg).toBeCloseTo(0.748, 2)
  expect(point.lon_deg).toBeCloseTo(149.63, 1)
})

test('subBodyPoint finds the sub-Earth point the same way (within 0.05° of the API)', () => {
  const point = subBodyPoint(225.314, 82.158)
  expect(Math.abs(point.lat_deg - -5.481)).toBeLessThan(0.05)
  expect(Math.abs(point.lon_deg - -5.568)).toBeLessThan(0.05)
})
