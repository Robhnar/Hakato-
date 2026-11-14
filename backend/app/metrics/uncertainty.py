"""Solar-disc visibility, horizon uncertainty, and lunar solar-eclipse calculations."""

from __future__ import annotations

import math
from datetime import datetime, timedelta
from itertools import pairwise
from typing import TypeAlias

from ..timeutil import iso_z, to_utc

TimeValue: TypeAlias = datetime | str
AzEl: TypeAlias = tuple[float, float]

SOLAR_RADIUS_DEG = 0.266
EARTH_RADIUS_FROM_MOON_DEG = 0.95
DEFAULT_HORIZON_MARGIN_DEG = 0.2


def solar_disc_fraction(
    sun_el_deg: float,
    horizon_el_deg: float,
    solar_radius_deg: float = SOLAR_RADIUS_DEG,
) -> float:
    """Fraction of the solar disc above a locally straight horizon."""
    if solar_radius_deg <= 0.0:
        raise ValueError("solar_radius_deg must be positive")

    relative_elevation = (sun_el_deg - horizon_el_deg) / solar_radius_deg
    if relative_elevation <= -1.0:
        return 0.0
    if relative_elevation >= 1.0:
        return 1.0

    return (
        math.acos(-relative_elevation) + relative_elevation * math.sqrt(1.0 - relative_elevation**2)
    ) / math.pi


def solar_visibility_uncertainty(
    times_utc: list[TimeValue],
    sun_az_el: list[AzEl],
    horizon_el_deg: list[float],
    horizon_margin_deg: float = DEFAULT_HORIZON_MARGIN_DEG,
) -> dict[str, float]:
    """Integrate typical and bounded solar-disc visibility over sampled times.

    ``sun_az_el`` contains ``(azimuth, elevation)`` pairs in degrees. Azimuths
    are accepted for symmetry with ephemeris output; horizon elevations are
    sampled by the caller at those azimuths.
    """
    deltas = _time_deltas_hours(times_utc, len(sun_az_el), len(horizon_el_deg))
    if horizon_margin_deg < 0.0:
        raise ValueError("horizon_margin_deg cannot be negative")

    typical = [
        solar_disc_fraction(el, horizon) for (_, el), horizon in zip(sun_az_el, horizon_el_deg)
    ]
    worst = [
        solar_disc_fraction(el, horizon + horizon_margin_deg)
        for (_, el), horizon in zip(sun_az_el, horizon_el_deg)
    ]
    best = [
        solar_disc_fraction(el, horizon - horizon_margin_deg)
        for (_, el), horizon in zip(sun_az_el, horizon_el_deg)
    ]

    return {
        "typical_sunlight_hours": _integrate_hours(deltas, typical),
        "worst_case_sunlight_hours": _integrate_hours(deltas, worst),
        "best_case_sunlight_hours": _integrate_hours(deltas, best),
        "horizon_margin_deg": horizon_margin_deg,
        "solar_radius_deg": SOLAR_RADIUS_DEG,
    }


def detect_eclipses(
    times_utc: list[TimeValue],
    sun_az_el: list[AzEl],
    earth_az_el: list[AzEl],
    earth_radius_deg: float = EARTH_RADIUS_FROM_MOON_DEG,
    solar_radius_deg: float = SOLAR_RADIUS_DEG,
) -> list[dict[str, float | str]]:
    """Find intervals when Earth overlaps the Sun as seen from the lunar site.

    Angular positions are ``(azimuth, elevation)`` pairs in degrees. Contact
    times are linearly interpolated between adjacent samples.
    """
    times = _parse_times(times_utc, len(sun_az_el), len(earth_az_el))
    if earth_radius_deg <= 0.0 or solar_radius_deg <= 0.0:
        raise ValueError("angular radii must be positive")
    if not times:
        return []

    contact_angle = earth_radius_deg + solar_radius_deg
    separations = [
        _angular_separation_deg(sun, earth) for sun, earth in zip(sun_az_el, earth_az_el)
    ]
    obscurations = [
        _overlap_fraction(separation, earth_radius_deg, solar_radius_deg)
        for separation in separations
    ]

    eclipses: list[dict[str, float | str]] = []
    start: datetime | None = None
    max_obscuration = 0.0

    for i, obscuration in enumerate(obscurations):
        if obscuration > 0.0:
            if start is None:
                start = (
                    _interpolate_contact(
                        times[i - 1], times[i], separations[i - 1], separations[i], contact_angle
                    )
                    if i > 0
                    else times[i]
                )
                max_obscuration = obscuration
            else:
                max_obscuration = max(max_obscuration, obscuration)
        elif start is not None:
            end = _interpolate_contact(
                times[i - 1], times[i], separations[i - 1], separations[i], contact_angle
            )
            eclipses.append(_eclipse_result(start, end, max_obscuration))
            start = None
            max_obscuration = 0.0

    if start is not None:
        eclipses.append(_eclipse_result(start, times[-1], max_obscuration))

    return eclipses


def _time_deltas_hours(times_utc: list[TimeValue], *series_lengths: int) -> list[float]:
    times = _parse_times(times_utc, *series_lengths)
    return [(t1 - t0).total_seconds() / 3600.0 for t0, t1 in pairwise(times)]


def _parse_times(times_utc: list[TimeValue], *series_lengths: int) -> list[datetime]:
    if any(length != len(times_utc) for length in series_lengths):
        raise ValueError("times and angle/elevation series must have the same length")

    times = [
        to_utc(datetime.fromisoformat(value)) if isinstance(value, str) else to_utc(value)
        for value in times_utc
    ]
    if any(t1 <= t0 for t0, t1 in pairwise(times)):
        raise ValueError("times_utc must be strictly increasing")
    return times


def _integrate_hours(intervals: list[float], fractions: list[float]) -> float:
    total = sum(
        interval * (start_fraction + end_fraction) / 2.0
        for interval, start_fraction, end_fraction in zip(intervals, fractions, fractions[1:])
    )
    return round(total, 3)


def _angular_separation_deg(first: AzEl, second: AzEl) -> float:
    az1, el1 = map(math.radians, first)
    az2, el2 = map(math.radians, second)
    cosine = math.sin(el1) * math.sin(el2) + math.cos(el1) * math.cos(el2) * math.cos(az1 - az2)
    return math.degrees(math.acos(max(-1.0, min(1.0, cosine))))


def _overlap_fraction(
    separation_deg: float, earth_radius_deg: float, solar_radius_deg: float
) -> float:
    if separation_deg >= earth_radius_deg + solar_radius_deg:
        return 0.0
    if separation_deg <= abs(earth_radius_deg - solar_radius_deg):
        return (
            1.0
            if earth_radius_deg >= solar_radius_deg
            else (earth_radius_deg / solar_radius_deg) ** 2
        )

    distance = separation_deg
    earth_term = (distance**2 + earth_radius_deg**2 - solar_radius_deg**2) / (
        2.0 * distance * earth_radius_deg
    )
    solar_term = (distance**2 + solar_radius_deg**2 - earth_radius_deg**2) / (
        2.0 * distance * solar_radius_deg
    )
    radicand = (
        (-distance + earth_radius_deg + solar_radius_deg)
        * (distance + earth_radius_deg - solar_radius_deg)
        * (distance - earth_radius_deg + solar_radius_deg)
        * (distance + earth_radius_deg + solar_radius_deg)
    )
    overlap = (
        earth_radius_deg**2 * math.acos(max(-1.0, min(1.0, earth_term)))
        + solar_radius_deg**2 * math.acos(max(-1.0, min(1.0, solar_term)))
        - 0.5 * math.sqrt(max(0.0, radicand))
    )
    return max(0.0, min(1.0, overlap / (math.pi * solar_radius_deg**2)))


def _interpolate_contact(
    t0: datetime,
    t1: datetime,
    separation0_deg: float,
    separation1_deg: float,
    contact_angle_deg: float,
) -> datetime:
    span = (t1 - t0).total_seconds()
    difference = separation1_deg - separation0_deg
    fraction = (
        0.5 if abs(difference) < 1e-12 else (contact_angle_deg - separation0_deg) / difference
    )
    fraction = max(0.0, min(1.0, fraction))
    return t0 + timedelta(seconds=round(span * fraction))


def _eclipse_result(
    start: datetime, end: datetime, max_obscuration_fraction: float
) -> dict[str, float | str]:
    return {
        "start_utc": iso_z(start),
        "end_utc": iso_z(end),
        "max_obscuration_fraction": round(max_obscuration_fraction, 4),
        "duration_hours": round((end - start).total_seconds() / 3600.0, 3),
    }
