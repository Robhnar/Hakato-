"""Moduł metryk: łączy efemerydy z terenem. Kontrakt w docs/ARCHITECTURE.md.

Wersja podstawowa: widoczność środka tarczy, dokładność do jednego kroku próbkowania.
Zadanie 003 doprecyzowuje momenty wschodów i zachodów oraz dodaje metryki zasilania.
"""

import math
from datetime import datetime

from .. import ephemeris, terrain
from ..timeutil import iso_z, time_range

BODIES = ("sun", "earth")
SUMMARY_STEP_MINUTES = 10.0


def horizon_elevation_at(profile: dict, az_deg: float) -> float:
    """Wysokość horyzontu na dowolnym azymucie - interpolacja liniowa z zawinięciem 359 -> 0."""
    values = profile["elevation_deg"]
    x = (az_deg % 360.0) / profile["azimuth_step_deg"]
    i = math.floor(x)
    frac = x - i
    n = len(values)
    return values[i % n] * (1.0 - frac) + values[(i + 1) % n] * frac


def timeline(
    lat_deg: float,
    lon_deg: float,
    start_utc: datetime,
    end_utc: datetime,
    step_minutes: float,
    horizon: dict | None = None,
) -> dict:
    """Przebieg położeń i widoczności w czasie. horizon=None: profil z modułu terrain."""
    profile = horizon if horizon is not None else terrain.horizon_profile(lat_deg, lon_deg)
    times = time_range(start_utc, end_utc, step_minutes)
    positions = ephemeris.body_positions(lat_deg, lon_deg, times)

    out: dict = {"times_utc": [iso_z(t) for t in times]}
    for body in BODIES:
        az, el = positions[body]["az_deg"], positions[body]["el_deg"]
        out[body] = {
            "az_deg": [round(a, 3) for a in az],
            "el_deg": [round(e, 3) for e in el],
            "visible": [e > horizon_elevation_at(profile, a) for a, e in zip(az, el)],
        }
    out["meta"] = {"ephemeris": ephemeris.SOURCE, "horizon": profile["source"]}
    return out


def summarize_body(times_utc: list[str], el_deg: list[float], visible: list[bool]) -> dict:
    """Metryki jednego ciała z gotowego przebiegu. Próbki muszą być równo odległe w czasie."""
    windows = []
    run_start = None
    for i, vis in enumerate(visible):
        if vis and run_start is None:
            run_start = i
        if run_start is not None and (not vis or i == len(visible) - 1):
            last = i if vis else i - 1
            windows.append({"start_utc": times_utc[run_start], "end_utc": times_utc[last]})
            run_start = None

    hours_until_change = None
    for i, vis in enumerate(visible):
        if vis != visible[0]:
            t0 = datetime.fromisoformat(times_utc[0])
            ti = datetime.fromisoformat(times_utc[i])
            hours_until_change = round((ti - t0).total_seconds() / 3600.0, 3)
            break

    return {
        "visible_fraction": round(sum(visible) / len(visible), 4),
        "max_el_deg": max(el_deg),
        "windows": windows,
        "visible_at_start": visible[0],
        "hours_until_change": hours_until_change,
    }


def summary(
    lat_deg: float,
    lon_deg: float,
    start_utc: datetime,
    end_utc: datetime,
    step_minutes: float = SUMMARY_STEP_MINUTES,
    horizon: dict | None = None,
) -> dict:
    """Metryki scenariusza: udział czasu z widocznością, okna, czas do najbliższej zmiany."""
    tl = timeline(lat_deg, lon_deg, start_utc, end_utc, step_minutes, horizon)
    out = {
        body: summarize_body(tl["times_utc"], tl[body]["el_deg"], tl[body]["visible"])
        for body in BODIES
    }
    out["meta"] = tl["meta"]
    return out
