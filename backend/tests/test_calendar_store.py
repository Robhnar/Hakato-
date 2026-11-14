"""Testy prekalkulacji i ładowania wieloletnich kalendarzy (zadanie 012)."""

from app.metrics.calendar_store import build_site_calendar, load_precomputed_calendar


def test_build_site_calendar_generates_synodic_slots():
    slots = build_site_calendar(
        lat_deg=-89.5,
        lon_deg=0.0,
        start_year=2027,
        end_year=2027,
        duration_hours=708.7,
        sample_step_minutes=240.0,
    )
    assert len(slots) >= 12
    for slot in slots:
        assert 0.0 <= slot["sunlight_hours"] <= 708.7
        assert 0.0 <= slot["max_darkness_hours"] <= 708.7
        assert "lunar_day_index" in slot["cycles"]
        assert "seasonal_phase_deg" in slot["cycles"]


def test_load_precomputed_calendar_finds_polar_sites():
    cal = load_precomputed_calendar(-89.5, 0.0)
    assert cal is not None
    assert len(cal) >= 100
    # Na biegunie południowym oświetlenie modulowane jest w cyklu ~347 dni (polarne lato vs zima)
    sun_hours = [s["sunlight_hours"] for s in cal]
    assert max(sun_hours) > min(sun_hours)

    ridge = load_precomputed_calendar(-89.45, -137.3)
    assert ridge is not None
    assert max(s["sunlight_hours"] for s in ridge) > max(sun_hours)

    assert load_precomputed_calendar(12.3456, 78.9012) is None
