// Wybór miejsca na mapie w trybie prowadzonym: dopasowanie kliknięcia do miejsca z katalogu
// albo własny punkt.

import type { Site } from '../../api/types'
import { formatCoords, wrapLon } from '../format'

/** `answers.place` dla punktu wskazanego na mapie poza katalogiem. */
export const PIN_ID = 'pin'

const SAME_POINT_DEG = 1e-6

/** Miejsce z katalogu o dokładnie tych współrzędnych (znacznik na globusie wysyła je bez zmian). */
export function siteAt(sites: Site[], lat_deg: number, lon_deg: number): Site | null {
  return (
    sites.find(
      (site) =>
        Math.abs(site.lat_deg - lat_deg) < SAME_POINT_DEG &&
        Math.abs(wrapLon(site.lon_deg) - wrapLon(lon_deg)) < SAME_POINT_DEG,
    ) ?? null
  )
}

/** Własny punkt jako `Site`, żeby reszta trybu prowadzonego traktowała go jak miejsce z katalogu. */
export function pinnedSite(lat_deg: number, lon_deg: number): Site {
  const lon = wrapLon(lon_deg)
  return {
    id: PIN_ID,
    name: `Pinned place ${formatCoords(lat_deg, lon)}`,
    lat_deg,
    lon_deg: lon,
    category: 'candidate',
    landing_utc: null,
  }
}
