import { Suspense, useMemo, useState } from 'react'
import { api } from './api/client'
import type { Site, SiteCategory } from './api/types'
import { useAsync } from './api/useAsync'
import { formatCoords, formatDuration, formatUtcDate } from './app/format'
import {
  DURATION_PRESETS,
  LUNAR_DAY_HOURS,
  MAX_SCENARIOS,
  type Scenario,
  coordErrorMessage,
  duplicateScenario,
  endUtc,
  scenarioFromSite,
  toIsoZ,
  validateCoords,
} from './app/scenario'
import GuidePanel from './app/guide/GuidePanel'
import SummaryStrip, { DataBadge } from './app/SummaryStrip'
import { VIEWS } from './app/views'

// Powłoka (zadanie 005): miejsce, czas, scenariusze.
// Widoki w src/views/ dostają dane przez ViewProps i nie zależą od tego pliku.
// Układ „konsoli misji” (zadanie 021): nagłówek, panel boczny 300 px, scena.

const CATEGORY_ORDER: SiteCategory[] = [
  'apollo',
  'clps',
  'commercial',
  'international',
  'candidate',
]

const CATEGORY_LABEL: Record<SiteCategory, string> = {
  apollo: 'Apollo',
  clps: 'CLPS',
  commercial: 'Commercial',
  international: 'International',
  candidate: 'Candidates',
}

function startOfCurrentHour(): string {
  const now = new Date()
  now.setUTCMinutes(0, 0, 0)
  return toIsoZ(now)
}

function sitesByCategory(sites: Site[]): { category: SiteCategory; sites: Site[] }[] {
  return CATEGORY_ORDER.map((category) => ({
    category,
    sites: sites.filter((site) => site.category === category),
  })).filter((group) => group.sites.length > 0)
}

function matchingSiteId(sites: Site[], scenario: Scenario): string {
  const match = sites.find(
    (site) =>
      site.name === scenario.name &&
      site.lat_deg === scenario.lat_deg &&
      site.lon_deg === scenario.lon_deg,
  )
  return match?.id ?? ''
}

/** Stabilny klucz selecta — unika niespójności float (np. 708.7 * 3). */
function durationKey(hours: number): string {
  return hours.toFixed(4)
}

export default function App() {
  const [retryCount, setRetryCount] = useState(0)
  const sites = useAsync(() => api.sites(), `sites-${retryCount}`)

  if (sites.error) {
    return (
      <div role="alert" className="error">
        <p>Cannot load landing sites: {sites.error}</p>
        <button type="button" onClick={() => setRetryCount((n) => n + 1)}>
          Retry
        </button>
      </div>
    )
  }
  if (!sites.data) return <p role="status">Loading…</p>
  if (sites.data.length === 0) {
    return (
      <p className="error" role="alert">
        The landing site catalogue is empty.
      </p>
    )
  }
  return <Shell sites={sites.data} />
}

function Shell({ sites }: { sites: Site[] }) {
  const [scenarios, setScenarios] = useState<Scenario[]>(() => [
    scenarioFromSite(sites[0], startOfCurrentHour()),
  ])
  const [activeId, setActiveId] = useState(scenarios[0].id)
  const [viewId, setViewId] = useState(VIEWS[0].id)
  // Tryb prowadzony dla laików (020) jest domyślny; Expert = dotychczasowe narzędzia.
  const [mode, setMode] = useState<'simple' | 'expert'>('simple')
  const [cursor, setCursor] = useState<string | null>(null)
  const [latDraft, setLatDraft] = useState('')
  const [lonDraft, setLonDraft] = useState('')
  const [coordError, setCoordError] = useState<string | null>(null)

  const active = scenarios.find((scenario) => scenario.id === activeId) ?? scenarios[0]
  const groups = useMemo(() => sitesByCategory(sites), [sites])
  const selectedSiteId = matchingSiteId(sites, active)
  const atLimit = scenarios.length >= MAX_SCENARIOS

  function syncCoordDrafts(scenario: Scenario) {
    setCoordError(null)
    if (matchingSiteId(sites, scenario)) {
      setLatDraft('')
      setLonDraft('')
      return
    }
    setLatDraft(String(scenario.lat_deg))
    setLonDraft(String(scenario.lon_deg))
  }

  function activateScenario(id: string) {
    const scenario = scenarios.find((candidate) => candidate.id === id) ?? scenarios[0]
    setActiveId(scenario.id)
    // Wspólny kursor nie jest zerowany przy zmianie scenariusza — przytnij do jego okna.
    setCursor((current) => {
      if (!current) return current
      const start = new Date(scenario.start_utc).getTime()
      const end = new Date(endUtc(scenario)).getTime()
      const value = new Date(current).getTime()
      if (Number.isNaN(value) || value < start || value > end) return scenario.start_utc
      return current
    })
    syncCoordDrafts(scenario)
  }

  function updateActive(change: Partial<Scenario>) {
    const nextScenario = { ...active, ...change }
    setScenarios((list) =>
      list.map((scenario) => (scenario.id === active.id ? nextScenario : scenario)),
    )
    setCursor((current) => {
      if (!current) return current
      const start = new Date(nextScenario.start_utc).getTime()
      const end = new Date(endUtc(nextScenario)).getTime()
      const value = new Date(current).getTime()
      if (Number.isNaN(value) || value < start || value > end) return nextScenario.start_utc
      return current
    })
  }

  function applySite(site: Site) {
    setCoordError(null)
    setLatDraft('')
    setLonDraft('')
    updateActive({ name: site.name, lat_deg: site.lat_deg, lon_deg: site.lon_deg })
  }

  function applyCustomCoords() {
    const latRaw = latDraft.trim()
    const lonRaw = lonDraft.trim()
    if (latRaw === '' || lonRaw === '') {
      setCoordError('Enter both latitude and longitude.')
      return
    }
    const lat_deg = Number(latRaw)
    const lon_deg = Number(lonRaw)
    const error = validateCoords(lat_deg, lon_deg)
    if (error) {
      setCoordError(coordErrorMessage(error))
      return
    }
    setCoordError(null)
    const name = `Custom ${lat_deg.toFixed(3)}°, ${lon_deg.toFixed(3)}°`
    updateActive({ name, lat_deg, lon_deg })
  }

  /** Nowy scenariusz: kolejne wolne miejsce z katalogu (albo pierwsze) i bieżąca godzina UTC. */
  function addScenario() {
    if (atLimit) return
    const usedIds = new Set(
      scenarios
        .map((scenario) => matchingSiteId(sites, scenario))
        .filter((id): id is string => id !== ''),
    )
    const nextSite = sites.find((site) => !usedIds.has(site.id)) ?? sites[0]
    const created = scenarioFromSite(nextSite, startOfCurrentHour())
    setScenarios((list) => [...list, created])
    setActiveId(created.id)
    syncCoordDrafts(created)
  }

  /** Dokładna kopia aktywnego scenariusza (to samo miejsce, start i okno). */
  function duplicateActive() {
    if (atLimit) return
    const copy = duplicateScenario(active)
    setScenarios((list) => [...list, copy])
    setActiveId(copy.id)
    syncCoordDrafts(copy)
  }

  /** Usuwa wskazany wiersz; przy usunięciu aktywnego wybiera sąsiada z listy. */
  function removeScenario(id: string) {
    if (scenarios.length <= 1) return
    const index = scenarios.findIndex((scenario) => scenario.id === id)
    if (index === -1) return
    const remaining = scenarios.filter((scenario) => scenario.id !== id)
    setScenarios(remaining)
    if (id === active.id) activateScenario(remaining[Math.min(index, remaining.length - 1)].id)
  }

  function pickLocation(lat_deg: number, lon_deg: number) {
    const error = validateCoords(lat_deg, lon_deg)
    if (error) {
      setCoordError(coordErrorMessage(error))
      return
    }
    setCoordError(null)
    setLatDraft(String(lat_deg))
    setLonDraft(String(lon_deg))
    const name = `Custom ${lat_deg.toFixed(3)}°, ${lon_deg.toFixed(3)}°`
    updateActive({ name, lat_deg, lon_deg })
  }

  function applyWindow(start_utc: string, duration_hours?: number) {
    updateActive({
      start_utc,
      ...(duration_hours !== undefined ? { duration_hours } : {}),
    })
    setCursor(start_utc)
  }

  function openExpert(site: Site, start_utc: string, duration_hours: number, nextView: string) {
    const nextScenario = {
      ...active,
      name: site.name,
      lat_deg: site.lat_deg,
      lon_deg: site.lon_deg,
      start_utc,
      duration_hours,
    }
    setScenarios((list) => list.map((scenario) => (scenario.id === active.id ? nextScenario : scenario)))
    syncCoordDrafts(nextScenario)
    setCursor(start_utc)
    setViewId(nextView)
    setMode('expert')
    window.scrollTo({ top: 0 })
  }

  const View = VIEWS.find((view) => view.id === viewId)?.component ?? VIEWS[0].component

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-brand">
          <h1 className="label app-title">LUNAR LANDING SITE NAVIGATOR</h1>
          {mode === 'simple' && (
            <p className="tagline">
              Find when and where to land on the Moon, with sunlight for power and Earth in view.
            </p>
          )}
        </div>
        <nav className="mode-tabs" aria-label="Mode">
          <button type="button" aria-pressed={mode === 'simple'} onClick={() => setMode('simple')}>
            Plan a landing
          </button>
          <button type="button" aria-pressed={mode === 'expert'} onClick={() => setMode('expert')}>
            Expert tools
          </button>
        </nav>
        <div className="app-badges">
          <DataBadge scenario={active} />
        </div>
      </header>

      <div className={mode === 'expert' ? 'app-body' : 'app-body app-body--single'}>
        {mode === 'expert' && (
          <aside className="rail" aria-label="Scenario setup">
            <section className="rail-section">
              <div className="rail-head">
                <h2 className="label rail-title">Scenarios</h2>
                <div className="rail-actions">
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Add scenario"
                    title="Add another catalogue site with the current UTC hour as start"
                    onClick={addScenario}
                    disabled={atLimit}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Duplicate scenario"
                    title="Copy the active scenario exactly"
                    onClick={duplicateActive}
                    disabled={atLimit}
                  >
                    ⧉
                  </button>
                </div>
              </div>
              <ul className="scenario-list">
                {scenarios.map((scenario) => (
                  <li key={scenario.id} className="scenario-item">
                    <button
                      type="button"
                      className="scenario-row"
                      aria-pressed={scenario.id === active.id}
                      onClick={() => activateScenario(scenario.id)}
                    >
                      <span className="scenario-name">{scenario.name}</span>
                      <span className="num scenario-date">{formatUtcDate(scenario.start_utc)}</span>
                    </button>
                    {scenarios.length > 1 && (
                      <button
                        type="button"
                        className="scenario-remove"
                        aria-label="Remove scenario"
                        title={`Remove ${scenario.name}`}
                        onClick={() => removeScenario(scenario.id)}
                      >
                        ×
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              <p className="hint">Limit {MAX_SCENARIOS} scenarios</p>
            </section>

            <section className="rail-section">
              <h2 className="label rail-title">Site</h2>
              <select
                aria-label="Landing site"
                value={selectedSiteId}
                onChange={(event) => {
                  const site = sites.find((candidate) => candidate.id === event.target.value)
                  if (site) applySite(site)
                }}
              >
                {!selectedSiteId && (
                  <option value="" disabled>
                    Custom coordinates
                  </option>
                )}
                {groups.map(({ category, sites: groupSites }) => (
                  <optgroup key={category} label={CATEGORY_LABEL[category]}>
                    {groupSites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </section>

            <section className="rail-section">
              <h2 className="label rail-title">Coordinates</h2>
              <div className="coord-grid">
                <label>
                  Latitude
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min={-90}
                    max={90}
                    placeholder="-89.5"
                    value={latDraft}
                    onChange={(event) => {
                      setLatDraft(event.target.value)
                      setCoordError(null)
                    }}
                  />
                </label>
                <label>
                  Longitude
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min={-180}
                    max={180}
                    placeholder="0"
                    value={lonDraft}
                    onChange={(event) => {
                      setLonDraft(event.target.value)
                      setCoordError(null)
                    }}
                  />
                </label>
                <button type="button" className="apply" onClick={applyCustomCoords}>
                  Apply
                </button>
              </div>
              <p className="num coord-readout">{formatCoords(active.lat_deg, active.lon_deg)}</p>
              {coordError && (
                <p className="error rail-error" role="alert">
                  {coordError}
                </p>
              )}
            </section>

            <section className="rail-section">
              <h2 className="label rail-title">Start (UTC)</h2>
              <input
                type="datetime-local"
                aria-label="Start (UTC)"
                value={active.start_utc.slice(0, 16)}
                onChange={(event) => {
                  if (event.target.value) updateActive({ start_utc: `${event.target.value}:00Z` })
                }}
              />
            </section>

            <section className="rail-section">
              <h2 className="label rail-title">Window</h2>
              <select
                aria-label="Window length"
                value={durationKey(active.duration_hours)}
                onChange={(event) => updateActive({ duration_hours: Number(event.target.value) })}
              >
                {DURATION_PRESETS.map((preset) => (
                  <option key={preset.label} value={durationKey(preset.hours)}>
                    {preset.label}
                    {preset.hours === LUNAR_DAY_HOURS ? ` (${LUNAR_DAY_HOURS} h)` : ''}
                    {preset.hours === LUNAR_DAY_HOURS * 3
                      ? ` (${(LUNAR_DAY_HOURS * 3).toFixed(1)} h)`
                      : ''}
                  </option>
                ))}
                {!DURATION_PRESETS.some(
                  (preset) => durationKey(preset.hours) === durationKey(active.duration_hours),
                ) && (
                  <option value={durationKey(active.duration_hours)}>
                    {formatDuration(active.duration_hours)}
                  </option>
                )}
              </select>
            </section>

            <SummaryStrip scenario={active} />
          </aside>
        )}

        <div className="stage">
          {mode === 'expert' && (
            <nav className="stage-tabs" aria-label="Views">
              {VIEWS.map((view) => (
                <button
                  key={view.id}
                  type="button"
                  className={view.id === viewId ? 'selected' : ''}
                  aria-pressed={view.id === viewId}
                  onClick={() => setViewId(view.id)}
                >
                  {view.label}
                </button>
              ))}
            </nav>
          )}

          <main className="stage-view">
            {/* Zawsze zamontowany: odpowiedzi i wynik przetrwają wycieczkę do Expert. */}
            <div className="guide-shell" hidden={mode !== 'simple'}>
              <GuidePanel sites={sites} onOpenExpert={openExpert} />
            </div>

            {mode === 'expert' && (
              <Suspense fallback={<p role="status">Loading view…</p>}>
                <View
                  scenarios={scenarios}
                  active={active}
                  cursor_utc={cursor ?? active.start_utc}
                  setCursorUtc={setCursor}
                  selectScenario={activateScenario}
                  pickLocation={pickLocation}
                  applyWindow={applyWindow}
                />
              </Suspense>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
