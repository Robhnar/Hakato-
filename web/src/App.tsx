import { useState } from 'react'
import { api } from './api/client'
import type { Site } from './api/types'
import { useAsync } from './api/useAsync'
import { type Scenario, scenarioFromSite, toIsoZ } from './app/scenario'
import SummaryStrip from './app/SummaryStrip'
import { VIEWS } from './app/views'

// Szkielet powłoki. Zadanie 005 rozbudowuje wybór miejsca i daty;
// widoki w src/views/ dostają scenariusze przez ViewProps i nie zależą od tego pliku.

function startOfCurrentHour(): string {
  const now = new Date()
  now.setUTCMinutes(0, 0, 0)
  return toIsoZ(now)
}

export default function App() {
  const sites = useAsync(() => api.sites(), 'sites')

  if (sites.error) return <p className="error">Cannot load landing sites: {sites.error}</p>
  if (!sites.data) return <p>Loading…</p>
  if (sites.data.length === 0) return <p className="error">The landing site catalogue is empty.</p>
  return <Shell sites={sites.data} />
}

function Shell({ sites }: { sites: Site[] }) {
  const [scenarios, setScenarios] = useState<Scenario[]>(() => [
    scenarioFromSite(sites[0], startOfCurrentHour()),
  ])
  const [activeId, setActiveId] = useState(scenarios[0].id)
  const [viewId, setViewId] = useState(VIEWS[0].id)
  const [cursor, setCursor] = useState<string | null>(null)

  const active = scenarios.find((scenario) => scenario.id === activeId) ?? scenarios[0]

  function updateActive(change: Partial<Scenario>) {
    setScenarios((list) =>
      list.map((scenario) => (scenario.id === active.id ? { ...scenario, ...change } : scenario)),
    )
  }

  function addScenario() {
    const copy = scenarioFromSite(active, active.start_utc, active.duration_hours)
    setScenarios((list) => [...list, copy])
    setActiveId(copy.id)
  }

  function pickLocation(lat_deg: number, lon_deg: number) {
    const name = `Custom ${lat_deg.toFixed(3)}°, ${lon_deg.toFixed(3)}°`
    updateActive({ name, lat_deg, lon_deg })
  }

  const View = VIEWS.find((view) => view.id === viewId)?.component ?? VIEWS[0].component

  return (
    <div className="app">
      <header>
        <h1>Lunar Landing Site Navigator</h1>
      </header>

      <section className="controls">
        <label>
          Site
          <select
            value={sites.find((site) => site.name === active.name)?.id ?? ''}
            onChange={(event) => {
              const site = sites.find((candidate) => candidate.id === event.target.value)
              if (site) updateActive({ name: site.name, lat_deg: site.lat_deg, lon_deg: site.lon_deg })
            }}
          >
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
        </label>
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
        <button type="button" onClick={addScenario}>
          Add scenario
        </button>
      </section>

      <nav className="chips" aria-label="Scenarios">
        {scenarios.map((scenario) => (
          <button
            key={scenario.id}
            type="button"
            className={scenario.id === active.id ? 'selected' : ''}
            onClick={() => setActiveId(scenario.id)}
          >
            {scenario.name} · {scenario.start_utc.slice(0, 10)}
          </button>
        ))}
      </nav>

      <SummaryStrip scenario={active} />

      <nav className="tabs" aria-label="Views">
        {VIEWS.map((view) => (
          <button
            key={view.id}
            type="button"
            className={view.id === viewId ? 'selected' : ''}
            onClick={() => setViewId(view.id)}
          >
            {view.label}
          </button>
        ))}
      </nav>

      <main>
        <View
          scenarios={scenarios}
          active={active}
          cursor_utc={cursor ?? active.start_utc}
          setCursorUtc={setCursor}
          selectScenario={setActiveId}
          pickLocation={pickLocation}
        />
      </main>
    </div>
  )
}
