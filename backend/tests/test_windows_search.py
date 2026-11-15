"""Tests of the landing-window search module (task 013)."""

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

    # 1. Total darkness (no windows)
    assert _calculate_max_darkness_hours([], t_start, t_end) == 24.0

    # 2. A window in the middle: 6h of darkness before, a 12h window, 6h after
    w1 = [{"start_utc": "2027-01-01T06:00:00Z", "end_utc": "2027-01-01T18:00:00Z"}]
    assert _calculate_max_darkness_hours(w1, t_start, t_end) == 6.0

    # 3. Two windows with an 8h night gap
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

    # All matches must meet the criteria and be sorted by score descending
    matches = res["matches"]
    for m in matches:
        assert m["passes_requirements"] is True
        assert m["sunlight_hours"] >= 100.0
        assert m["max_darkness_hours"] <= 500.0

    for i in range(len(matches) - 1):
        assert matches[i]["score"] >= matches[i + 1]["score"]


def test_slip_analysis_detects_drop_and_finds_equivalent_slot():
    ref_start = datetime(2027, 1, 15, 0, 0, tzinfo=UTC)
    slip_days = 14.0  # Half a lunar day (day -> night transition)

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

    # The nearest equivalent window should fall about ~29.5 days after the original date
    nearest = slip["nearest_equivalent_slot"]
    if nearest:
        nearest_dt = datetime.fromisoformat(nearest["start_utc"])
        diff_days = (nearest_dt - ref_start).total_seconds() / 86400.0
        assert diff_days >= 28.0  # At least one synodic cycle later


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
    assert elapsed < 2.0, f"Searching a year took too long: {elapsed:.3f} s"


def test_search_windows_rejects_out_of_range():
    # Outside the SPICE range (e.g. year 1800 or 2200)
    start_bad = datetime(1800, 1, 1, 0, 0, tzinfo=UTC)
    end_bad = datetime(1801, 1, 1, 0, 0, tzinfo=UTC)

    with pytest.raises(ValueError, match="SPICE coverage"):
        search_windows(
            lat_deg=0.0,
            lon_deg=0.0,
            search_start_utc=start_bad,
            search_end_utc=end_bad,
        )


def _site_with_calendar():
    import json

    from app.config import DATA_DIR

    sites = json.loads((DATA_DIR / "sites.json").read_text(encoding="utf-8"))
    for site in sites:
        if (DATA_DIR / "calendars" / f"{site['id']}.json").is_file():
            return site
    pytest.skip("Brak prekomputowanego kalendarza w data/calendars/")


@pytest.mark.parametrize(
    "start,end,marker",
    [
        (
            "2026-06-01T00:00:00Z",
            "2027-03-01T00:00:00Z",
            "2027-01-01",
        ),  # starts before the calendar
        ("2035-06-01T00:00:00Z", "2036-06-01T00:00:00Z", "2035-12-31"),  # ends after the calendar
    ],
)
def test_search_beyond_calendar_range_is_computed_not_dropped(start, end, marker):
    """A range extending beyond the 2027-2035 calendar must not lose slots outside the calendar."""
    site = _site_with_calendar()
    result = search_windows(
        lat_deg=site["lat_deg"],
        lon_deg=site["lon_deg"],
        search_start_utc=datetime.fromisoformat(start),
        search_end_utc=datetime.fromisoformat(end),
        duration_hours=708.7,
    )
    starts = sorted(s["start_utc"] for s in result["grid"])
    assert starts, "the search returned no window"
    if marker == "2027-01-01":
        assert starts[0] < marker, f"no slots from before the calendar, first: {starts[0]}"
    else:
        assert starts[-1] > marker, f"no slots after the calendar, last: {starts[-1]}"
