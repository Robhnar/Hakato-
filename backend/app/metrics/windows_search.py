"""Silnik wyszukiwania okien lądowania, cykli astronomicznych i analizy opóźnień startu.

Kontrakt i założenia w docs/tasks/011-kontrakt-wyszukiwarki-okien.md i 013-silnik-wyszukiwania-i-opoznien.md.
"""

from __future__ import annotations

import math
from datetime import UTC, datetime, timedelta

from .. import ephemeris, terrain
from ..timeutil import iso_z, time_range, to_utc
from . import summarize_body
from .uncertainty import detect_eclipses, solar_visibility_uncertainty

SYNODIC_MONTH_DAYS = 29.530588853
DRACONIC_YEAR_DAYS = 346.620075
DRACONIC_MONTH_DAYS = 27.2122208
NODAL_PRECESSION_YEARS = 18.61

EPOCH_J2026 = datetime(2026, 1, 1, 0, 0, tzinfo=UTC)


def compute_cycles(dt: datetime) -> dict:
    """Fazy kluczowych cykli astronomicznych dla danego momentu startu."""
    dt_utc = to_utc(dt)
    elapsed_days = (dt_utc - EPOCH_J2026).total_seconds() / 86400.0

    lunar_day_index = int(elapsed_days // SYNODIC_MONTH_DAYS)

    season_phi = (elapsed_days / DRACONIC_YEAR_DAYS) % 1.0
    seasonal_phase_deg = round(season_phi * 360.0, 1)

    if 135.0 <= seasonal_phase_deg <= 225.0:
        draconic_year_note = "Peak South Polar Summer (Maximum Illumination)"
    elif 45.0 <= seasonal_phase_deg < 135.0:
        draconic_year_note = "Autumnal Transition"
    elif 225.0 < seasonal_phase_deg <= 315.0:
        draconic_year_note = "Vernal Transition"
    else:
        draconic_year_note = "South Polar Winter (Minimum Illumination)"

    libration_phi = (elapsed_days / DRACONIC_MONTH_DAYS) % 1.0
    libration_phase_deg = round(libration_phi * 360.0, 1)

    return {
        "lunar_day_index": lunar_day_index,
        "seasonal_phase_deg": seasonal_phase_deg,
        "draconic_year_phase_deg": seasonal_phase_deg,
        "draconic_year_note": draconic_year_note,
        "libration_phase_deg": libration_phase_deg,
    }


def _calculate_max_darkness_hours(
    windows: list[dict[str, str]], start_dt: datetime, end_dt: datetime
) -> float:
    """Maksymalny nieprzerwany czas nocy (braku Słońca) w oknie."""
    if not windows:
        return round((end_dt - start_dt).total_seconds() / 3600.0, 2)

    gaps_s: list[float] = []

    first_win_start = to_utc(datetime.fromisoformat(windows[0]["start_utc"]))
    if first_win_start > start_dt:
        gaps_s.append((first_win_start - start_dt).total_seconds())

    for i in range(len(windows) - 1):
        cur_end = to_utc(datetime.fromisoformat(windows[i]["end_utc"]))
        next_start = to_utc(datetime.fromisoformat(windows[i + 1]["start_utc"]))
        if next_start > cur_end:
            gaps_s.append((next_start - cur_end).total_seconds())

    last_win_end = to_utc(datetime.fromisoformat(windows[-1]["end_utc"]))
    if end_dt > last_win_end:
        gaps_s.append((end_dt - last_win_end).total_seconds())

    return round(max(gaps_s) / 3600.0, 2) if gaps_s else 0.0


def evaluate_slot(
    lat_deg: float,
    lon_deg: float,
    start_dt: datetime,
    duration_hours: float,
    horizon_profile: dict,
    sample_step_minutes: float = 60.0,
    min_sun_el_at_landing_deg: float = 0.0,
    min_sunlight_hours: float = 0.0,
    max_darkness_hours_limit: float = 708.7,
    require_earth_at_landing: bool = False,
    min_earth_fraction: float = 0.0,
) -> dict:
    """Oblicza parametry pojedynczego okna misji."""
    start_utc = to_utc(start_dt)
    end_utc = start_utc + timedelta(hours=duration_hours)

    times = time_range(start_utc, end_utc, sample_step_minutes)
    times_iso = [iso_z(t) for t in times]

    positions = ephemeris.body_positions(lat_deg, lon_deg, times)

    h_elevation_sun = [
        terrain.horizon_elevation_at(horizon_profile, a)
        if hasattr(terrain, "horizon_elevation_at")
        else _horizon_at(horizon_profile, a)
        for a in positions["sun"]["az_deg"]
    ]
    h_elevation_earth = [
        terrain.horizon_elevation_at(horizon_profile, a)
        if hasattr(terrain, "horizon_elevation_at")
        else _horizon_at(horizon_profile, a)
        for a in positions["earth"]["az_deg"]
    ]

    sun_vis = [e > h for e, h in zip(positions["sun"]["el_deg"], h_elevation_sun)]
    earth_vis = [e > h for e, h in zip(positions["earth"]["el_deg"], h_elevation_earth)]

    sun_summary = summarize_body(times_iso, positions["sun"]["el_deg"], sun_vis, h_elevation_sun)
    earth_summary = summarize_body(
        times_iso, positions["earth"]["el_deg"], earth_vis, h_elevation_earth
    )
    sun_az_el = list(zip(positions["sun"]["az_deg"], positions["sun"]["el_deg"]))
    earth_az_el = list(zip(positions["earth"]["az_deg"], positions["earth"]["el_deg"]))
    uncertainty = solar_visibility_uncertainty(times_iso, sun_az_el, h_elevation_sun)
    eclipses = detect_eclipses(times_iso, sun_az_el, earth_az_el)

    sunlight_hours = round(sun_summary["visible_fraction"] * duration_hours, 2)
    earth_hours = round(earth_summary["visible_fraction"] * duration_hours, 2)

    max_darkness = _calculate_max_darkness_hours(sun_summary["windows"], start_utc, end_utc)

    sun_el_at_start = round(positions["sun"]["el_deg"][0], 2) if positions["sun"]["el_deg"] else 0.0
    max_sun_el = round(sun_summary["max_el_deg"], 2)
    max_earth_el = round(earth_summary["max_el_deg"], 2)

    passes = (
        sun_el_at_start >= min_sun_el_at_landing_deg
        and sunlight_hours >= min_sunlight_hours
        and max_darkness <= max_darkness_hours_limit
        and (not require_earth_at_landing or earth_summary["visible_at_start"])
        and earth_summary["visible_fraction"] >= min_earth_fraction
    )

    score_sun = sun_summary["visible_fraction"] * 50.0
    score_dark = (
        max(0.0, (1.0 - max_darkness / duration_hours)) * 30.0 if duration_hours > 0 else 0.0
    )
    score_earth = earth_summary["visible_fraction"] * 20.0
    score = round(score_sun + score_dark + score_earth, 1)

    cycles = compute_cycles(start_utc)

    return {
        "start_utc": iso_z(start_utc),
        "end_utc": iso_z(end_utc),
        "sunlight_hours": sunlight_hours,
        "sun_visible_fraction": sun_summary["visible_fraction"],
        "max_darkness_hours": max_darkness,
        "max_sun_el_deg": max_sun_el,
        "sun_el_at_start_deg": sun_el_at_start,
        "earth_hours": earth_hours,
        "earth_visible_fraction": earth_summary["visible_fraction"],
        "earth_visible_at_start": earth_summary["visible_at_start"],
        "max_earth_el_deg": max_earth_el,
        "passes_requirements": passes,
        "score": score,
        "cycles": cycles,
        "uncertainty": uncertainty,
        "eclipses": eclipses,
    }


def _horizon_at(profile: dict, az_deg: float) -> float:
    values = profile["elevation_deg"]
    x = (az_deg % 360.0) / profile["azimuth_step_deg"]
    i = int(x)
    frac = x - i
    n = len(values)
    return values[i % n] * (1.0 - frac) + values[(i + 1) % n] * frac


from .calendar_store import load_precomputed_calendar

MAX_SEARCH_YEARS = 10
MAX_WINDOWS_SLOTS = 500
MAX_SLIP_DAYS = 3650.0


def search_windows(
    lat_deg: float,
    lon_deg: float,
    search_start_utc: datetime,
    search_end_utc: datetime,
    duration_hours: float = 708.7,
    min_sun_el_at_landing_deg: float = 0.0,
    min_sunlight_hours: float = 0.0,
    max_darkness_hours: float = 708.7,
    require_earth_at_landing: bool = False,
    min_earth_fraction: float = 0.0,
    reference_start_utc: datetime | None = None,
    slip_days: float = 0.0,
    horizon: dict | None = None,
) -> dict:
    """Główna funkcja wyszukiwarki: przeszukuje siatkę okien, filtruje i analizuje opóźnienie."""
    start_utc = to_utc(search_start_utc)
    end_utc = to_utc(search_end_utc)

    # Walidacja zakresu SPICE (de440s obejmuje 1850-2150)
    min_spice_year = 1850
    max_spice_year = 2150
    if not (
        min_spice_year <= start_utc.year <= max_spice_year
        and min_spice_year <= end_utc.year <= max_spice_year
    ):
        raise ValueError(
            f"search range {start_utc.year}..{end_utc.year} must be within SPICE coverage ({min_spice_year}..{max_spice_year})"
        )

    if end_utc <= start_utc:
        raise ValueError("search_end_utc must be after search_start_utc")

    span_days = (end_utc - start_utc).total_seconds() / 86400.0
    if span_days > MAX_SEARCH_YEARS * 366:
        raise ValueError(f"search range cannot exceed {MAX_SEARCH_YEARS} years")

    if not math.isfinite(slip_days) or abs(slip_days) > MAX_SLIP_DAYS:
        raise ValueError(f"slip_days must be within ±{int(MAX_SLIP_DAYS)} days")

    profile = horizon if horizon is not None else terrain.horizon_profile(lat_deg, lon_deg)

    # 1. Sprawdź, czy mamy gotowy kalendarz z zadania 012 pokrywający badany przedział
    cached_slots = None
    if abs(duration_hours - 708.7) < 2.0:
        cached_slots = load_precomputed_calendar(lat_deg, lon_deg)
        if cached_slots:
            starts = [to_utc(datetime.fromisoformat(slot["start_utc"])) for slot in cached_slots]
            month = timedelta(days=SYNODIC_MONTH_DAYS)
            # Kalendarz pokrywa tylko część zakresu: nie wolno gubić reszty, liczymy na żądanie.
            if not (min(starts) <= start_utc + month and max(starts) >= end_utc - month):
                cached_slots = None

    matching_cached = [
        slot
        for slot in (cached_slots or [])
        if start_utc <= to_utc(datetime.fromisoformat(slot["start_utc"])) <= end_utc
    ]

    grid: list[dict] = []

    if matching_cached:
        # Filtruj prekomputowane sloty z kalendarza
        for slot in matching_cached:
            s = dict(slot)
            passes = (
                s["sun_el_at_start_deg"] >= min_sun_el_at_landing_deg
                and s["sunlight_hours"] >= min_sunlight_hours
                and s["max_darkness_hours"] <= max_darkness_hours
                and (not require_earth_at_landing or s["earth_visible_at_start"])
                and s["earth_visible_fraction"] >= min_earth_fraction
            )
            s["passes_requirements"] = passes
            grid.append(s)
    else:
        # Licz siatkę na żądanie
        step_days = SYNODIC_MONTH_DAYS if duration_hours >= 300.0 else (duration_hours / 24.0)
        step_days = max(1.0, step_days)
        if span_days / step_days > MAX_WINDOWS_SLOTS:
            raise ValueError(
                f"Za dużo okien w siatce (limit {MAX_WINDOWS_SLOTS}); zwiększ duration_hours lub skróć zakres dat"
            )

        current = start_utc
        while current + timedelta(hours=duration_hours) <= end_utc + timedelta(days=1):
            slot = evaluate_slot(
                lat_deg=lat_deg,
                lon_deg=lon_deg,
                start_dt=current,
                duration_hours=duration_hours,
                horizon_profile=profile,
                min_sun_el_at_landing_deg=min_sun_el_at_landing_deg,
                min_sunlight_hours=min_sunlight_hours,
                max_darkness_hours_limit=max_darkness_hours,
                require_earth_at_landing=require_earth_at_landing,
                min_earth_fraction=min_earth_fraction,
            )
            grid.append(slot)
            current += timedelta(days=step_days)

    # 2. Posortuj dopasowane okna (matches)
    matches = [s for s in grid if s["passes_requirements"]]
    matches.sort(key=lambda s: s["score"], reverse=True)

    # 3. Analiza opóźnienia startu (slip analysis)
    slip_analysis = None
    if reference_start_utc is not None:
        ref_start = to_utc(reference_start_utc)
        delayed_start = ref_start + timedelta(days=slip_days)

        orig_slot = evaluate_slot(
            lat_deg,
            lon_deg,
            ref_start,
            duration_hours,
            profile,
            min_sun_el_at_landing_deg=min_sun_el_at_landing_deg,
            min_sunlight_hours=min_sunlight_hours,
            max_darkness_hours_limit=max_darkness_hours,
            require_earth_at_landing=require_earth_at_landing,
            min_earth_fraction=min_earth_fraction,
        )

        delayed_slot = evaluate_slot(
            lat_deg,
            lon_deg,
            delayed_start,
            duration_hours,
            profile,
            min_sun_el_at_landing_deg=min_sun_el_at_landing_deg,
            min_sunlight_hours=min_sunlight_hours,
            max_darkness_hours_limit=max_darkness_hours,
            require_earth_at_landing=require_earth_at_landing,
            min_earth_fraction=min_earth_fraction,
        )

        delta_sunlight = round(delayed_slot["sunlight_hours"] - orig_slot["sunlight_hours"], 2)
        delta_max_dark = round(
            delayed_slot["max_darkness_hours"] - orig_slot["max_darkness_hours"], 2
        )
        delta_earth = round(
            delayed_slot["earth_visible_fraction"] - orig_slot["earth_visible_fraction"],
            4,
        )

        # Znajdź najbliższe kolejne okno równoważne po dacie opóźnionej
        nearest_equivalent = None
        candidate_t = delayed_start + timedelta(days=SYNODIC_MONTH_DAYS)
        max_search_ahead = delayed_start + timedelta(days=365)

        while candidate_t <= max_search_ahead:
            cand = evaluate_slot(
                lat_deg,
                lon_deg,
                candidate_t,
                duration_hours,
                profile,
                min_sun_el_at_landing_deg=min_sun_el_at_landing_deg,
                min_sunlight_hours=min_sunlight_hours,
                max_darkness_hours_limit=max_darkness_hours,
                require_earth_at_landing=require_earth_at_landing,
                min_earth_fraction=min_earth_fraction,
            )
            # Równoważne: spełnia wymagania lub ma zbliżony / lepszy score
            if cand["passes_requirements"] or cand["score"] >= orig_slot["score"] * 0.9:
                nearest_equivalent = cand
                break
            candidate_t += timedelta(days=SYNODIC_MONTH_DAYS)

        if nearest_equivalent:
            near_dt = to_utc(datetime.fromisoformat(nearest_equivalent["start_utc"]))
            wait_days = round((near_dt - delayed_start).total_seconds() / 86400.0, 1)
            explanation = (
                f"Launch slip of {slip_days:+.1f} days changes sunlight by {delta_sunlight:+.1f} h "
                f"and max darkness by {delta_max_dark:+.1f} h. "
                f"Nearest equivalent landing window opens at {nearest_equivalent['start_utc']} "
                f"(+{wait_days:.1f} days after delayed launch, matching the next synodic lunar day)."
            )
        else:
            explanation = (
                f"Launch slip of {slip_days:+.1f} days changes sunlight by {delta_sunlight:+.1f} h."
            )

        slip_analysis = {
            "original_slot": orig_slot,
            "delayed_slot": delayed_slot,
            "delta_sunlight_hours": delta_sunlight,
            "delta_max_darkness_hours": delta_max_dark,
            "delta_earth_fraction": delta_earth,
            "nearest_equivalent_slot": nearest_equivalent,
            "explanation": explanation,
        }

    cycles_summary = {
        "synodic_month_days": round(SYNODIC_MONTH_DAYS, 2),
        "draconic_year_days": round(DRACONIC_YEAR_DAYS, 2),
        "nodal_precession_years": round(NODAL_PRECESSION_YEARS, 1),
        "libration_month_days": round(DRACONIC_MONTH_DAYS, 2),
    }

    meta = {
        "ephemeris": ephemeris.SOURCE,
        "horizon": profile.get("source", "flat"),
    }

    return {
        "grid": grid,
        "matches": matches,
        "slip_analysis": slip_analysis,
        "cycles_summary": cycles_summary,
        "meta": meta,
    }
