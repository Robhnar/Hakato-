"""Moduł metryk: łączy efemerydy z terenem. Kontrakt w docs/ARCHITECTURE.md.

Precyzyjne wyznaczanie wschodów i zachodów z interpolacją liniową momentu przejścia
różnicy wysokości ciała i horyzontu przez zero (dokładność rzędu minuty przy kroku 10 min).
"""

from datetime import datetime, timedelta

from .. import ephemeris, terrain
from ..timeutil import iso_z, time_range, to_utc

BODIES = ("sun", "earth")
SUMMARY_STEP_MINUTES = 10.0


def horizon_elevation_at(profile: dict, az_deg: float) -> float:
    """Wysokość horyzontu na dowolnym azymucie - interpolacja liniowa z zawinięciem 359 -> 0."""
    values = profile["elevation_deg"]
    x = (az_deg % 360.0) / profile["azimuth_step_deg"]
    i = int(x)
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


def _interpolate_crossing(t0: datetime, t1: datetime, diff0: float, diff1: float) -> datetime:
    """Liniowa interpolacja chwili przejścia różnicy wysokości ciała i horyzontu przez 0."""
    span_s = (t1 - t0).total_seconds()
    denom = diff1 - diff0
    if abs(denom) < 1e-12:
        fraction = 0.5
    else:
        fraction = -diff0 / denom
        fraction = max(0.0, min(1.0, fraction))
    return t0 + timedelta(seconds=round(span_s * fraction))


def summarize_body(
    times_utc: list[str],
    el_deg: list[float],
    visible: list[bool],
    horizon_el_deg: list[float] | None = None,
) -> dict:
    """Metryki jednego ciała z gotowego przebiegu.

    Jeśli przekazano horizon_el_deg, momenty przejścia (wschód/zachód) są precyzyjnie
    interpolowane z różnicy (el_deg - horizon_el_deg).
    """
    n = len(times_utc)
    if n == 0:
        return {
            "visible_fraction": 0.0,
            "max_el_deg": 0.0,
            "windows": [],
            "visible_at_start": False,
            "hours_until_change": None,
        }

    dt_list = [to_utc(datetime.fromisoformat(t)) for t in times_utc]
    t_start = dt_list[0]
    t_end = dt_list[-1]
    total_duration_s = (t_end - t_start).total_seconds()

    diffs = (
        [e - h for e, h in zip(el_deg, horizon_el_deg)]
        if horizon_el_deg is not None
        else [1.0 if v else -1.0 for v in visible]
    )

    events: list[tuple[datetime, str]] = []

    for i in range(n - 1):
        v0, v1 = visible[i], visible[i + 1]
        if v0 != v1:
            t_cross = _interpolate_crossing(dt_list[i], dt_list[i + 1], diffs[i], diffs[i + 1])
            event_type = "rise" if v1 else "set"
            events.append((t_cross, event_type))

    raw_windows: list[dict[str, str]] = []
    total_visible_s = 0.0

    if visible[0]:
        win_start = t_start
    else:
        win_start = None

    for t_event, event_type in events:
        if event_type == "rise":
            win_start = t_event
        elif event_type == "set" and win_start is not None:
            raw_windows.append({"start_utc": iso_z(win_start), "end_utc": iso_z(t_event)})
            total_visible_s += (t_event - win_start).total_seconds()
            win_start = None

    if win_start is not None:
        raw_windows.append({"start_utc": iso_z(win_start), "end_utc": iso_z(t_end)})
        total_visible_s += (t_end - win_start).total_seconds()

    # Scal sąsiadujące okna i usuń okna o zerowej długości (np. punktowe dotknięcie horyzontu)
    windows: list[dict[str, str]] = []
    for w in raw_windows:
        if w["start_utc"] == w["end_utc"]:
            continue
        if windows and windows[-1]["end_utc"] == w["start_utc"]:
            windows[-1]["end_utc"] = w["end_utc"]
        else:
            windows.append(w)

    visible_at_start = bool(windows and windows[0]["start_utc"] == iso_z(t_start))

    if total_duration_s > 0:
        total_visible_s = sum(
            (
                to_utc(datetime.fromisoformat(w["end_utc"]))
                - to_utc(datetime.fromisoformat(w["start_utc"]))
            ).total_seconds()
            for w in windows
        )
        visible_fraction = round(max(0.0, min(1.0, total_visible_s / total_duration_s)), 4)
    else:
        visible_fraction = 1.0 if visible_at_start else 0.0

    hours_until_change = None
    if visible_at_start:
        first_end = to_utc(datetime.fromisoformat(windows[0]["end_utc"]))
        if first_end < t_end:
            hours_until_change = round((first_end - t_start).total_seconds() / 3600.0, 3)
    elif windows:
        first_start = to_utc(datetime.fromisoformat(windows[0]["start_utc"]))
        hours_until_change = round((first_start - t_start).total_seconds() / 3600.0, 3)

    return {
        "visible_fraction": visible_fraction,
        "max_el_deg": max(el_deg),
        "windows": windows,
        "visible_at_start": visible_at_start,
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
    """Metryki scenariusza: precyzyjne okna i czas do najbliższej zmiany."""
    profile = horizon if horizon is not None else terrain.horizon_profile(lat_deg, lon_deg)
    tl = timeline(lat_deg, lon_deg, start_utc, end_utc, step_minutes, profile)

    out = {}
    for body in BODIES:
        h_elevations = [horizon_elevation_at(profile, a) for a in tl[body]["az_deg"]]
        out[body] = summarize_body(
            tl["times_utc"], tl[body]["el_deg"], tl[body]["visible"], h_elevations
        )

    out["meta"] = tl["meta"]
    return out
