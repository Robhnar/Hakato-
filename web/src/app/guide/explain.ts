// Wyjaśnienia zwykłym językiem: dlaczego ten termin i czy dane są przybliżone.

import type { Meta } from '../../api/types'
import { formatDuration } from './format'
import type { Priority, RankedCandidate } from './ranking'

export function whyText(c: RankedCandidate, priority: Priority): string {
  const { slot } = c
  const parts: string[] = []

  if (slot.max_darkness_hours < 0.5) {
    parts.push('The Sun stays above the hills here for the whole mission, so solar panels never go dark.')
  } else if (slot.max_darkness_hours > 24) {
    parts.push(
      `The Sun sets for a while: the longest night lasts ${formatDuration(slot.max_darkness_hours)}, so the lander needs batteries for that.`,
    )
  } else {
    parts.push('The Sun dips behind the hills only briefly, so power stays steady.')
  }

  if (priority !== 'power' || slot.earth_visible_fraction >= 0.75) {
    const share = Math.round(slot.earth_visible_fraction * 100)
    parts.push(
      share >= 75
        ? 'Earth hangs above the horizon most of the time, so the team can talk to the lander directly.'
        : `Earth is in view ${share}% of the time; the rest of the time messages need a relay satellite.`,
    )
  }

  if (slot.sun_el_at_start_deg < 0) {
    parts.push('Touchdown happens while it is still dark, which makes landing harder.')
  }

  return parts.join(' ')
}

export function approximateNote(meta: Meta | null): string | null {
  if (meta?.ephemeris !== 'placeholder') return null
  return 'Sun and Earth positions in this demo are approximate. Use the expert tools with precise data before real planning.'
}
