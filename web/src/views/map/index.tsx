import { useState } from 'react'
import { api } from '../../api/client'
import { useAsync } from '../../api/useAsync'
import { toIsoZ, type ViewProps } from '../../app/scenario'
import { vectorFromAzEl, vectorToLatLon } from './geo'
import type { OptimalSiteResponse, OptimalWeights } from '../../api/types'
import { overlayQuery, WEIGHT_PRESETS } from './heatmap'
import MoonGlobe from './MoonGlobe'
import OptimalZonePanel from './OptimalZonePanel'
import './map.css'

// Słońce nad punktem (0°, 0°) daje azymut i wysokość, z których odtwarzamy
// kierunek do Słońca w układzie globusa. API nie podaje wprost punktu podsłonecznego.
const SUN_REFERENCE_QUERY = { lat_deg: 0, lon_deg: 0, step_minutes: 1 }

function minutesLater(utc: string, minutes: number): string {
  return toIsoZ(new Date(new Date(utc).getTime() + minutes * 60_000))
}

function latitude(lat_deg: number): string {
  return `${Math.abs(lat_deg).toFixed(1)}°${lat_deg >= 0 ? 'N' : 'S'}`
}

function longitude(lon_deg: number): string {
  return `${Math.abs(lon_deg).toFixed(1)}°${lon_deg >= 0 ? 'E' : 'W'}`
}

export default function MapView({ scenarios, active, cursor_utc, selectScenario, pickLocation }: ViewProps) {
  const sites = useAsync(() => api.sites(), 'sites')
  const sun = useAsync(
    () =>
      api.timeline({
        ...SUN_REFERENCE_QUERY,
        start_utc: cursor_utc,
        end_utc: minutesLater(cursor_utc, 1),
      }),
    cursor_utc,
  )
  const [southPoleRequest, setSouthPoleRequest] = useState(0)
  const [overlayEnabled, setOverlayEnabled] = useState(false)
  const [weights, setWeights] = useState<OptimalWeights>(() => ({ ...WEIGHT_PRESETS[0].weights }))

  // Warstwa ON/OFF (zadanie 019). Przy OFF nie wołamy API wcale - loader
  // rozwiązuje się od razu wartością null, a klucz nie zmienia się z wagami.
  const optimalQuery = overlayQuery(active, cursor_utc, weights)
  const optimal = useAsync<OptimalSiteResponse | null>(
    () => (overlayEnabled ? api.optimalSite(optimalQuery) : Promise.resolve(null)),
    overlayEnabled ? JSON.stringify(optimalQuery) : 'overlay-off',
  )

  if (sites.error || sun.error) return <p className="error" role="alert">{sites.error ?? sun.error}</p>
  if (!sites.data || !sun.data) return <p role="status">Loading…</p>
  if (sun.data.times_utc.length === 0) return <p role="status">No visibility samples in this window.</p>

  const sunDir = vectorFromAzEl(0, 0, sun.data.sun.az_deg[0], sun.data.sun.el_deg[0])
  const subsolar = vectorToLatLon(sunDir)

  return (
    <div className="map-view">
      <div className="map-toolbar">
        <h2>Moon globe</h2>
        <button type="button" onClick={() => setSouthPoleRequest((request) => request + 1)}>
          South pole view
        </button>
        <button
          type="button"
          className={`map-overlay-toggle${overlayEnabled ? ' on' : ''}`}
          aria-pressed={overlayEnabled}
          onClick={() => setOverlayEnabled((enabled) => !enabled)}
        >
          Optimal zone overlay: {overlayEnabled ? 'ON' : 'OFF'}
        </button>
        <span className="map-hint">
          Sun overhead at {latitude(subsolar.lat_deg)}, {longitude(subsolar.lon_deg)} — {cursor_utc}
        </span>
      </div>

      <MoonGlobe
        sites={sites.data}
        scenarios={scenarios}
        activeId={active.id}
        sunDir={sunDir}
        onSelect={selectScenario}
        onPick={pickLocation}
        southPoleRequest={southPoleRequest}
        overlayEnabled={overlayEnabled}
        optimalSite={overlayEnabled ? optimal.data : null}
      />

      {overlayEnabled && (
        <OptimalZonePanel
          data={optimal.data}
          loading={optimal.loading}
          error={optimal.error}
          weights={weights}
          onWeightsChange={setWeights}
          onMove={pickLocation}
        />
      )}

      <p className="map-legend">
        <span className="map-dot map-dot-site" /> catalogue sites
        <span className="map-dot map-dot-scenario" /> scenarios
        <span className="map-dot map-dot-active" /> active scenario
      </p>
      <p className="map-hint">
        Drag to rotate, scroll to zoom. Click the surface to move the active scenario there; click a scenario
        marker to select it.
      </p>

      <ul className="map-list">
        {scenarios.map((scenario) => (
          <li key={scenario.id}>
            <button
              type="button"
              className={scenario.id === active.id ? 'selected' : ''}
              onClick={() => selectScenario(scenario.id)}
            >
              {scenario.name}
            </button>
            <span>
              {latitude(scenario.lat_deg)}, {longitude(scenario.lon_deg)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
