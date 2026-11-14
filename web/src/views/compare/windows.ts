import type { VisibilityWindow } from '../../api/types'
import { visibilitySegments } from '../timeline/windows'

export interface HourBand {
  startHours: number
  endHours: number
}

/** Przelicza UTC na godziny od startu scenariusza. */
export function hoursFromStart(startUtc: string, instantUtc: string): number {
  return (Date.parse(instantUtc) - Date.parse(startUtc)) / 3_600_000
}

/** Okna widoczności jako pasy na osi 0…durationHours. */
export function bandsFromWindows(
  startUtc: string,
  durationHours: number,
  windows: VisibilityWindow[],
): HourBand[] {
  const bands: HourBand[] = []
  for (const window of windows) {
    const startHours = Math.max(0, hoursFromStart(startUtc, window.start_utc))
    const endHours = Math.min(durationHours, hoursFromStart(startUtc, window.end_utc))
    if (endHours > startHours) bands.push({ startHours, endHours })
  }
  return bands
}

/** Buduje okna z serii `visible` na wspólnej siatce czasu (wspólna implementacja z Timeline). */
export function windowsFromVisibility(
  timesUtc: string[],
  visible: boolean[],
): VisibilityWindow[] {
  return visibilitySegments(timesUtc, visible)
}
