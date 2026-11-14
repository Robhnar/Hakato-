import type { ViewProps } from '../../app/scenario'

// Zaślepka - zadanie 007 zastępuje ją osią czasu z oknami zasilania i łączności.
export default function TimelineView({ active, cursor_utc }: ViewProps) {
  return (
    <div className="placeholder">
      <h2>Timeline</h2>
      <p>
        {active.name}: {active.duration_hours.toFixed(0)} h from {active.start_utc}
      </p>
      <p>Time cursor: {cursor_utc}</p>
    </div>
  )
}
