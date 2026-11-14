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


# --- Wyszukiwarka okien lądowania (zadanie 011) ---


class SlotCycles(BaseModel):
    lunar_day_index: int
    seasonal_phase_deg: float
    draconic_year_phase_deg: float


class SlotUncertainty(BaseModel):
    """Opcjonalne pole pod zadanie 016 (margines niepewności)."""

    worst_case_sunlight_hours: float | None = None
    horizon_margin_deg: float | None = None


class CalendarSlot(BaseModel):
    start_utc: str
    end_utc: str
    sunlight_hours: float
    sun_visible_fraction: float
    max_darkness_hours: float
    max_sun_el_deg: float
    sun_el_at_start_deg: float
    earth_hours: float
    earth_visible_fraction: float
    earth_visible_at_start: bool
    passes_requirements: bool
    score: float
    cycles: SlotCycles
    uncertainty: SlotUncertainty | None = None


class SlipAnalysis(BaseModel):
    original_slot: CalendarSlot
    delayed_slot: CalendarSlot
    delta_sunlight_hours: float
    delta_max_darkness_hours: float
    delta_earth_fraction: float
    nearest_equivalent_slot: CalendarSlot | None = None
    explanation: str


class CyclesSummary(BaseModel):
    synodic_month_days: float = 29.53
    draconic_year_days: float = 346.62
    nodal_precession_years: float = 18.6
    libration_month_days: float = 27.21


class WindowsResponse(BaseModel):
    grid: list[CalendarSlot]
    matches: list[CalendarSlot]
    slip_analysis: SlipAnalysis | None = None
    cycles_summary: CyclesSummary
    meta: Meta
