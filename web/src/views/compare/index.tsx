import type { ViewProps } from '../../app/scenario'

// Zaślepka - zadanie 008 zastępuje ją porównaniem scenariuszy obok siebie.
export default function CompareView({ scenarios }: ViewProps) {
  return (
    <div className="placeholder">
      <h2>Compare</h2>
      <ul>
        {scenarios.map((scenario) => (
          <li key={scenario.id}>
            {scenario.name} · {scenario.start_utc}
          </li>
        ))}
      </ul>
    </div>
  )
}
