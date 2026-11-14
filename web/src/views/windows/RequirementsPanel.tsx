import type { ChangeEvent } from 'react'
import {
  BATTERY_PRESETS,
  DURATION_PRESETS,
  MISSION_PROFILES,
  type MissionRequirements,
  validateRequirements,
} from './requirements'
import './windows.css'

interface Props {
  value: MissionRequirements
  onChange: (requirements: MissionRequirements) => void
}

/** Wartość liczbowa pola; niepoprawna liczba pokazuje puste pole zamiast "NaN". */
function numberValue(value: number): number | string {
  return Number.isFinite(value) ? value : ''
}

/** Ułamek 0…1 pokazujemy jako procent bez artefaktów zmiennoprzecinkowych. */
function percentValue(fraction: number): number | string {
  if (!Number.isFinite(fraction)) return ''
  return Math.round(fraction * 10_000) / 100
}

function readNumber(event: ChangeEvent<HTMLInputElement>): number {
  const raw = event.target.value.trim()
  return raw === '' ? Number.NaN : Number(raw)
}

function sameRequirements(a: MissionRequirements, b: MissionRequirements): boolean {
  return (
    a.duration_hours === b.duration_hours &&
    a.min_sun_el_at_landing_deg === b.min_sun_el_at_landing_deg &&
    a.min_sunlight_hours === b.min_sunlight_hours &&
    a.max_darkness_hours === b.max_darkness_hours &&
    a.require_earth_at_landing === b.require_earth_at_landing &&
    a.min_earth_fraction === b.min_earth_fraction
  )
}

/**
 * Formularz wymagań misji (zadania 015 i 021). Sterowany przez rodzica: każda
 * zmiana leci od razu do góry, gdzie lista dopasowań jest filtrowana po stronie
 * klienta. Cztery grupy w jednej siatce, bez ramek w ramkach.
 */
export default function RequirementsPanel({ value, onChange }: Props) {
  const errors = validateRequirements(value)
  const hasErrors = Object.keys(errors).length > 0

  function update(patch: Partial<MissionRequirements>) {
    onChange({ ...value, ...patch })
  }

  return (
    <section className="windows-req" aria-label="Mission requirements">
      <div className="windows-req-head">
        <h3 className="windows-panel-title">Mission requirements</h3>
        {hasErrors && (
          <p className="windows-validation" role="alert">
            Fix the highlighted values before searching.
          </p>
        )}
      </div>

      <div className="windows-profiles" role="group" aria-label="Mission profile presets">
        {MISSION_PROFILES.map((profile) => {
          const selected = sameRequirements(value, profile.requirements)
          return (
            <button
              key={profile.id}
              type="button"
              className={`windows-tab${selected ? ' selected' : ''}`}
              aria-pressed={selected}
              onClick={() => onChange({ ...profile.requirements })}
            >
              {profile.label}
            </button>
          )
        })}
      </div>

      <div className="windows-req-grid">
        <section className="windows-req-group" aria-labelledby="windows-req-duration">
          <h4 className="label" id="windows-req-duration">
            Mission duration
          </h4>
          <div className="windows-presets">
            {DURATION_PRESETS.map((preset) => {
              const selected = value.duration_hours === preset.hours
              return (
                <button
                  key={preset.label}
                  type="button"
                  className={selected ? 'selected' : ''}
                  aria-pressed={selected}
                  onClick={() => update({ duration_hours: preset.hours })}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>
          <label className="windows-field" htmlFor="windows-duration">
            Custom duration (hours)
            <input
              id="windows-duration"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={numberValue(value.duration_hours)}
              aria-invalid={Boolean(errors.duration_hours)}
              aria-describedby={errors.duration_hours ? 'windows-duration-error' : undefined}
              onChange={(event) => update({ duration_hours: readNumber(event) })}
            />
          </label>
          <FieldError id="windows-duration-error" message={errors.duration_hours} />
        </section>

        <section className="windows-req-group" aria-labelledby="windows-req-lighting">
          <h4 className="label" id="windows-req-lighting">
            Landing lighting
          </h4>
          <label className="windows-field" htmlFor="windows-min-sun">
            Minimum Sun elevation at landing (°)
            <input
              id="windows-min-sun"
              type="number"
              inputMode="decimal"
              min={0}
              max={2}
              step={0.1}
              value={numberValue(value.min_sun_el_at_landing_deg)}
              aria-invalid={Boolean(errors.min_sun_el_at_landing_deg)}
              aria-describedby={
                errors.min_sun_el_at_landing_deg ? 'windows-min-sun-error' : undefined
              }
              onChange={(event) => update({ min_sun_el_at_landing_deg: readNumber(event) })}
            />
          </label>
          <FieldError id="windows-min-sun-error" message={errors.min_sun_el_at_landing_deg} />

          <label className="windows-field" htmlFor="windows-min-sunlight">
            Minimum sunlight (hours)
            <input
              id="windows-min-sunlight"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={numberValue(value.min_sunlight_hours)}
              aria-invalid={Boolean(errors.min_sunlight_hours)}
              aria-describedby={
                errors.min_sunlight_hours ? 'windows-min-sunlight-error' : undefined
              }
              onChange={(event) => update({ min_sunlight_hours: readNumber(event) })}
            />
          </label>
          <FieldError id="windows-min-sunlight-error" message={errors.min_sunlight_hours} />
        </section>

        <section className="windows-req-group" aria-labelledby="windows-req-darkness">
          <h4 className="label" id="windows-req-darkness">
            Battery / darkness
          </h4>
          <div className="windows-presets">
            {BATTERY_PRESETS.map((hours) => {
              const selected = value.max_darkness_hours === hours
              return (
                <button
                  key={hours}
                  type="button"
                  className={selected ? 'selected' : ''}
                  aria-pressed={selected}
                  onClick={() => update({ max_darkness_hours: hours })}
                >
                  {hours} h
                </button>
              )
            })}
          </div>
          <label className="windows-field" htmlFor="windows-max-darkness">
            Maximum uninterrupted darkness (hours)
            <input
              id="windows-max-darkness"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={numberValue(value.max_darkness_hours)}
              aria-invalid={Boolean(errors.max_darkness_hours)}
              aria-describedby={
                errors.max_darkness_hours ? 'windows-max-darkness-error' : undefined
              }
              onChange={(event) => update({ max_darkness_hours: readNumber(event) })}
            />
          </label>
          <FieldError id="windows-max-darkness-error" message={errors.max_darkness_hours} />
        </section>

        <section className="windows-req-group" aria-labelledby="windows-req-comms">
          <h4 className="label" id="windows-req-comms">
            Earth communications
          </h4>
          <label className="windows-check" htmlFor="windows-require-earth">
            <input
              id="windows-require-earth"
              type="checkbox"
              checked={value.require_earth_at_landing}
              onChange={(event) => update({ require_earth_at_landing: event.target.checked })}
            />
            Require Earth visibility at landing
          </label>

          <label className="windows-field" htmlFor="windows-earth-percent">
            Minimum Earth visibility (% of mission)
            <input
              id="windows-earth-percent"
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              step="any"
              value={percentValue(value.min_earth_fraction)}
              aria-invalid={Boolean(errors.min_earth_fraction)}
              aria-describedby={
                errors.min_earth_fraction ? 'windows-earth-percent-error' : undefined
              }
              onChange={(event) => update({ min_earth_fraction: readNumber(event) / 100 })}
            />
          </label>
          <FieldError id="windows-earth-percent-error" message={errors.min_earth_fraction} />
        </section>
      </div>
    </section>
  )
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p className="windows-field-error" id={id}>
      {message}
    </p>
  )
}
