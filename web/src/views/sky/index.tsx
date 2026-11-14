import { api } from '../../api/client'
import { useAsync } from '../../api/useAsync'
import { type ViewProps, toRangeQuery } from '../../app/scenario'

// Zaślepka - zadanie 006 zastępuje ją panoramą horyzontu.
// Pokazuje, jak widok pobiera dane: przebieg w czasie + profil horyzontu.
export default function SkyView({ active }: ViewProps) {
  const query = toRangeQuery(active, 60)
  const timeline = useAsync(() => api.timeline(query), JSON.stringify(query))
  const horizon = useAsync(
    () => api.horizon(active.lat_deg, active.lon_deg),
    `${active.lat_deg},${active.lon_deg}`,
  )

  if (timeline.error || horizon.error) {
    return <p className="error">{timeline.error ?? horizon.error}</p>
  }
  if (!timeline.data || !horizon.data) return <p>Loading…</p>

  const { sun, earth } = timeline.data
  return (
    <div className="placeholder">
      <h2>Sky view</h2>
      <p>
        At start: Sun az {sun.az_deg[0].toFixed(1)}°, el {sun.el_deg[0].toFixed(2)}° · Earth az{' '}
        {earth.az_deg[0].toFixed(1)}°, el {earth.el_deg[0].toFixed(2)}°
      </p>
      <p>
        Horizon profile: {horizon.data.elevation_deg.length} samples, source “{horizon.data.source}”
      </p>
    </div>
  )
}
