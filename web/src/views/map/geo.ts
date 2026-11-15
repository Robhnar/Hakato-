// Conversions latitude/longitude <-> point on the sphere for the globe.
//
// Frame: +X = (0°, 0°), +Y = north pole, +Z = 90° west longitude.
// This is a right-handed rotation of the backend's ME frame (there +Z is the pole), so a camera
// placed over the point (0°, 0°) sees north at the top and east on the right -
// just as Earth sees the Moon. Lighting and markers must use the
// same frame; the globe texture is mirrored because SphereGeometry
// wraps UVs the other way (see MoonGlobe.tsx).

export interface Vec3 {
  x: number
  y: number
  z: number
}

const DEG = Math.PI / 180

export function latLonToVector3(lat_deg: number, lon_deg: number, radius = 1): Vec3 {
  const lat = lat_deg * DEG
  const lon = lon_deg * DEG
  const r = radius * Math.cos(lat)
  return { x: r * Math.cos(lon), y: radius * Math.sin(lat), z: -r * Math.sin(lon) }
}

export function vectorToLatLon(v: Vec3): { lat_deg: number; lon_deg: number } {
  const r = Math.hypot(v.x, v.y, v.z) || 1
  return {
    lat_deg: Math.asin(Math.max(-1, Math.min(1, v.y / r))) / DEG,
    lon_deg: Math.atan2(-v.z, v.x) / DEG,
  }
}

/** Unit vector to a body from the azimuth and elevation seen from (lat, lon). */
export function vectorFromAzEl(lat_deg: number, lon_deg: number, az_deg: number, el_deg: number): Vec3 {
  const lat = lat_deg * DEG
  const lon = lon_deg * DEG
  const az = az_deg * DEG
  const el = el_deg * DEG

  const up = { x: Math.cos(lat) * Math.cos(lon), y: Math.sin(lat), z: -Math.cos(lat) * Math.sin(lon) }
  const north = { x: -Math.sin(lat) * Math.cos(lon), y: Math.cos(lat), z: Math.sin(lat) * Math.sin(lon) }
  const east = { x: -Math.sin(lon), y: 0, z: -Math.cos(lon) }

  const c = Math.cos(el)
  const s = Math.sin(el)
  return {
    x: c * (Math.cos(az) * north.x + Math.sin(az) * east.x) + s * up.x,
    y: c * (Math.cos(az) * north.y + Math.sin(az) * east.y) + s * up.y,
    z: c * (Math.cos(az) * north.z + Math.sin(az) * east.z) + s * up.z,
  }
}

/**
 * The point on the Moon under a body (subsolar, sub-Earth): the direction to the body seen from (0°, 0°),
 * i.e. from the azimuth and elevation returned by /api/timeline for that point. Parallax error
 * (observer on the surface, not at the center) is about 0.03° for Earth, negligible for the Sun.
 */
export function subBodyPoint(az_deg: number, el_deg: number): { lat_deg: number; lon_deg: number } {
  return vectorToLatLon(vectorFromAzEl(0, 0, az_deg, el_deg))
}
