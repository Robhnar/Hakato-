"""Tests of the ephemeris module: SPICE and agreement with JPL Horizons."""

import threading
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta

import pytest

from app import ephemeris

# Control points generated directly from the official NASA JPL Horizons system
# (Observer Table on the lunar surface in the selenographic frame)
CHECKPOINTS_HORIZONS = [
    ("equator", "SUN", 0.0, 0.0, "2026-07-15 12:00", 85.09805, -79.003936),
    ("equator", "EARTH", 0.0, 0.0, "2026-07-15 12:00", 120.123779, 84.928094),
    ("mid_lat", "SUN", 45.0, 30.0, "2026-08-20 18:00", 115.452725, 23.347336),
    ("mid_lat", "EARTH", 45.0, 30.0, "2026-08-20 18:00", 219.574137, 45.107521),
    ("south_pole", "SUN", -89.9, 0.0, "2026-10-01 00:00", 302.82896, 1.037973),
    ("south_pole", "EARTH", -89.9, 0.0, "2026-10-01 00:00", 358.807429, 6.492197),
]


def test_ephemeris_source_indicator():
    """SOURCE must be 'spice' when the kernels are loaded, or 'placeholder'."""
    assert ephemeris.SOURCE in ("spice", "placeholder")
    if ephemeris.are_kernels_loaded():
        assert str(ephemeris.SOURCE) == "spice"


@pytest.mark.skipif(not ephemeris.are_kernels_loaded(), reason="Requires downloaded SPICE kernels")
@pytest.mark.parametrize("name,target,lat,lon,time_str,exp_az,exp_el", CHECKPOINTS_HORIZONS)
def test_horizons_accuracy_within_0_05_deg(name, target, lat, lon, time_str, exp_az, exp_el):
    """Agreement with JPL Horizons for the equator, mid-latitudes and the south pole to 0.05 deg."""
    dt = datetime.strptime(time_str, "%Y-%m-%d %H:%M").replace(tzinfo=UTC)
    res = ephemeris.body_positions(lat, lon, [dt])
    body_key = target.lower()
    calc_az = res[body_key]["az_deg"][0]
    calc_el = res[body_key]["el_deg"][0]

    diff_az = abs(calc_az - exp_az)
    # Handle 360 deg wraparound at the boundary
    if diff_az > 180:
        diff_az = abs(diff_az - 360)
    diff_el = abs(calc_el - exp_el)

    assert diff_az < 0.05, f"Azimuth error {name} {target}: {diff_az:.6f} > 0.05 deg"
    assert diff_el < 0.05, f"Elevation error {name} {target}: {diff_el:.6f} > 0.05 deg"


@pytest.mark.skipif(not ephemeris.are_kernels_loaded(), reason="Requires downloaded SPICE kernels")
def test_vectorized_performance_5000_samples():
    """Vectorized computation for 5000 samples must take under 1 s."""
    t0 = datetime(2026, 1, 1, tzinfo=UTC)
    times = [t0 + timedelta(hours=i) for i in range(5000)]

    start = time.perf_counter()
    res = ephemeris.body_positions(-89.9, 0.0, times)
    elapsed = time.perf_counter() - start

    assert len(res["sun"]["az_deg"]) == 5000
    assert len(res["earth"]["el_deg"]) == 5000
    assert elapsed < 1.0, f"Computation took too long: {elapsed:.3f} s (required < 1.0 s)"


def test_fallback_without_kernels(monkeypatch):
    """Without kernels the module keeps working on the approximate model and returns 'placeholder'."""
    monkeypatch.setenv("HAKATO_FORCE_PLACEHOLDER", "1")
    assert not ephemeris.are_kernels_loaded()
    assert str(ephemeris.SOURCE) == "placeholder"

    dt = datetime(2027, 1, 1, tzinfo=UTC)
    res = ephemeris.body_positions(0.0, 0.0, [dt])
    assert len(res["sun"]["az_deg"]) == 1
    assert len(res["earth"]["el_deg"]) == 1


def test_empty_times_utc():
    """An empty list of times returns empty lists without errors."""
    res = ephemeris.body_positions(0.0, 0.0, [])
    assert res["sun"]["az_deg"] == []
    assert res["sun"]["el_deg"] == []
    assert res["earth"]["az_deg"] == []
    assert res["earth"]["el_deg"] == []


@pytest.mark.skipif(not ephemeris.are_kernels_loaded(), reason="Requires downloaded SPICE kernels")
def test_single_time_utc_spice():
    """A single time point in SPICE returns exactly one result."""
    dt = datetime(2026, 7, 15, 12, 0, tzinfo=UTC)
    res = ephemeris.body_positions(0.0, 0.0, [dt])
    assert len(res["sun"]["az_deg"]) == 1
    assert len(res["earth"]["az_deg"]) == 1


@pytest.mark.skipif(not ephemeris.are_kernels_loaded(), reason="Requires downloaded SPICE kernels")
def test_body_positions_is_thread_safe():
    """Parallel calls must give the same results as sequential ones (SPICE is not thread-safe)."""
    from concurrent.futures import ThreadPoolExecutor

    start = datetime(2026, 12, 1, tzinfo=UTC)
    windows = [[start + timedelta(days=i, hours=h) for h in range(0, 48, 6)] for i in range(24)]
    expected = [ephemeris.body_positions(-89.5, 0.0, w) for w in windows]

    with ThreadPoolExecutor(max_workers=8) as pool:
        got = list(pool.map(lambda w: ephemeris.body_positions(-89.5, 0.0, w), windows * 4))

    assert got == expected * 4


class _FakeSpice:
    """Fake spiceypy: remembers how many threads are in a SPICE call at the same time."""

    def __init__(self):
        self._guard = threading.Lock()
        self.inside = 0
        self.max_inside = 0

    def _call(self):
        with self._guard:
            self.inside += 1
            self.max_inside = max(self.max_inside, self.inside)
        time.sleep(0.002)  # gives other threads a chance to enter in parallel
        with self._guard:
            self.inside -= 1

    def str2et(self, iso_times):
        self._call()
        return [0.0] * len(iso_times)

    def spkpos(self, target, ets, frame, abcorr, observer):
        self._call()
        return [[1.0, 0.0, 0.0]] * len(ets), 0.0


def test_spice_calls_never_overlap_across_threads(monkeypatch):
    """Without kernels: parallel body_positions must call SPICE one at a time (SPICE_LOCK)."""
    fake = _FakeSpice()
    monkeypatch.setattr(ephemeris, "are_kernels_loaded", lambda: True)
    monkeypatch.setattr(ephemeris, "spice", fake)
    times = [datetime(2027, 1, 1, tzinfo=UTC) + timedelta(hours=h) for h in range(4)]

    with ThreadPoolExecutor(max_workers=8) as pool:
        list(pool.map(lambda _: ephemeris.body_positions(-89.5, 0.0, times), range(24)))

    assert fake.max_inside == 1
