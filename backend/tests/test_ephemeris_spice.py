"""Testy modułu efemeryd: SPICE i zgodność z JPL Horizons."""

import time
from datetime import UTC, datetime, timedelta

import pytest

from app import ephemeris

# Punkty kontrolne wygenerowane bezpośrednio z oficjalnego systemu NASA JPL Horizons
# (Observer Table na powierzchni Księżyca w układzie selenograficznym)
CHECKPOINTS_HORIZONS = [
    ("equator", "SUN", 0.0, 0.0, "2026-07-15 12:00", 85.09805, -79.003936),
    ("equator", "EARTH", 0.0, 0.0, "2026-07-15 12:00", 120.123779, 84.928094),
    ("mid_lat", "SUN", 45.0, 30.0, "2026-08-20 18:00", 115.452725, 23.347336),
    ("mid_lat", "EARTH", 45.0, 30.0, "2026-08-20 18:00", 219.574137, 45.107521),
    ("south_pole", "SUN", -89.9, 0.0, "2026-10-01 00:00", 302.82896, 1.037973),
    ("south_pole", "EARTH", -89.9, 0.0, "2026-10-01 00:00", 358.807429, 6.492197),
]


def test_ephemeris_source_indicator():
    """SOURCE musi być 'spice', gdy jądra są załadowane, lub 'placeholder'."""
    assert ephemeris.SOURCE in ("spice", "placeholder")
    if ephemeris.are_kernels_loaded():
        assert str(ephemeris.SOURCE) == "spice"


@pytest.mark.skipif(not ephemeris.are_kernels_loaded(), reason="Wymaga pobranych jąder SPICE")
@pytest.mark.parametrize("name,target,lat,lon,time_str,exp_az,exp_el", CHECKPOINTS_HORIZONS)
def test_horizons_accuracy_within_0_05_deg(name, target, lat, lon, time_str, exp_az, exp_el):
    """Zgodność z JPL Horizons dla równika, średnich szerokości i bieguna południowego do 0.05 st."""
    dt = datetime.strptime(time_str, "%Y-%m-%d %H:%M").replace(tzinfo=UTC)
    res = ephemeris.body_positions(lat, lon, [dt])
    body_key = target.lower()
    calc_az = res[body_key]["az_deg"][0]
    calc_el = res[body_key]["el_deg"][0]

    diff_az = abs(calc_az - exp_az)
    # Obsługa zawinięcia 360 st. jeśli na granicy
    if diff_az > 180:
        diff_az = abs(diff_az - 360)
    diff_el = abs(calc_el - exp_el)

    assert diff_az < 0.05, f"Błąd azymutu {name} {target}: {diff_az:.6f} > 0.05 deg"
    assert diff_el < 0.05, f"Błąd elewacji {name} {target}: {diff_el:.6f} > 0.05 deg"


@pytest.mark.skipif(not ephemeris.are_kernels_loaded(), reason="Wymaga pobranych jąder SPICE")
def test_vectorized_performance_5000_samples():
    """Obliczenia wektorowe dla 5000 próbek muszą trwać poniżej 1 s."""
    t0 = datetime(2026, 1, 1, tzinfo=UTC)
    times = [t0 + timedelta(hours=i) for i in range(5000)]

    start = time.perf_counter()
    res = ephemeris.body_positions(-89.9, 0.0, times)
    elapsed = time.perf_counter() - start

    assert len(res["sun"]["az_deg"]) == 5000
    assert len(res["earth"]["el_deg"]) == 5000
    assert elapsed < 1.0, f"Obliczenia trwały za długo: {elapsed:.3f} s (wymagane < 1.0 s)"


def test_fallback_without_kernels(monkeypatch):
    """Bez jąder moduł działa dalej na modelu przybliżonym i zwraca 'placeholder'."""
    monkeypatch.setenv("HAKATO_FORCE_PLACEHOLDER", "1")
    assert not ephemeris.are_kernels_loaded()
    assert str(ephemeris.SOURCE) == "placeholder"

    dt = datetime(2027, 1, 1, tzinfo=UTC)
    res = ephemeris.body_positions(0.0, 0.0, [dt])
    assert len(res["sun"]["az_deg"]) == 1
    assert len(res["earth"]["el_deg"]) == 1


def test_empty_times_utc():
    """Pusta lista czasów zwraca puste listy bez błędów."""
    res = ephemeris.body_positions(0.0, 0.0, [])
    assert res["sun"]["az_deg"] == []
    assert res["sun"]["el_deg"] == []
    assert res["earth"]["az_deg"] == []
    assert res["earth"]["el_deg"] == []


@pytest.mark.skipif(not ephemeris.are_kernels_loaded(), reason="Wymaga pobranych jąder SPICE")
def test_single_time_utc_spice():
    """Pojedynczy punkt czasowy w SPICE zwraca dokładnie jeden wynik."""
    dt = datetime(2026, 7, 15, 12, 0, tzinfo=UTC)
    res = ephemeris.body_positions(0.0, 0.0, [dt])
    assert len(res["sun"]["az_deg"]) == 1
    assert len(res["earth"]["az_deg"]) == 1


@pytest.mark.skipif(not ephemeris.are_kernels_loaded(), reason="Wymaga pobranych jąder SPICE")
def test_body_positions_is_thread_safe():
    """Równoległe wywołania muszą dać te same wyniki co sekwencyjne (SPICE nie jest wątkowo bezpieczny)."""
    from concurrent.futures import ThreadPoolExecutor

    start = datetime(2026, 12, 1, tzinfo=UTC)
    windows = [[start + timedelta(days=i, hours=h) for h in range(0, 48, 6)] for i in range(24)]
    expected = [ephemeris.body_positions(-89.5, 0.0, w) for w in windows]

    with ThreadPoolExecutor(max_workers=8) as pool:
        got = list(pool.map(lambda w: ephemeris.body_positions(-89.5, 0.0, w), windows * 4))

    assert got == expected * 4
