import type { ViewProps } from '../../app/scenario'

// Zaślepka - zadanie 009 zastępuje ją mapą lub globusem 3D.
export default function MapView({ scenarios }: ViewProps) {
  return (
    <div className="placeholder">
      <h2>Map</h2>
      <ul>
        {scenarios.map((scenario) => (
          <li key={scenario.id}>
            {scenario.name}: {scenario.lat_deg.toFixed(3)}°, {scenario.lon_deg.toFixed(3)}°
          </li>
        ))}
      </ul>
    </div>
  )
}
