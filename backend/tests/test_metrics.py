import pytest

from app.metrics import horizon_elevation_at, summarize_body


def profile(values):
    return {"azimuth_step_deg": 360.0 / len(values), "elevation_deg": values, "source": "synthetic"}


def test_horizon_interpolates_between_samples():
    p = profile([0.0, 2.0, 0.0, 0.0])  # próbki co 90 stopni
    assert horizon_elevation_at(p, 45.0) == pytest.approx(1.0)
    assert horizon_elevation_at(p, 90.0) == pytest.approx(2.0)


def test_horizon_wraps_around_north():
    p = profile([4.0, 0.0, 0.0, 2.0])
    assert horizon_elevation_at(p, 315.0) == pytest.approx(3.0)
    assert horizon_elevation_at(p, 360.0) == pytest.approx(4.0)
    assert horizon_elevation_at(p, -45.0) == pytest.approx(3.0)


def hours(n):
    return [f"2027-01-01T{h:02d}:00:00Z" for h in range(n)]


def test_summary_finds_windows_and_next_change():
    visible = [True, True, False, False, True, True]
    s = summarize_body(hours(6), [1.0, 0.5, -0.5, -1.0, 0.2, 3.0], visible)
    assert s["windows"] == [
        {"start_utc": "2027-01-01T00:00:00Z", "end_utc": "2027-01-01T01:00:00Z"},
        {"start_utc": "2027-01-01T04:00:00Z", "end_utc": "2027-01-01T05:00:00Z"},
    ]
    assert s["visible_at_start"] is True
    assert s["hours_until_change"] == pytest.approx(2.0)
    assert s["visible_fraction"] == pytest.approx(4 / 6, abs=1e-4)
    assert s["max_el_deg"] == 3.0


def test_summary_without_any_change():
    s = summarize_body(hours(3), [-1.0, -2.0, -3.0], [False, False, False])
    assert s["windows"] == []
    assert s["hours_until_change"] is None
    assert s["visible_fraction"] == 0.0
