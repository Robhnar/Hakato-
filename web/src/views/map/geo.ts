// Przeliczenia szerokość/długość <-> punkt na kuli dla globusa.
//
// Układ: +X = (0°, 0°), +Y = biegun północny, +Z = 90° długości zachodniej.
// To obrót prawoskrętny układu ME z backendu (tam +Z to biegun), więc kamera
// postawiona nad punktem (0°, 0°) widzi północ u góry i wschód po prawej -
// tak jak Ziemia widzi Księżyc. Oświetlenie i znaczniki muszą używać tego
// samego układu; tekstura globusa jest odbita lustrzanie, bo SphereGeometry
// nawija UV w drugą stronę (patrz MoonGlobe.tsx).

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

/** Wektor jednostkowy do ciała z azymutu i wysokości widzianych z (lat, lon). */
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
