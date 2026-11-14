import type { ChangeEvent } from 'react'
import type { CalendarSlot, SlipAnalysis } from './contract'
import {
  SLIP_MAX_DAYS,
  SLIP_MIN_DAYS,
  clampSlipDays,
  nearestEquivalent,
  shiftUtc,
  slipComparison,
  violations,
  type MissionRequirements,
} from './requirements'
import './windows.css'

interface Props {
  referenceStartUtc: string
  requirements: MissionRequirements
  grid: CalendarSlot[]
  slipAnalysis: SlipAnalysis | null
  slipDays: number
  onSlipDaysChange: (days: number) => void
  onUse: (startUtc: string, durationHours: number) => void
}

interface Deltas {
  delta_sunlight_hours: number
  delta_max_darkness_hours: number
  delta_earth_fraction: number
}

const DASH = '—'

/** Okno z siatki, w którego przedziale [start, end) mieści się podana chwila. */
function slotAt(grid: CalendarSlot[], utc: string): CalendarSlot | null {
  const ms = Date.parse(utc)
  if (!Number.isFinite(ms)) return null
  for (const slot of grid) {
    const start = Date.parse(slot.start_utc)
    const end = Date.parse(slot.end_utc)
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue
    if (ms >= start && ms < end) return slot
  }
  return null
}

function formatUtc(iso: string): string {
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return iso || DASH
  const value = new Date(ms).toISOString()
  return `${value.slice(0, 10)} ${value.slice(11, 16)} UTC`
}

function formatHours(value: number): string {
  return Number.isFinite(value) ? `${value.toFixed(1)} h` : DASH
}

function formatPercent(fraction: number): string {
  return Number.isFinite(fraction) ? `${Math.round(fraction * 100)}%` : DASH
}

function readDays(event: ChangeEvent<HTMLInputElement>): number {
  const raw = event.target.value.trim()
  return clampSlipDays(raw === '' ? Number.NaN : Number(raw))
}

/** Symulator "start opóźnił się o N dni" (zadanie 015). */
export default function SlipAnalyzer({
  referenceStartUtc,
  requirements,
  grid,
  slipAnalysis,
  slipDays,
  onSlipDaysChange,
  onUse,
}: Props) {
  const days = clampSlipDays(slipDays)
  const delayedStart = shiftUtc(referenceStartUtc, days)

  // Backend ma pierwszeństwo. Gdy nie zwrócił analizy, szukamy okien w siatce
  // po stronie klienta - te same progi co panel wymagań.
  const original = slipAnalysis ? slipAnalysis.original_slot : slotAt(grid, referenceStartUtc)
  const delayed = slipAnalysis ? slipAnalysis.delayed_slot : slotAt(grid, delayedStart)
  // Lokalne porównanie liczymy zawsze, gdy znamy oba okna: służy jako fallback
  // dla backendu i jako kontrola jego progów względem aktualnych wymagań.
  const localComparison =
    original && delayed ? slipComparison(original, delayed, requirements) : null
  const deltas: Deltas | null = slipAnalysis
    ? {
        delta_sunlight_hours: slipAnalysis.delta_sunlight_hours,
        delta_max_darkness_hours: slipAnalysis.delta_max_darkness_hours,
        delta_earth_fraction: slipAnalysis.delta_earth_fraction,
      }
    : localComparison
  const nearest = slipAnalysis
    ? slipAnalysis.nearest_equivalent_slot
    : nearestEquivalent(grid, delayedStart, requirements)

  const delayedViolations =
    localComparison?.delayed_violations ?? (delayed ? violations(delayed, requirements) : [])
  const warningReasons =
    delayedViolations.length > 0
      ? delayedViolations
      : delayed && delayed.passes_requirements === false
        ? ['The delayed start does not meet the current requirements.']
        : []
  const originalOk = localComparison?.original_ok ?? null
  const delayedOk = localComparison?.delayed_ok ?? null

  return (
    <section className="windows-slip" aria-label="Launch slip simulator">
      <div className="windows-slip-head">
        <h3>Launch slip simulator</h3>
        {!slipAnalysis && (
          <span className="windows-slip-hint">
            Backend slip analysis is unavailable; comparing the calendar grid locally.
          </span>
        )}
      </div>

      <div className="windows-slip-control">
        <label htmlFor="windows-slip-days">
          Launch delayed by <strong>+{days} days</strong>
        </label>
        <input
          className="windows-slip-range"
          type="range"
          min={SLIP_MIN_DAYS}
          max={SLIP_MAX_DAYS}
          step={1}
          value={days}
          aria-label="Launch delay slider in days"
          onChange={(event) => onSlipDaysChange(Number(event.target.value))}
        />
        <input
          className="windows-slip-number"
          id="windows-slip-days"
          type="number"
          inputMode="numeric"
          min={SLIP_MIN_DAYS}
          max={SLIP_MAX_DAYS}
          step={1}
          value={days}
          aria-label="Launch delay in days"
          onChange={(event) => onSlipDaysChange(readDays(event))}
        />
      </div>

      <div className="windows-slip-compare">
        <SlotCard title="Original date" slot={original} ok={originalOk} />
        <SlotCard title={`Delayed (+${days} d)`} slot={delayed} ok={delayedOk} />
      </div>

      {deltas && (
        <dl className="windows-deltas" aria-label="Change caused by the delay">
          <Delta label="Sunlight" value={deltas.delta_sunlight_hours} suffix=" h" higherIsBetter />
          <Delta
            label="Longest night"
            value={deltas.delta_max_darkness_hours}
            suffix=" h"
            higherIsBetter={false}
          />
          <Delta
            label="Earth link"
            value={deltas.delta_earth_fraction}
            scale={100}
            suffix="%"
            higherIsBetter
          />
        </dl>
      )}

      {warningReasons.length > 0 && (
        <div className="windows-slip-warning" role="alert">
          <p>Delayed start breaks the requirements</p>
          <ul>
            {warningReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="windows-nearest">
        <div>
          <h4>Nearest equivalent window</h4>
          {nearest ? (
            <p>
              <time dateTime={nearest.start_utc}>{formatUtc(nearest.start_utc)}</time> · sunlight{' '}
              {formatHours(nearest.sunlight_hours)} · longest night{' '}
              {formatHours(nearest.max_darkness_hours)} · Earth link{' '}
              {formatPercent(nearest.earth_visible_fraction)}
            </p>
          ) : (
            <p className="windows-empty">
              No later window in the current grid meets these requirements.
            </p>
          )}
        </div>
        {nearest && (
          <button
            type="button"
            onClick={() => onUse(nearest.start_utc, requirements.duration_hours)}
          >
            Jump to nearest window
          </button>
        )}
      </div>

      {slipAnalysis?.explanation && (
        <p className="windows-slip-explanation">{slipAnalysis.explanation}</p>
      )}
    </section>
  )
}

function SlotCard({
  title,
  slot,
  ok,
}: {
  title: string
  slot: CalendarSlot | null
  ok: boolean | null
}) {
  const tone = ok === true ? ' windows-slot-ok' : ok === false ? ' windows-slot-bad' : ''
  return (
    <article className={`windows-slot-card${tone}`}>
      <h4>{title}</h4>
      {slot ? (
        <>
          <p className="windows-slot-date">
            <time dateTime={slot.start_utc}>{formatUtc(slot.start_utc)}</time>
          </p>
          <dl className="windows-slot-metrics">
            <div>
              <dt>Sunlight</dt>
              <dd>{formatHours(slot.sunlight_hours)}</dd>
            </div>
            <div>
              <dt>Longest night</dt>
              <dd>{formatHours(slot.max_darkness_hours)}</dd>
            </div>
            <div>
              <dt>Earth link</dt>
              <dd>{formatPercent(slot.earth_visible_fraction)}</dd>
            </div>
          </dl>
          {ok !== null && (
            <p className={`windows-slot-state ${ok ? 'windows-ok' : 'windows-bad'}`}>
              {ok ? 'Meets requirements' : 'Breaks requirements'}
            </p>
          )}
        </>
      ) : (
        <p className="windows-empty">No calendar slot covers this date.</p>
      )}
    </article>
  )
}

function Delta({
  label,
  value,
  suffix,
  digits = 1,
  scale = 1,
  higherIsBetter,
}: {
  label: string
  value: number
  suffix: string
  digits?: number
  scale?: number
  higherIsBetter: boolean
}) {
  const factor = 10 ** digits
  const shown = Number.isFinite(value) ? Math.round(value * scale * factor) / factor : null
  const tone =
    shown === null || shown === 0 ? 'neutral' : (shown > 0) === higherIsBetter ? 'good' : 'bad'
  return (
    <div className="windows-delta">
      <dt>{label}</dt>
      <dd className={`windows-delta-${tone}`}>
        {shown === null ? DASH : `${shown > 0 ? '+' : ''}${shown.toFixed(digits)}${suffix}`}
      </dd>
    </div>
  )
}
