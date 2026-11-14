"""Kształt odpowiedzi API. To jest kontrakt - zmiana wymaga osobnego PR (patrz AGENTS.md)."""

from typing import Literal

from pydantic import BaseModel


class Site(BaseModel):
    id: str
    name: str
    lat_deg: float
    lon_deg: float
    category: Literal["apollo", "clps", "commercial", "international", "candidate"]
    landing_utc: str | None = None


class Horizon(BaseModel):
    azimuth_step_deg: float
    elevation_deg: list[float]
    source: Literal["flat", "lola", "synthetic"]


class Meta(BaseModel):
    ephemeris: Literal["placeholder", "spice"]
    horizon: Literal["flat", "lola", "synthetic"]


class BodySeries(BaseModel):
    az_deg: list[float]
    el_deg: list[float]
    visible: list[bool]


class Timeline(BaseModel):
    times_utc: list[str]
    sun: BodySeries
    earth: BodySeries
    meta: Meta


class Window(BaseModel):
    start_utc: str
    end_utc: str


class BodySummary(BaseModel):
    visible_fraction: float
    max_el_deg: float
    windows: list[Window]
    visible_at_start: bool
    hours_until_change: float | None


class Summary(BaseModel):
    sun: BodySummary
    earth: BodySummary
    meta: Meta
