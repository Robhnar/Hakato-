"""Prekalkulacja i odczyt wieloletnich kalendarzy dni księżycowych (zadanie 012)."""

from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta

from .. import terrain
from ..config import DATA_DIR
from .windows_search import SYNODIC_MONTH_DAYS, evaluate_slot

CALENDARS_DIR = DATA_DIR / "calendars"


def build_site_calendar(
    lat_deg: float,
    lon_deg: float,
    start_year: int = 2027,
    end_year: int = 2035,
    duration_hours: float = 708.7,
    sample_step_minutes: float = 120.0,
) -> list[dict]:
    """Generuje listę kolejnych dni księżycowych dla miejsca na lata start_year..end_year."""
    profile = terrain.horizon_profile(lat_deg, lon_deg)
    start_dt = datetime(start_year, 1, 1, 0, 0, tzinfo=UTC)
    end_dt = datetime(end_year, 12, 31, 23, 59, 59, tzinfo=UTC)

    slots: list[dict] = []
    current = start_dt
    while current <= end_dt:
        slot = evaluate_slot(
            lat_deg=lat_deg,
            lon_deg=lon_deg,
            start_dt=current,
            duration_hours=duration_hours,
            horizon_profile=profile,
            sample_step_minutes=sample_step_minutes,
        )
        slots.append(slot)
        current += timedelta(days=SYNODIC_MONTH_DAYS)
    return slots


def load_precomputed_calendar(lat_deg: float, lon_deg: float) -> list[dict] | None:
    """Zwraca prekomputowany kalendarz z data/calendars/<id>.json, jeśli współrzędne pasują."""
    sites_file = DATA_DIR / "sites.json"
    if not (CALENDARS_DIR.is_dir() and sites_file.is_file()):
        return None

    try:
        sites = json.loads(sites_file.read_text(encoding="utf-8"))
        for site in sites:
            if (
                abs(float(site.get("lat_deg", 999)) - lat_deg) < 1e-4
                and abs(float(site.get("lon_deg", 999)) - lon_deg) < 1e-4
            ):
                cal_path = CALENDARS_DIR / f"{site['id']}.json"
                if cal_path.is_file():
                    data = json.loads(cal_path.read_text(encoding="utf-8"))
                    if isinstance(data, list) and data:
                        return data
    except (OSError, json.JSONDecodeError, KeyError, ValueError):
        return None
    return None
