import type { VisibilityWindow } from '../../api/types'
import { visibilitySegments } from '../timeline/windows'

export interface HourBand {
  startHours: number
  endHours: number
}

/** Converts UTC to hours since the scenario start. */
export function hoursFromStart(startUtc: string, instantUtc: string): number {
  return (Date.parse(instantUtc) - Date.parse(startUtc)) / 3_600_000
}

/** Visibility windows as bands on the 0…durationHours axis. */
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

/** Builds windows from a `visible` series on a shared time grid (implementation shared with Timeline). */
export function windowsFromVisibility(
  timesUtc: string[],
  visible: boolean[],
): VisibilityWindow[] {
  return visibilitySegments(timesUtc, visible)
}
