"""Demonstration response for GET /api/optimal-site until task 018 adds the engine."""

import json
from datetime import datetime

from ..config import DATA_DIR
from ..timeutil import iso_z, to_utc

POLAR_GRID_LATITUDES = (-85.0, -87.5, -89.5, -90.0)
POLAR_GRID_LONGITUDES = tuple(range(-180, 180, 45))


def optimal_site_stub(
    start_utc: datetime,
    end_utc: datetime,
    cursor_utc: datetime,
    w_sun: float,
    w_earth: float,
    w_overlap: float,
) -> dict:
    """Return all catalog locations and a polar grid with explicitly placeholder metrics."""
    catalog = json.loads((DATA_DIR / "sites.json").read_text(encoding="utf-8"))
    candidates = [
        _candidate(
            id=site["id"],
            name=site["name"],
            lat_deg=site["lat_deg"],
            lon_deg=site["lon_deg"],
            is_catalog_site=True,
        )
        for site in catalog
    ]
    candidates.extend(
        _candidate(
            id=f"polar-grid-{lat:g}-{lon:g}",
            name=f"Polar reference grid {lat:g}°, {lon:g}°",
            lat_deg=lat,
            lon_deg=lon,
            is_catalog_site=False,
        )
        for lat in POLAR_GRID_LATITUDES
        for lon in POLAR_GRID_LONGITUDES
    )
    duration_hours = max(0.0, (to_utc(end_utc) - to_utc(start_utc)).total_seconds() / 3600.0)
    for candidate in candidates:
        candidate["max_darkness_hours"] = round(duration_hours, 3)

    return {
        "optimal": candidates[0],
        "ranking": candidates,
        "cursor_bodies": {
            "cursor_utc": iso_z(cursor_utc),
            "subsolar_lat_deg": 0.0,
            "subsolar_lon_deg": 0.0,
            "subearth_lat_deg": 0.0,
            "subearth_lon_deg": 0.0,
        },
        "weights": {"w_sun": w_sun, "w_earth": w_earth, "w_overlap": w_overlap},
        "meta": {"ephemeris": "placeholder", "horizon": "synthetic"},
    }


def _candidate(
    *,
    id: str,
    name: str,
    lat_deg: float,
    lon_deg: float,
    is_catalog_site: bool,
) -> dict:
    return {
        "id": id,
        "name": name,
        "lat_deg": lat_deg,
        "lon_deg": lon_deg,
        "elevation_m": None,
        "is_catalog_site": is_catalog_site,
        "score": 0.0,
        "sun_visible_fraction": 0.0,
        "earth_visible_fraction": 0.0,
        "overlap_fraction": 0.0,
        "sunlight_hours": 0.0,
        "earth_hours": 0.0,
        "overlap_hours": 0.0,
        "max_darkness_hours": 0.0,
        "sun_visible_at_cursor": False,
        "earth_visible_at_cursor": False,
    }
