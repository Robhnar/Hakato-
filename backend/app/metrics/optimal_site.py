"""Silnik wyznaczania optymalnego punktu lądowania i polarnej siatki referencyjnej.

Realizuje zadanie 018 (Faza 3) z opisu w docs/tasks/018-silnik-optymalnego-punktu.md.
"""

from __future__ import annotations

import json
import math
from datetime import datetime

from .. import ephemeris, terrain
from ..config import DATA_DIR
from ..ephemeris import placeholder
from ..ephemeris.geometry import az_el
from ..timeutil import iso_z, time_range, to_utc
from . import horizon_elevation_at
from .windows_search import _calculate_max_darkness_hours

try:
    import spiceypy as spice
except ImportError:
    spice = None

MIN_VALID_YEAR = 1850
MAX_VALID_YEAR = 2150

DEFAULT_W_SUN = 0.45
DEFAULT_W_EARTH = 0.25
DEFAULT_W_OVERLAP = 0.30

# Polarna siatka referencyjna wokół bieguna południowego (-85° ... -89.5°)
POLAR_GRID_SPECS: list[tuple[float, int]] = [
    (-89.5, 8),  # co 45°
    (-88.5, 8),  # co 45°
    (-87.0, 12),  # co 30°
    (-85.5, 12),  # co 30°
]


def _sub_body_point(body_pos_km: tuple[float, float, float]) -> tuple[float, float]:
    """Współrzędne selenograficzne (szerokość, długość) podpunktu ciała na Księżycu.

    body_pos_km: wektor ze środka Księżyca do ciała w układzie MOON_ME.
    """
    x, y, z = body_pos_km
    hyp = math.hypot(x, y)
    lat_deg = math.degrees(math.atan2(z, hyp))
    lon_deg = math.degrees(math.atan2(y, x))
    return round(lat_deg, 3), round(lon_deg, 3)


def _load_catalog_sites() -> list[dict]:
    """Wczytaj katalog z data/sites.json."""
    sites_path = DATA_DIR / "sites.json"
    if sites_path.exists():
        try:
            return json.loads(sites_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            pass
    return []


def _generate_candidates() -> list[dict]:
    """Wygeneruj pełny zbiór kandydatów: miejsca katalogowe + polarna siatka referencyjna."""
    candidates = []

    # 1. Miejsca katalogowe
    for site in _load_catalog_sites():
        candidates.append(
            {
                "id": site.get("id", f"site_{site['lat_deg']}_{site['lon_deg']}"),
                "name": site.get("name", "Catalog Site"),
                "lat_deg": float(site["lat_deg"]),
                "lon_deg": float(site["lon_deg"]),
                "elevation_m": float(site["elevation_m"])
                if site.get("elevation_m") is not None
                else None,
                "is_catalog_site": True,
            }
        )

    # 2. Polarna siatka referencyjna wokół bieguna południowego
    for lat, count in POLAR_GRID_SPECS:
        step_deg = 360.0 / count
        for i in range(count):
            lon = round(i * step_deg, 1)
            candidates.append(
                {
                    "id": f"grid_lat_{abs(lat):.1f}s_lon_{lon:.1f}",
                    "name": f"Polar Grid ({lat:.1f}°, {lon:.1f}°)",
                    "lat_deg": lat,
                    "lon_deg": lon,
                    "elevation_m": None,
                    "is_catalog_site": False,
                }
            )

    return candidates


def find_optimal_site(
    start_utc: datetime,
    end_utc: datetime,
    cursor_utc: datetime | None = None,
    step_minutes: float = 60.0,
    w_sun: float = DEFAULT_W_SUN,
    w_earth: float = DEFAULT_W_EARTH,
    w_overlap: float = DEFAULT_W_OVERLAP,
) -> dict:
    """Wyznacza optymalny punkt lądowania oraz ranking kandydatów dla danego okna i wag.

    Zwraca słownik zgodny ze schematem OptimalSiteResponse.
    """
    start_dt = to_utc(start_utc)
    end_dt = to_utc(end_utc)

    if end_dt <= start_dt:
        raise ValueError("end_utc musi być późniejszy niż start_utc")
    if step_minutes <= 0:
        raise ValueError("step_minutes musi być dodatni")

    if not (
        MIN_VALID_YEAR <= start_dt.year <= MAX_VALID_YEAR
        and MIN_VALID_YEAR <= end_dt.year <= MAX_VALID_YEAR
    ):
        raise ValueError(
            f"Daty wyszukiwania muszą mieścić się w zakresie lat {MIN_VALID_YEAR}–{MAX_VALID_YEAR} (pokrycie jąder DE440)"
        )

    # Chwila kursora
    c_dt = to_utc(cursor_utc) if cursor_utc is not None else start_dt

    # Walidacja i normalizacja wag
    sum_w = w_sun + w_earth + w_overlap
    if sum_w <= 0 or w_sun < 0 or w_earth < 0 or w_overlap < 0:
        w_sun, w_earth, w_overlap = DEFAULT_W_SUN, DEFAULT_W_EARTH, DEFAULT_W_OVERLAP
        sum_w = w_sun + w_earth + w_overlap

    # Wygeneruj próbki czasu
    times = time_range(start_dt, end_dt, step_minutes)
    n_samples = len(times)
    total_hours = max((end_dt - start_dt).total_seconds() / 3600.0, 0.0)

    # Pozycje Słońca i Ziemi w układzie MOON_ME dla wszystkich próbek
    if ephemeris.are_kernels_loaded() and spice is not None:
        iso_times = [to_utc(t).strftime("%Y-%m-%dT%H:%M:%SZ") for t in times]
        ets = spice.str2et(iso_times)
        pos_sun_arr, _ = spice.spkpos("SUN", ets, "MOON_ME", "LT+S", "MOON")
        pos_earth_arr, _ = spice.spkpos("EARTH", ets, "MOON_ME", "LT+S", "MOON")

        et_cursor = spice.str2et(iso_z(c_dt))
        cursor_sun_pos, _ = spice.spkpos("SUN", et_cursor, "MOON_ME", "LT+S", "MOON")
        cursor_earth_pos, _ = spice.spkpos("EARTH", et_cursor, "MOON_ME", "LT+S", "MOON")
        cursor_sun_vec = (
            float(cursor_sun_pos[0]),
            float(cursor_sun_pos[1]),
            float(cursor_sun_pos[2]),
        )
        cursor_earth_vec = (
            float(cursor_earth_pos[0]),
            float(cursor_earth_pos[1]),
            float(cursor_earth_pos[2]),
        )
    else:
        pos_sun_arr = [placeholder.sun_position_km(to_utc(t)) for t in times]
        pos_earth_arr = [placeholder.earth_position_km(to_utc(t)) for t in times]
        cursor_sun_vec = placeholder.sun_position_km(c_dt)
        cursor_earth_vec = placeholder.earth_position_km(c_dt)

    # Oblicz współrzędne podsłoneczne i podziemskie
    subsolar_lat, subsolar_lon = _sub_body_point(cursor_sun_vec)
    subearth_lat, subearth_lon = _sub_body_point(cursor_earth_vec)

    cursor_bodies = {
        "cursor_utc": iso_z(c_dt),
        "subsolar_lat_deg": subsolar_lat,
        "subsolar_lon_deg": subsolar_lon,
        "subearth_lat_deg": subearth_lat,
        "subearth_lon_deg": subearth_lon,
    }

    evaluated_candidates = []
    candidates = _generate_candidates()

    for cand in candidates:
        lat = cand["lat_deg"]
        lon = cand["lon_deg"]
        profile = terrain.horizon_profile(lat, lon)

        sun_visible_flags: list[bool] = []
        earth_visible_flags: list[bool] = []
        overlap_flags: list[bool] = []

        # Wektorowa ocena widoczności po próbkach czasu
        for ps, pe in zip(pos_sun_arr, pos_earth_arr):
            az_s, el_s = az_el(lat, lon, ps)
            h_s = horizon_elevation_at(profile, az_s)
            s_vis = el_s > h_s
            sun_visible_flags.append(s_vis)

            az_e, el_e = az_el(lat, lon, pe)
            h_e = horizon_elevation_at(profile, az_e)
            e_vis = el_e > h_e
            earth_visible_flags.append(e_vis)

            overlap_flags.append(s_vis and e_vis)

        # Ułamki widoczności
        f_sun = sum(sun_visible_flags) / n_samples if n_samples > 0 else 0.0
        f_earth = sum(earth_visible_flags) / n_samples if n_samples > 0 else 0.0
        f_overlap = sum(overlap_flags) / n_samples if n_samples > 0 else 0.0

        # Spełnienie nierówności 0 <= f_overlap <= min(f_sun, f_earth)
        f_overlap = max(0.0, min(f_overlap, min(f_sun, f_earth)))

        sunlight_hours = round(f_sun * total_hours, 2)
        earth_hours = round(f_earth * total_hours, 2)
        overlap_hours = round(f_overlap * total_hours, 2)

        # Obliczenie najdłuższego okresu nocy (max_darkness_hours)
        sun_windows: list[dict[str, str]] = []
        in_win = False
        win_start = None
        for t, vis in zip(times, sun_visible_flags):
            if vis and not in_win:
                in_win = True
                win_start = t
            elif not vis and in_win:
                in_win = False
                if win_start is not None:
                    sun_windows.append({"start_utc": iso_z(win_start), "end_utc": iso_z(t)})
        if in_win and win_start is not None:
            sun_windows.append({"start_utc": iso_z(win_start), "end_utc": iso_z(end_dt)})

        max_darkness_hours = _calculate_max_darkness_hours(sun_windows, start_dt, end_dt)

        # Widoczność w chwili kursora
        az_cur_s, el_cur_s = az_el(lat, lon, cursor_sun_vec)
        sun_vis_cursor = el_cur_s > horizon_elevation_at(profile, az_cur_s)

        az_cur_e, el_cur_e = az_el(lat, lon, cursor_earth_vec)
        earth_vis_cursor = el_cur_e > horizon_elevation_at(profile, az_cur_e)

        # Obliczenie punktacji Score (0..100)
        raw_score = 100.0 * (w_sun * f_sun + w_earth * f_earth + w_overlap * f_overlap) / sum_w
        score = round(max(0.0, min(100.0, raw_score)), 2)

        evaluated_candidates.append(
            {
                "id": cand["id"],
                "name": cand["name"],
                "lat_deg": lat,
                "lon_deg": lon,
                "elevation_m": cand["elevation_m"],
                "is_catalog_site": cand["is_catalog_site"],
                "score": score,
                "sun_visible_fraction": round(f_sun, 4),
                "earth_visible_fraction": round(f_earth, 4),
                "overlap_fraction": round(f_overlap, 4),
                "sunlight_hours": sunlight_hours,
                "earth_hours": earth_hours,
                "overlap_hours": overlap_hours,
                "max_darkness_hours": max_darkness_hours,
                "sun_visible_at_cursor": bool(sun_vis_cursor),
                "earth_visible_at_cursor": bool(earth_vis_cursor),
            }
        )

    # Sortowanie rankingu malejąco po punktacji score, następnie overlap_fraction, następnie f_sun
    evaluated_candidates.sort(
        key=lambda c: (c["score"], c["overlap_fraction"], c["sun_visible_fraction"]),
        reverse=True,
    )

    optimal = evaluated_candidates[0] if evaluated_candidates else None

    return {
        "optimal": optimal,
        "ranking": evaluated_candidates,
        "cursor_bodies": cursor_bodies,
        "weights": {
            "w_sun": round(w_sun, 3),
            "w_earth": round(w_earth, 3),
            "w_overlap": round(w_overlap, 3),
        },
        "meta": {
            "ephemeris": ephemeris.SOURCE,
            "horizon": "lola",
        },
    }
