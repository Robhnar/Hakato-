import { useState } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'
import type { CalendarSlot, SlipAnalysis } from '../../api/types'
import { formatHours, formatPercent, formatUtc } from '../../app/format'
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

// ISO timestamps in a sentence from the backend are turned into human time (task 021).
const ISO_PATTERN = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?Z/g

function humanizeDates(text: string): string {
  return text.replace(ISO_PATTERN, (iso) => formatUtc(iso))
}

/** The grid window whose interval [start, end) contains the given moment. */
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

/** The entered number if it is within 1…90; otherwise null. */
function parseDays(raw: string): number | null {
  const text = raw.trim()
  if (text === '') return null
  const value = Number(text)
  if (!Number.isFinite(value) || value < SLIP_MIN_DAYS || value > SLIP_MAX_DAYS) return null
  return clampSlipDays(value)
}

/** "Launch delayed by N days" simulator (task 015). */
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
  // The draft of the number field remembers for which `days` value it was
  // entered - after the slider changes or from outside the field shows the new value
  // without a syncing effect.
  const [draft, setDraft] = useState({ days, text: String(days) })
  const draftText = draft.days === days ? draft.text : String(days)

  // The entered value reaches the parent only when it is a valid number
  // within the range; on blur/Enter we clamp what is left in the field.
  function commitDays() {
    const next = clampSlipDays(Number(draftText.trim() === '' ? Number.NaN : draftText))
    setDraft({ days, text: String(next) })
    if (next !== days) onSlipDaysChange(next)
  }

  function changeDraft(event: ChangeEvent<HTMLInputElement>) {
    const raw = event.target.value
    setDraft({ days, text: raw })
    const next = parseDays(raw)
    if (next !== null && next !== days) onSlipDaysChange(next)
  }

  const delayedStart = shiftUtc(referenceStartUtc, days)

  // The backend takes precedence. When it returned no analysis, we look for windows in the grid
  // on the client side - the same thresholds as the requirements panel.
  const original = slipAnalysis ? slipAnalysis.original_slot : slotAt(grid, referenceStartUtc)
  const delayed = slipAnalysis ? slipAnalysis.delayed_slot : slotAt(grid, delayedStart)
  // The local comparison and the nearest window are computed against the current (live)
  // requirements from the form, so "Jump to nearest window" and the deltas do not use
  // a stale response from the previous request.
  const localComparison =
    original && delayed ? slipComparison(original, delayed, requirements) : null
  const deltas: Deltas | null = localComparison ?? (
    slipAnalysis
      ? {
          delta_sunlight_hours: slipAnalysis.delta_sunlight_hours,
          delta_max_darkness_hours: slipAnalysis.delta_max_darkness_hours,
          delta_earth_fraction: slipAnalysis.delta_earth_fraction,
        }
      : null
  )
  const nearest =
    nearestEquivalent(grid, delayedStart, requirements) ??
    (slipAnalysis?.nearest_equivalent_slot &&
    violations(slipAnalysis.nearest_equivalent_slot, requirements).length === 0
      ? slipAnalysis.nearest_equivalent_slot
      : null)

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
        <h3 className="windows-panel-title">Launch slip simulator</h3>
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
          aria-valuetext={`+${days} days`}
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
          value={draftText}
          aria-label="Launch delay in days"
          onChange={changeDraft}
          onBlur={commitDays}
          onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commitDays()
              event.currentTarget.blur()
            }
          }}
        />
      </div>

      <div className="windows-slip-compare">
        <SlotCard title="Original" slot={original} ok={originalOk} />
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
        <p className="windows-slip-explanation">{humanizeDates(slipAnalysis.explanation)}</p>
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
            <time className="num" dateTime={slot.start_utc}>
              {formatUtc(slot.start_utc)}
            </time>
          </p>
          <dl className="windows-slot-metrics">
            <div>
              <dt>Sunlight</dt>
              <dd className="num">{formatHours(slot.sunlight_hours)}</dd>
            </div>
            <div>
              <dt>Longest night</dt>
              <dd className="num">{formatHours(slot.max_darkness_hours)}</dd>
            </div>
            <div>
              <dt>Earth link</dt>
              <dd className="num">{formatPercent(slot.earth_visible_fraction)}</dd>
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
