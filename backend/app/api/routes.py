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
