// Karta rekomendacji: miejsce, dzień, godzina, trzy oceny i wyjaśnienie.

import type { Site } from '../../api/types'
import DayStrip from './DayStrip'
import { whyText } from './explain'
import { formatDay, formatDuration, formatLocalTime, formatPercent, formatUtcTime } from './format'
import { type Priority, type RankedCandidate, type Rating, rateDarkness, rateFraction } from './ranking'

const RATING_TEXT: Record<Rating, string> = { great: 'Great', okay: 'Okay', poor: 'Poor' }
const RATING_ICON: Record<Rating, string> = { great: '●', okay: '◐', poor: '○' }

function Metric({ icon, label, value, rating }: { icon: string; label: string; value: string; rating: Rating }) {
  return (
    <li className={`guide-metric rating-${rating}`}>
      <span className="guide-metric-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="guide-metric-label">{label}</span>
      <span className="guide-metric-value">{value}</span>
      <span className="guide-rating">
        <span aria-hidden="true">{RATING_ICON[rating]} </span>
        {RATING_TEXT[rating]}
      </span>
    </li>
  )
}

function sunText(fraction: number, maxDarknessHours: number): string {
  if (maxDarknessHours < 0.5) return 'Sun up the whole mission'
  if (fraction <= 0.01) return 'No sunlight'
  return `Sun up ${formatPercent(fraction)} of the time`
}

interface ResultCardProps {
  candidate: RankedCandidate
  priority: Priority
  durationHours: number
  headingRef?: React.Ref<HTMLHeadingElement>
  onOpenExpert: (site: Site, start_utc: string, duration_hours: number, viewId: 'sky' | 'timeline') => void
}

export default function ResultCard({ candidate, priority, durationHours, headingRef, onOpenExpert }: ResultCardProps) {
  const { site, slot } = candidate
  const open = (viewId: 'sky' | 'timeline') => onOpenExpert(site, slot.start_utc, durationHours, viewId)

  return (
    <article className="guide-result" aria-labelledby="guide-best-heading">
      <p className="guide-eyebrow">Best choice</p>
      <h2 id="guide-best-heading" ref={headingRef} tabIndex={-1}>
        {site.name}
      </h2>
      <p className="guide-when">
        <strong>Land on {formatDay(slot.start_utc)}</strong>
        <span>
          {' '}
          at {formatUtcTime(slot.start_utc)} ({formatLocalTime(slot.start_utc)})
        </span>
      </p>

      <ul className="guide-metrics">
        <Metric
          icon="☀"
          label="Solar power"
          value={sunText(slot.sun_visible_fraction, slot.max_darkness_hours)}
          rating={rateFraction(slot.sun_visible_fraction)}
        />
        <Metric
          icon="🌍"
          label="Talking to Earth"
          value={`Earth in view ${formatPercent(slot.earth_visible_fraction)} of the time`}
          rating={rateFraction(slot.earth_visible_fraction)}
        />
        <Metric
          icon="🌑"
          label="Longest darkness"
          value={formatDuration(slot.max_darkness_hours)}
          rating={rateDarkness(slot.max_darkness_hours)}
        />
      </ul>

      <p className="guide-why">
        <strong>Why: </strong>
        {whyText(candidate, priority)}
      </p>

      <DayStrip lat_deg={site.lat_deg} lon_deg={site.lon_deg} start_utc={slot.start_utc} hours={durationHours} />

      <div className="guide-actions">
        <button type="button" className="guide-primary" onClick={() => open('sky')}>
          See it in the sky →
        </button>
        <button type="button" onClick={() => open('timeline')}>
          Day-by-day details
        </button>
      </div>
    </article>
  )
}
