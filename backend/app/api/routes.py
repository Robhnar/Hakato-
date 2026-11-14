"""Endpointy HTTP. Opis w docs/ARCHITECTURE.md, przykłady w contracts/fixtures/."""

import json
from copy import deepcopy
from datetime import datetime
from functools import lru_cache
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query

from .. import metrics, terrain
from ..config import DATA_DIR
from ..timeutil import to_utc
from . import schemas

router = APIRouter(prefix="/api")

MAX_SAMPLES = 20_000

Lat = Annotated[float, Query(ge=-90, le=90)]
Lon = Annotated[float, Query(ge=-180, le=180)]
Step = Annotated[float, Query(ge=1, le=1440)]


def _check_range(start_utc: datetime, end_utc: datetime, step_minutes: float) -> None:
    span_minutes = (to_utc(end_utc) - to_utc(start_utc)).total_seconds() / 60.0
    if span_minutes <= 0:
        raise HTTPException(422, "end_utc musi być późniejszy niż start_utc")
    if span_minutes / step_minutes > MAX_SAMPLES:
        raise HTTPException(422, f"Za dużo próbek (limit {MAX_SAMPLES}); zwiększ step_minutes")


@router.get("/health")
def health() -> dict:
    return {"status": "ok"}


@router.get("/sites", response_model=list[schemas.Site])
def sites() -> list[dict]:
    return json.loads((DATA_DIR / "sites.json").read_text(encoding="utf-8"))


@lru_cache(maxsize=128)
def _cached_horizon(lat_deg: float, lon_deg: float) -> dict:
    return terrain.horizon_profile(lat_deg, lon_deg)


@router.get("/horizon", response_model=schemas.Horizon)
def horizon(lat_deg: Lat, lon_deg: Lon) -> dict:
    return deepcopy(_cached_horizon(lat_deg, lon_deg))


@lru_cache(maxsize=8)
def _cached_timeline(
    lat_deg: float,
    lon_deg: float,
    start_utc: datetime,
    end_utc: datetime,
    step_minutes: float,
) -> dict:
    return metrics.timeline(lat_deg, lon_deg, start_utc, end_utc, step_minutes)


@router.get("/timeline", response_model=schemas.Timeline)
def timeline(
    lat_deg: Lat, lon_deg: Lon, start_utc: datetime, end_utc: datetime, step_minutes: Step = 60
) -> dict:
    _check_range(start_utc, end_utc, step_minutes)
    return deepcopy(_cached_timeline(lat_deg, lon_deg, start_utc, end_utc, step_minutes))


@lru_cache(maxsize=32)
def _cached_summary(
    lat_deg: float,
    lon_deg: float,
    start_utc: datetime,
    end_utc: datetime,
    step_minutes: float,
) -> dict:
    return metrics.summary(lat_deg, lon_deg, start_utc, end_utc, step_minutes)


@router.get("/summary", response_model=schemas.Summary)
def summary(
    lat_deg: Lat,
    lon_deg: Lon,
    start_utc: datetime,
    end_utc: datetime,
    step_minutes: Step = metrics.SUMMARY_STEP_MINUTES,
) -> dict:
    _check_range(start_utc, end_utc, step_minutes)
    return deepcopy(_cached_summary(lat_deg, lon_deg, start_utc, end_utc, step_minutes))


@lru_cache(maxsize=32)
def _cached_windows(
    lat_deg: float,
    lon_deg: float,
    search_start_utc: datetime,
    search_end_utc: datetime,
    duration_hours: float,
    min_sun_el_at_landing_deg: float,
    min_sunlight_hours: float,
    max_darkness_hours: float,
    require_earth_at_landing: bool,
    min_earth_fraction: float,
    reference_start_utc: datetime | None,
    slip_days: float,
) -> dict:
    return metrics.search_windows(
        lat_deg=lat_deg,
        lon_deg=lon_deg,
        search_start_utc=search_start_utc,
        search_end_utc=search_end_utc,
        duration_hours=duration_hours,
        min_sun_el_at_landing_deg=min_sun_el_at_landing_deg,
        min_sunlight_hours=min_sunlight_hours,
        max_darkness_hours=max_darkness_hours,
        require_earth_at_landing=require_earth_at_landing,
        min_earth_fraction=min_earth_fraction,
        reference_start_utc=reference_start_utc,
        slip_days=slip_days,
    )


@router.get("/windows", response_model=schemas.WindowsResponse)
def windows(
    lat_deg: Lat,
    lon_deg: Lon,
    search_start_utc: datetime,
    search_end_utc: datetime,
    duration_hours: Annotated[float, Query(gt=0, le=10_000)] = 708.7,
    min_sun_el_at_landing_deg: float = -90.0,
    min_sunlight_hours: float = 0.0,
    max_darkness_hours: Annotated[float, Query(ge=0)] = 708.7,
    require_earth_at_landing: bool = False,
    min_earth_fraction: Annotated[float, Query(ge=0, le=1)] = 0.0,
    reference_start_utc: datetime | None = None,
    slip_days: float = 0.0,
) -> dict:
    if to_utc(search_end_utc) <= to_utc(search_start_utc):
        raise HTTPException(422, "search_end_utc musi być późniejszy niż search_start_utc")
    try:
        return deepcopy(
            _cached_windows(
                lat_deg,
                lon_deg,
                search_start_utc,
                search_end_utc,
                duration_hours,
                min_sun_el_at_landing_deg,
                min_sunlight_hours,
                max_darkness_hours,
                require_earth_at_landing,
                min_earth_fraction,
                reference_start_utc,
                slip_days,
            )
        )
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc


@lru_cache(maxsize=16)
def _cached_optimal_site(
    start_utc: datetime,
    end_utc: datetime,
    cursor_utc: datetime | None,
    step_minutes: float,
    w_sun: float,
    w_earth: float,
    w_overlap: float,
) -> dict:
    return metrics.find_optimal_site(
        start_utc=start_utc,
        end_utc=end_utc,
        cursor_utc=cursor_utc,
        step_minutes=step_minutes,
        w_sun=w_sun,
        w_earth=w_earth,
        w_overlap=w_overlap,
    )


@router.get("/optimal-site", response_model=schemas.OptimalSiteResponse)
def optimal_site(
    start_utc: datetime,
    end_utc: datetime,
    cursor_utc: datetime | None = None,
    step_minutes: Step = 60.0,
    w_sun: float = 0.45,
    w_earth: float = 0.25,
    w_overlap: float = 0.30,
) -> dict:
    if to_utc(end_utc) <= to_utc(start_utc):
        raise HTTPException(422, "end_utc musi być późniejszy niż start_utc")
    try:
        return deepcopy(
            _cached_optimal_site(
                start_utc,
                end_utc,
                cursor_utc,
                step_minutes,
                w_sun,
                w_earth,
                w_overlap,
            )
        )
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
