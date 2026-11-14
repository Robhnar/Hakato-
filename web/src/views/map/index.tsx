import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../../api/client'
import type { OptimalSiteResponse, OptimalWeights } from '../../api/types'
import { useAsync } from '../../api/useAsync'
import { formatCoords } from '../../app/format'
import { toIsoZ, type ViewProps } from '../../app/scenario'
import { vectorFromAzEl, vectorToLatLon } from './geo'
import { rankCandidates } from './candidates'
import { overlayQuery, WEIGHT_PRESETS } from './heatmap'
import MoonGlobe, {
  type HoverInfo,
  type ViewRequest,
  type ViewTarget,
  type ZoomRequest,
} from './MoonGlobe'
import OptimalZonePanel from './OptimalZonePanel'
import './map.css'

// Słońce nad punktem (0°, 0°) daje azymut i wysokość, z których odtwarzamy
// kierunek do Słońca w układzie globusa. API nie podaje wprost punktu podsłonecznego.
const SUN_REFERENCE_QUERY = { lat_deg: 0, lon_deg: 0, step_minutes: 1 }

function minutesLater(utc: string, minutes: number): string {
  return toIsoZ(new Date(new Date(utc).getTime() + minutes * 60_000))
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
  const [overlayEnabled, setOverlayEnabled] = useState(false)
  const [weights, setWeights] = useState<OptimalWeights>(() => ({ ...WEIGHT_PRESETS[0].weights }))
  // Wagi z panelu zmieniają się od razu; zapytanie dostaje je po 300 ms ciszy.
  const [queryWeights, setQueryWeights] = useState(weights)
  const [retry, setRetry] = useState(0)
  const [pickedId, setPickedId] = useState<string | null>(null)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [hover, setHover] = useState<HoverInfo | null>(null)
  const [viewRequest, setViewRequest] = useState<ViewRequest | null>(null)
  const [zoomRequest, setZoomRequest] = useState<ZoomRequest | null>(null)
  const requestSeq = useRef(0)

  // Warstwa ON/OFF (zadanie 019). Przy OFF nie wołamy API wcale - loader
  // rozwiązuje się od razu wartością null, a klucz nie zmienia się z wagami.
  const optimalQuery = overlayQuery(active, cursor_utc, queryWeights)
  const optimal = useAsync<OptimalSiteResponse | null>(
    () => (overlayEnabled ? api.optimalSite(optimalQuery) : Promise.resolve(null)),
    overlayEnabled ? `${JSON.stringify(optimalQuery)}#${retry}` : 'overlay-off',
  )

  useEffect(() => {
    const timer = setTimeout(() => setQueryWeights(weights), 300)
    return () => clearTimeout(timer)
  }, [weights])

  const ranked = useMemo(() => rankCandidates(optimal.data?.ranking ?? []), [optimal.data])
  // Wybór wskazany ręcznie obowiązuje, dopóki kandydat jest w rankingu; inaczej zwycięzca.
  const selectedId =
    ranked.find((row) => row.candidate.id === pickedId)?.candidate.id ?? ranked[0]?.candidate.id ?? null

  // Punkt podsłoneczny z istniejącego zapytania o widoczność Słońca.
  const subsolar = useMemo(() => {
    if (!sun.data || sun.data.times_utc.length === 0) return null
    return vectorToLatLon(vectorFromAzEl(0, 0, sun.data.sun.az_deg[0], sun.data.sun.el_deg[0]))
  }, [sun.data])

  // Punkt podziemski tylko z danych nakładki - bez dodatkowego zapytania.
  const cursorBodies = optimal.data?.cursor_bodies ?? null
  const subearth = useMemo(
    () =>
      overlayEnabled && cursorBodies
        ? { lat_deg: cursorBodies.subearth_lat_deg, lon_deg: cursorBodies.subearth_lon_deg }
        : null,
    [overlayEnabled, cursorBodies],
  )

  function requestView(target: ViewTarget) {
    requestSeq.current += 1
    setViewRequest({ target, seq: requestSeq.current })
  }

  function requestZoom(direction: 1 | -1) {
    requestSeq.current += 1
    setZoomRequest({ direction, seq: requestSeq.current })
  }

  if (sites.error || sun.error) return <p className="error" role="alert">{sites.error ?? sun.error}</p>
  if (!sites.data || !sun.data) return <p role="status">Loading…</p>
  if (sun.data.times_utc.length === 0) return <p role="status">No visibility samples in this window.</p>

  return (
    <div className={overlayEnabled ? 'map-view has-panel' : 'map-view'}>
      <div className="map-stage">
        <MoonGlobe
          sites={sites.data}
          scenarios={scenarios}
          activeId={active.id}
          subsolar={subsolar}
          subearth={subearth}
          onSelect={selectScenario}
          onPick={pickLocation}
          viewRequest={viewRequest}
          zoomRequest={zoomRequest}
          onHover={setHover}
          overlayEnabled={overlayEnabled}
          optimalSite={overlayEnabled ? optimal.data : null}
          candidates={ranked}
          highlightId={highlightId}
          selectedId={selectedId}
          onCandidateHover={setHighlightId}
          onCandidateSelect={setPickedId}
        />

        <div className="map-toolbar" role="group" aria-label="Globe view">
          <div className="map-segment" role="group" aria-label="Camera">
            <button type="button" onClick={() => requestView('near')}>
              Near side
            </button>
            <button type="button" onClick={() => requestView('south')}>
              South pole
            </button>
            <button type="button" onClick={() => requestView('north')}>
              North pole
            </button>
          </div>
          <div className="map-segment" role="group" aria-label="Zoom">
            <button type="button" aria-label="Zoom in" onClick={() => requestZoom(1)}>
              +
            </button>
            <button type="button" aria-label="Zoom out" onClick={() => requestZoom(-1)}>
              −
            </button>
          </div>
          <button
            type="button"
            className="map-switch"
            role="switch"
            aria-checked={overlayEnabled}
            onClick={() => setOverlayEnabled((enabled) => !enabled)}
          >
            Optimal zones
          </button>
        </div>

        {hover && (
          <p className="map-readout">
            <span className="num">{formatCoords(hover.lat_deg, hover.lon_deg)}</span>
            {hover.label && <span className="map-readout-name">{hover.label}</span>}
          </p>
        )}

        <div className="map-legend" role="group" aria-label="Legend">
          <span className="map-legend-row">
            <span className="map-swatch map-swatch-site" aria-hidden="true" /> catalogue site
          </span>
          <span className="map-legend-row">
            <span className="map-swatch map-swatch-scenario" aria-hidden="true" /> scenario
          </span>
          <span className="map-legend-row">
            <span className="map-swatch map-swatch-active" aria-hidden="true" /> active scenario
          </span>
          <span className="map-legend-row">
            <span className="map-swatch map-swatch-terminator" aria-hidden="true" /> terminator
          </span>
          <span className="map-legend-row">
            <span className="map-swatch map-swatch-earth-limit" aria-hidden="true" /> Earth visibility limit
          </span>
          <span className="map-legend-hint">
            drag to rotate · scroll to zoom · click to place the scenario
          </span>
        </div>
      </div>

      {overlayEnabled && (
        <OptimalZonePanel
          data={optimal.data}
          loading={optimal.loading}
          error={optimal.error}
          weights={weights}
          onWeightsChange={setWeights}
          ranked={ranked}
          selectedId={selectedId}
          highlightId={highlightId}
          onSelect={setPickedId}
          onHighlight={setHighlightId}
          onMove={pickLocation}
          onClose={() => setOverlayEnabled(false)}
          onRetry={() => setRetry((n) => n + 1)}
        />
      )}
    </div>
  )
}
