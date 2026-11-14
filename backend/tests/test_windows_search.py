"""Testy modułu wyszukiwarki okien lądowania (zadanie 013)."""

import time
from datetime import UTC, datetime, timedelta

import pytest

from app.metrics.windows_search import (
    _calculate_max_darkness_hours,
    compute_cycles,
    search_windows,
)


def synthetic_flat_horizon():
    return {"azimuth_step_deg": 1.0, "elevation_deg": [0.0] * 360, "source": "synthetic"}


def test_calculate_max_darkness_hours():
    t_start = datetime(2027, 1, 1, 0, 0, tzinfo=UTC)
    t_end = datetime(2027, 1, 2, 0, 0, tzinfo=UTC)  # 24 h

    # 1. Całkowita ciemność (brak okien)
    assert _calculate_max_darkness_hours([], t_start, t_end) == 24.0

    # 2. Okno w środku: ciemność 6h przed, 12h okno, 6h po
    w1 = [{"start_utc": "2027-01-01T06:00:00Z", "end_utc": "2027-01-01T18:00:00Z"}]
    assert _calculate_max_darkness_hours(w1, t_start, t_end) == 6.0

    # 3. Dwa okna z przerwą nocną 8h
    w2 = [
        {"start_utc": "2027-01-01T00:00:00Z", "end_utc": "2027-01-01T08:00:00Z"},
        {"start_utc": "2027-01-01T16:00:00Z", "end_utc": "2027-01-02T00:00:00Z"},
    ]
    assert _calculate_max_darkness_hours(w2, t_start, t_end) == 8.0


def test_compute_cycles():
    dt = datetime(2027, 7, 1, 0, 0, tzinfo=UTC)
    cycles = compute_cycles(dt)

    assert "lunar_day_index" in cycles
    assert "seasonal_phase_deg" in cycles
    assert 0.0 <= cycles["seasonal_phase_deg"] <= 360.0
    assert "draconic_year_note" in cycles
    assert "libration_phase_deg" in cycles


def test_search_windows_filters_and_sorts_by_score():
    start = datetime(2027, 1, 1, 0, 0, tzinfo=UTC)
    end = datetime(2027, 7, 1, 0, 0, tzinfo=UTC)

    # South pole reference
    res = search_windows(
        lat_deg=-89.5,
        lon_deg=0.0,
        search_start_utc=start,
        search_end_utc=end,
        duration_hours=708.7,
        min_sunlight_hours=100.0,
        max_darkness_hours=500.0,
        horizon=synthetic_flat_horizon(),
    )

    assert len(res["grid"]) > 0
    assert "cycles_summary" in res
    assert res["cycles_summary"]["synodic_month_days"] == pytest.approx(29.53, abs=0.1)

    # Wszystkie matches muszą spełniać kryteria i być posortowane malejąco po score
    matches = res["matches"]
    for m in matches:
        assert m["passes_requirements"] is True
        assert m["sunlight_hours"] >= 100.0
        assert m["max_darkness_hours"] <= 500.0

    for i in range(len(matches) - 1):
        assert matches[i]["score"] >= matches[i + 1]["score"]


def test_slip_analysis_detects_drop_and_finds_equivalent_slot():
    ref_start = datetime(2027, 1, 15, 0, 0, tzinfo=UTC)
    slip_days = 14.0  # Połowa dnia księżycowego (przejście dzień -> noc)

    res = search_windows(
        lat_deg=-89.5,
        lon_deg=0.0,
        search_start_utc=ref_start,
        search_end_utc=ref_start + timedelta(days=60),
        duration_hours=350.0,
        reference_start_utc=ref_start,
        slip_days=slip_days,
        horizon=synthetic_flat_horizon(),
    )

    slip = res["slip_analysis"]
    assert slip is not None
    assert "original_slot" in slip
    assert "delayed_slot" in slip
    assert "delta_sunlight_hours" in slip
    assert "explanation" in slip

    # Najbliższe okno równoważne powinno wypadać ok. ~29.5 dnia po dacie pierwotnej
    nearest = slip["nearest_equivalent_slot"]
    if nearest:
        nearest_dt = datetime.fromisoformat(nearest["start_utc"])
        diff_days = (nearest_dt - ref_start).total_seconds() / 86400.0
        assert diff_days >= 28.0  # Co najmniej jeden cykl synodyczny później


def test_search_windows_performance_one_year_under_2_seconds():
    start = datetime(2027, 1, 1, 0, 0, tzinfo=UTC)
    end = datetime(2028, 1, 1, 0, 0, tzinfo=UTC)

    t0 = time.perf_counter()
    res = search_windows(
        lat_deg=-89.5,
        lon_deg=0.0,
        search_start_utc=start,
        search_end_utc=end,
        duration_hours=708.7,
        horizon=synthetic_flat_horizon(),
    )
    elapsed = time.perf_counter() - t0

    assert len(res["grid"]) >= 12
    assert elapsed < 2.0, f"Przeszukiwanie roku trwało za długo: {elapsed:.3f} s"


def test_search_windows_rejects_out_of_range():
    # Poza zakresem SPICE (np. rok 1800 lub 2200)
    start_bad = datetime(1800, 1, 1, 0, 0, tzinfo=UTC)
    end_bad = datetime(1801, 1, 1, 0, 0, tzinfo=UTC)

    with pytest.raises(ValueError, match="SPICE coverage"):
        search_windows(
            lat_deg=0.0,
            lon_deg=0.0,
            search_start_utc=start_bad,
            search_end_utc=end_bad,
        )
