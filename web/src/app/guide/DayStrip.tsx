// Pasek dzień po dniu: kolumny pokazują, jaką część każdego dnia UTC Słońce
// i Ziemia są nad horyzontem. Dane z api.timeline, agregacja z daily.ts.

import { api } from '../../api/client'
import { useAsync } from '../../api/useAsync'
import { dailyShares, type DayShare } from './daily'

/** Dodaje `hours` do czasu UTC i zwraca ISO bez milisekund. */
function addHours(startUtc: string, hours: number): string {
  return new Date(new Date(startUtc).getTime() + hours * 3600 * 1000).toISOString().slice(0, 19) + 'Z'
}

/** 'YYYY-MM-DD' → 'Wed 3 May' (UTC, en-GB). */
function formatDay(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}

/** Łączy kolejne trójki dni, uśredniając udziały; etykieta = pierwszy dzień. */
function groupShares(shares: DayShare[]): DayShare[] {
  const columns: DayShare[] = []
  for (let i = 0; i < shares.length; i += 3) {
    const group = shares.slice(i, i + 3)
    columns.push({
      day: group[0].day,
      sun: group.reduce((sum, d) => sum + d.sun, 0) / group.length,
      earth: group.reduce((sum, d) => sum + d.earth, 0) / group.length,
    })
  }
  return columns
}

export default function DayStrip({
  lat_deg,
  lon_deg,
  start_utc,
  hours,
}: {
  lat_deg: number
  lon_deg: number
  start_utc: string
  hours: number
}) {
  const end_utc = addHours(start_utc, hours)
  const step_minutes = hours > 400 ? 180 : 60
  const query = { lat_deg, lon_deg, start_utc, end_utc, step_minutes }
  const { data, error, loading } = useAsync(() => api.timeline(query), JSON.stringify(query))

  if (loading) {
    return (
      <p className="day-strip-status" role="status">
        Loading day-by-day view…
      </p>
    )
  }
  if (error) {
    return <p className="day-strip-status">Day-by-day view unavailable.</p>
  }
  if (!data) return null

  const shares = dailyShares(data)
  const grouped = shares.length > 31
  const columns: DayShare[] = grouped ? groupShares(shares) : shares
  if (columns.length === 0) return null

  const word = grouped ? 'periods' : 'days'
  const n = columns.length
  const sunUp = columns.filter((c) => c.sun >= 0.5).length
  const earthUp = columns.filter((c) => c.earth >= 0.5).length
  const summary = `Sun up on ${sunUp} of ${n} ${word}, Earth visible on ${earthUp} of ${n} ${word}`
  const first = formatDay(columns[0].day)
  const last = formatDay(columns[columns.length - 1].day)

  return (
    <figure className="day-strip">
      <div className="day-strip-bars" role="img" aria-label={summary}>
        {columns.map((c) => (
          <div
            key={c.day}
            className="day-col"
            title={`${formatDay(c.day)}: Sun ${Math.round(c.sun * 100)}%, Earth ${Math.round(c.earth * 100)}%`}
          >
            <span className="day-sun" style={{ height: `${Math.round(c.sun * 100)}%` }} />
            <span className="day-earth" style={{ height: `${Math.round(c.earth * 100)}%` }} />
          </div>
        ))}
      </div>
      <figcaption>
        <span className="legend-sun">Sun up</span> <span className="legend-earth">Earth in view</span>
        <span className="day-strip-range">
          {first} – {last}
        </span>
      </figcaption>
    </figure>
  )
}
