// Guided mode "Plan a landing" (task 020): three simple questions → a site and date recommendation.

import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { api } from '../../api/client'
import type { Site, SiteCategory } from '../../api/types'
import type { Scenario } from '../scenario'
import type { ViewRequest, ZoomRequest } from '../../views/map/MoonGlobe'
import '../../views/map/map.css'
import { approximateNote } from './explain'
import { defaultMonthRange, formatDay, formatPercent, formatUtcTime, monthRangeToSearch } from './format'
import { MISSIONS, type MissionKind, type Priority, nextAfterSlip } from './ranking'
import ResultCard from './ResultCard'
import { PIN_ID, pinnedSite, siteAt } from './place'
import { type GuideAnswers, type SearchResult, findLandings } from './search'
import './guide.css'

const PRIORITIES: { id: Priority; label: string; blurb: string }[] = [
  { id: 'power', label: 'Solar power', blurb: 'Most sunlight, shortest nights' },
  { id: 'earth', label: 'Talking to Earth', blurb: 'Earth in the sky as often as possible' },
  { id: 'both', label: 'Both equally', blurb: 'A balance of sunlight and contact' },
]

const CATEGORY_LABEL: Record<SiteCategory, string> = {
  candidate: 'South pole candidates',
  apollo: 'Apollo landing sites',
  clps: 'NASA commercial landers (CLPS)',
  commercial: 'Other commercial missions',
  international: 'Other countries',
}

// The globe (three.js) is loaded only when someone picks a site on the map.
const MoonGlobe = lazy(() => import('../../views/map/MoonGlobe'))

const SLIP_DAYS = 7

type Status =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'done'; result: SearchResult; answers: GuideAnswers }

export interface GuidePanelProps {
  sites: Site[]
  onOpenExpert: (site: Site, start_utc: string, duration_hours: number, viewId: 'sky' | 'timeline') => void
}

export default function GuidePanel({ sites, onOpenExpert }: GuidePanelProps) {
  const [answers, setAnswers] = useState<GuideAnswers>(() => ({
    mission: 'twoWeeks',
    priority: 'power',
    earthAtLanding: false,
    place: 'auto',
    ...defaultMonthRange(new Date()),
  }))
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  // A point clicked on the map outside the catalog (`answers.place === PIN_ID`).
  const [pin, setPin] = useState<{ lat_deg: number; lon_deg: number } | null>(null)
  const [mapView, setMapView] = useState<ViewRequest>({ target: 'south', seq: 1 })
  const [mapZoom, setMapZoom] = useState<ZoomRequest | null>(null)
  const mapSeq = useRef(1)
  const requestId = useRef(0)
  const headingRef = useRef<HTMLHeadingElement>(null)

  const range = monthRangeToSearch(answers.from, answers.to)
  const rangeError = 'error' in range ? range.error : null
  const update = (change: Partial<GuideAnswers>) => setAnswers((prev) => ({ ...prev, ...change }))

  async function search() {
    if (rangeError) return
    const id = ++requestId.current
    const asked = answers
    setStatus({ kind: 'loading' })
    try {
      const searchSites = asked.place === PIN_ID && pin ? [...sites, pinnedSite(pin.lat_deg, pin.lon_deg)] : sites
      const result = await findLandings(asked, searchSites, api.windows)
      // An older request does not overwrite a newer one.
      if (id === requestId.current) setStatus({ kind: 'done', result, answers: asked })
    } catch (error) {
      if (id === requestId.current) setStatus({ kind: 'error', message: error instanceof Error ? error.message : String(error) })
    }
  }

  // After a new result, focus the recommendation heading (screen readers and keyboard).
  useEffect(() => {
    if (status.kind === 'done') headingRef.current?.focus()
  }, [status])

  const pinSite = pin ? pinnedSite(pin.lat_deg, pin.lon_deg) : null
  const chosen = answers.place === PIN_ID ? pinSite : (sites.find((site) => site.id === answers.place) ?? null)
  const chosenMarker: Scenario[] = chosen
    ? [{ id: 'pick', name: chosen.name, lat_deg: chosen.lat_deg, lon_deg: chosen.lon_deg, start_utc: '', duration_hours: 0 }]
    : []

  function pickOnMap(lat_deg: number, lon_deg: number) {
    const site = siteAt(sites, lat_deg, lon_deg)
    if (site) {
      setPin(null)
      update({ place: site.id })
    } else {
      setPin({ lat_deg, lon_deg })
      update({ place: PIN_ID })
    }
  }

  const groups = (Object.keys(CATEGORY_LABEL) as SiteCategory[])
    .map((category) => ({ category, sites: sites.filter((s) => s.category === category) }))
    .filter((g) => g.sites.length > 0)

  return (
    <div className="guide">
      <header className="guide-intro">
        <h2>Plan a Moon landing</h2>
        <p>
          Answer three questions. We check where the Sun and Earth will be above the lunar hills and suggest the best
          place and day to land.
        </p>
      </header>

      <form
        className="guide-form"
        onSubmit={(event) => {
          event.preventDefault()
          void search()
        }}
      >
        <div className="guide-step" role="group" aria-labelledby="guide-step-mission">
          <h3 className="guide-step-title">
            <span className="guide-step-no num">01</span>
            <span id="guide-step-mission">How long will the mission stay on the Moon?</span>
          </h3>
          <div className="guide-choices">
            {(Object.keys(MISSIONS) as MissionKind[]).map((kind) => (
              <label key={kind} className="guide-choice">
                <input
                  type="radio"
                  name="mission"
                  aria-label={`${MISSIONS[kind].label}: ${MISSIONS[kind].blurb}`}
                  checked={answers.mission === kind}
                  onChange={() => update({ mission: kind })}
                />
                <span className="guide-choice-title">{MISSIONS[kind].label}</span>
                <span className="guide-choice-blurb">{MISSIONS[kind].blurb}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="guide-step" role="group" aria-labelledby="guide-step-priority">
          <h3 className="guide-step-title">
            <span className="guide-step-no num">02</span>
            <span id="guide-step-priority">What matters most?</span>
          </h3>
          <div className="guide-choices">
            {PRIORITIES.map((p) => (
              <label key={p.id} className="guide-choice">
                <input
                  type="radio"
                  name="priority"
                  aria-label={`${p.label}: ${p.blurb}`}
                  checked={answers.priority === p.id}
                  onChange={() => update({ priority: p.id })}
                />
                <span className="guide-choice-title">{p.label}</span>
                <span className="guide-choice-blurb">{p.blurb}</span>
              </label>
            ))}
          </div>
          <label className="guide-check">
            <input
              type="checkbox"
              checked={answers.earthAtLanding}
              onChange={(event) => update({ earthAtLanding: event.target.checked })}
            />
            Earth must be in the sky at the moment of landing (live video home)
          </label>
        </div>

        <div className="guide-step" role="group" aria-labelledby="guide-step-when">
          <h3 className="guide-step-title">
            <span className="guide-step-no num">03</span>
            <span id="guide-step-when">When and where?</span>
          </h3>
          <div className="guide-row">
            <label>
              Earliest landing month
              <input type="month" value={answers.from} onChange={(event) => update({ from: event.target.value })} />
            </label>
            <label>
              Latest landing month
              <input type="month" value={answers.to} onChange={(event) => update({ to: event.target.value })} />
            </label>
          </div>
          {rangeError && (
            <p className="guide-error" id="guide-range-error" role="alert">
              {rangeError}
            </p>
          )}
          <div className="guide-choices">
            <label className="guide-choice">
              <input
                type="radio"
                name="place"
                aria-label="Find the best place for me"
                checked={answers.place === 'auto'} onChange={() => update({ place: 'auto' })} />
              <span className="guide-choice-title">Find the best place for me</span>
              <span className="guide-choice-blurb">Compares the south pole sites NASA is studying for Artemis</span>
            </label>
            <label className="guide-choice">
              <input
                type="radio"
                name="place"
                aria-label="A place I choose"
                checked={answers.place !== 'auto'}
                onChange={() => update({ place: groups[0]?.sites[0]?.id ?? 'auto' })}
              />
              <span className="guide-choice-title">A place I choose</span>
              <select
                aria-label="Landing place"
                value={answers.place === 'auto' ? '' : answers.place}
                onChange={(event) => {
                  if (event.target.value !== PIN_ID) setPin(null)
                  update({ place: event.target.value })
                }}
                onFocus={() => {
                  if (answers.place === 'auto') update({ place: groups[0]?.sites[0]?.id ?? 'auto' })
                }}
              >
                {answers.place === 'auto' && <option value="">Choose a place…</option>}
                {pinSite && <option value={PIN_ID}>{pinSite.name}</option>}
                {groups.map((g) => (
                  <optgroup key={g.category} label={CATEGORY_LABEL[g.category]}>
                    {g.sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            {answers.place !== 'auto' && (
              <div className="guide-map-picker">
                <div className="guide-map-tools" role="group" aria-label="Map view">
                  <button type="button" onClick={() => setMapView({ target: 'south', seq: ++mapSeq.current })}>
                    South pole
                  </button>
                  <button type="button" onClick={() => setMapView({ target: 'near', seq: ++mapSeq.current })}>
                    Near side
                  </button>
                  <button type="button" aria-label="Zoom in" onClick={() => setMapZoom({ direction: 1, seq: ++mapSeq.current })}>
                    +
                  </button>
                  <button type="button" aria-label="Zoom out" onClick={() => setMapZoom({ direction: -1, seq: ++mapSeq.current })}>
                    −
                  </button>
                </div>
                <div className="guide-map">
                  <Suspense fallback={<p role="status">Loading map…</p>}>
                    <MoonGlobe
                      sites={sites}
                      scenarios={chosenMarker}
                      activeId="pick"
                      subsolar={null}
                      subearth={null}
                      onSelect={() => {}}
                      onPick={pickOnMap}
                      viewRequest={mapView}
                      zoomRequest={mapZoom}
                    />
                  </Suspense>
                </div>
                <p className="guide-map-hint">
                  Click a marker or any spot on the Moon to choose it. You can also use the list above.
                </p>
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          className="btn-primary guide-submit"
          disabled={rangeError !== null || status.kind === 'loading'}
          aria-describedby={rangeError ? 'guide-range-error' : undefined}
        >
          {status.kind === 'loading' ? 'Searching…' : 'Find my landing'}
        </button>
      </form>

      <section className="guide-results" aria-live="polite" aria-busy={status.kind === 'loading'}>
        {status.kind === 'loading' && <p role="status">Checking sunlight and Earth contact for every day… Long missions can take up to half a minute.</p>}
        {status.kind === 'error' && (
          <div className="guide-error" role="alert">
            <p>{status.message}</p>
            <button type="button" onClick={() => void search()}>
              Try again
            </button>
          </div>
        )}
        {status.kind === 'done' && (
          <Results result={status.result} answers={status.answers} headingRef={headingRef} onOpenExpert={onOpenExpert} />
        )}
      </section>
    </div>
  )
}

function Results({
  result,
  answers,
  headingRef,
  onOpenExpert,
}: {
  result: SearchResult
  answers: GuideAnswers
  headingRef: React.RefObject<HTMLHeadingElement | null>
  onOpenExpert: GuidePanelProps['onOpenExpert']
}) {
  const hours = MISSIONS[answers.mission].hours
  const note = approximateNote(result.meta)
  const failed =
    result.failedSites.length > 0 ? `We could not check: ${result.failedSites.map((s) => s.name).join(', ')}.` : null

  if (result.ranked.length === 0) {
    return (
      <div className="guide-empty">
        <h2 ref={headingRef} tabIndex={-1}>
          No good landing found
        </h2>
        <p>
          {result.emptyReason === 'earth-at-landing'
            ? 'In these months Earth is never in the sky at touchdown. Untick “Earth must be in the sky at the moment of landing” or choose more months.'
            : 'There are no landing opportunities in these months. Try a longer period.'}
        </p>
        {failed && <p className="guide-note">{failed}</p>}
      </div>
    )
  }

  const best = result.ranked[0]
  const others = result.ranked.filter((c) => c !== best && c.site.id !== best.site.id).slice(0, 3)
  const alternatives = others.length > 0 ? others : result.ranked.slice(1, 4)
  const slipped = nextAfterSlip(result.ranked, best, SLIP_DAYS)

  return (
    <>
      <ResultCard
        candidate={best}
        priority={answers.priority}
        durationHours={hours}
        headingRef={headingRef}
        onOpenExpert={onOpenExpert}
      />

      <section className="guide-slip">
        <h3 className="label">If your launch slips by a week</h3>
        {slipped ? (
          <p>
            Next good chance at {best.site.name}: <strong className="num">{formatDay(slipped.slot.start_utc)}</strong> at{' '}
            <span className="num">{formatUtcTime(slipped.slot.start_utc)}</span>
            {slipped.points < best.points - 10 ? ' — not quite as good, but workable.' : ' — about as good.'}
          </p>
        ) : (
          <p>No later chance at this place in the months you chose. Add more months to see one.</p>
        )}
      </section>

      {alternatives.length > 0 && (
        <section className="guide-others">
          <h3 className="label">Other good options</h3>
          <ul>
            {alternatives.map((c) => (
              <li key={`${c.site.id}-${c.slot.start_utc}`}>
                <span className="guide-other-name">{c.site.name}</span>
                <span className="guide-other-when num">
                  {formatDay(c.slot.start_utc)}, {formatUtcTime(c.slot.start_utc)}
                </span>
                <span className="guide-other-why">
                  Sun up {formatPercent(c.slot.sun_visible_fraction)} · Earth in view{' '}
                  {formatPercent(c.slot.earth_visible_fraction)}
                </span>
                <button type="button" onClick={() => onOpenExpert(c.site, c.slot.start_utc, hours, 'sky')}>
                  See it
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(note || failed) && (
        <p className="guide-note" role="note">
          {note} {failed}
        </p>
      )}
    </>
  )
}
