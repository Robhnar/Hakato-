import { Suspense, useMemo, useState } from 'react'
import { api } from './api/client'
import type { Site, SiteCategory } from './api/types'
import { useAsync } from './api/useAsync'
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
import SummaryStrip from './app/SummaryStrip'
import { VIEWS } from './app/views'

// Powłoka (zadanie 005): miejsce, czas, scenariusze.
// Widoki w src/views/ dostają dane przez ViewProps i nie zależą od tego pliku.

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

  function removeActive() {
    if (scenarios.length <= 1) return
    const remaining = scenarios.filter((scenario) => scenario.id !== active.id)
    setScenarios(remaining)
    setActiveId(remaining[0].id)
    syncCoordDrafts(remaining[0])
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

  const View = VIEWS.find((view) => view.id === viewId)?.component ?? VIEWS[0].component

  return (
    <div className="app">
      <header>
        <h1>Lunar Landing Site Navigator</h1>
        <p className="tagline">Compare landing sites and dates for solar power and Earth line-of-sight.</p>
      </header>

      <section className="controls" aria-label="Scenario setup">
        <label>
          Landing site
          <select
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
        </label>

        <fieldset className="coords">
          <legend>Custom coordinates (ME, degrees)</legend>
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
          <button type="button" onClick={applyCustomCoords}>
            Apply coordinates
          </button>
          {coordError && (
            <p className="error" role="alert">
              {coordError}
            </p>
          )}
        </fieldset>

        <label>
          Start (UTC)
          <input
            type="datetime-local"
            value={active.start_utc.slice(0, 16)}
            onChange={(event) => {
              if (event.target.value) updateActive({ start_utc: `${event.target.value}:00Z` })
            }}
          />
        </label>

        <label>
          Window length
          <select
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
            {!DURATION_PRESETS.some((preset) => durationKey(preset.hours) === durationKey(active.duration_hours)) && (
              <option value={durationKey(active.duration_hours)}>
                {active.duration_hours} h (custom)
              </option>
            )}
          </select>
        </label>
      </section>

      <section className="scenario-bar" aria-label="Scenarios">
        <nav className="chips" aria-label="Scenario list">
          {scenarios.map((scenario) => (
            <button
              key={scenario.id}
              type="button"
              className={scenario.id === active.id ? 'selected' : ''}
              aria-pressed={scenario.id === active.id}
              onClick={() => activateScenario(scenario.id)}
            >
              {scenario.name} · {scenario.start_utc.slice(0, 10)}
            </button>
          ))}
        </nav>
        <div className="scenario-actions">
          <button
            type="button"
            onClick={addScenario}
            disabled={atLimit}
            title="Add another catalogue site with the current UTC hour as start"
          >
            Add scenario
          </button>
          <button
            type="button"
            onClick={duplicateActive}
            disabled={atLimit}
            title="Copy the active scenario exactly"
          >
            Duplicate
          </button>
          <button type="button" onClick={removeActive} disabled={scenarios.length <= 1}>
            Remove
          </button>
          {atLimit && <span className="hint">Limit {MAX_SCENARIOS} scenarios</span>}
        </div>
      </section>

      <SummaryStrip scenario={active} />

      <nav className="tabs" aria-label="Views">
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

      <main>
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
      </main>
    </div>
  )
}
