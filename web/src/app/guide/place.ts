// Site selection on the map in guided mode: matching a click to a catalog site
// or a custom point.

import type { Site } from '../../api/types'
import { formatCoords, wrapLon } from '../format'

/** `answers.place` for a point picked on the map outside the catalog. */
export const PIN_ID = 'pin'

const SAME_POINT_DEG = 1e-6

/** The catalog site with exactly these coordinates (the globe marker sends them unchanged). */
export function siteAt(sites: Site[], lat_deg: number, lon_deg: number): Site | null {
  return (
    sites.find(
      (site) =>
        Math.abs(site.lat_deg - lat_deg) < SAME_POINT_DEG &&
        Math.abs(wrapLon(site.lon_deg) - wrapLon(lon_deg)) < SAME_POINT_DEG,
    ) ?? null
  )
}

/** A custom point as a `Site`, so the rest of guided mode treats it like a catalog site. */
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
