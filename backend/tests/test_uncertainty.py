"""Tests for solar-disc visibility, uncertainty bounds, and lunar eclipses."""

from datetime import UTC, datetime, timedelta

import pytest

from app.api.schemas import CalendarSlot
from app.metrics import summary
from app.metrics.uncertainty import (
    SOLAR_RADIUS_DEG,
    detect_eclipses,
    solar_disc_fraction,
    solar_visibility_uncertainty,
)
from app.metrics.windows_search import evaluate_slot


def test_solar_disc_fraction_at_horizon_and_full_visibility_bounds():
    radius = SOLAR_RADIUS_DEG

    assert solar_disc_fraction(0.0, 0.0) == pytest.approx(0.5)
    assert solar_disc_fraction(-radius, 0.0) == 0.0
    assert solar_disc_fraction(radius, 0.0) == 1.0
    assert 0.0 < solar_disc_fraction(-radius / 2.0, 0.0) < 0.5
    assert 0.5 < solar_disc_fraction(radius / 2.0, 0.0) < 1.0


def test_solar_visibility_uncertainty_integrates_fractional_disc_and_margin():
    times = [
        datetime(2027, 1, 1, 0, 0, tzinfo=UTC),
        datetime(2027, 1, 1, 1, 0, tzinfo=UTC),
    ]

    result = solar_visibility_uncertainty(
        times,
        sun_az_el=[(0.0, 0.0), (0.0, 0.0)],
        horizon_el_deg=[0.0, 0.0],
        horizon_margin_deg=0.2,
    )

    assert result["typical_sunlight_hours"] == pytest.approx(0.5)
    assert result["worst_case_sunlight_hours"] < result["typical_sunlight_hours"]
    assert result["best_case_sunlight_hours"] > result["typical_sunlight_hours"]
    assert result["horizon_margin_deg"] == 0.2
    assert result["solar_radius_deg"] == SOLAR_RADIUS_DEG


def test_detect_eclipses_for_2022_lunar_eclipse_geometry():
    # 2022-11-08 total lunar eclipse: Earth passes in front of the Sun as seen
    # from the Moon. The sampled angular separation spans the observed event.
    start = datetime(2022, 11, 8, 8, 0, tzinfo=UTC)
    times = [start + timedelta(hours=i) for i in range(7)]
    separations = [4.0, 1.8, 0.8, 0.0, 0.8, 1.8, 4.0]
    sun = [(0.0, 30.0)] * len(times)
    earth = [(0.0, 30.0 + separation) for separation in separations]

    eclipses = detect_eclipses(
        times,
        sun_az_el=sun,
        earth_az_el=earth,
    )

    assert len(eclipses) == 1
    eclipse = eclipses[0]
    assert eclipse["start_utc"].startswith("2022-11-08T09:")
    assert eclipse["end_utc"].startswith("2022-11-08T12:")
    assert 2.0 < eclipse["duration_hours"] < 4.0
    assert eclipse["max_obscuration_fraction"] == 1.0


def test_detect_eclipses_returns_empty_when_discs_do_not_overlap():
    times = ["2027-01-01T00:00:00Z", "2027-01-01T01:00:00Z"]

    assert detect_eclipses(times, [(0.0, 20.0)] * 2, [(180.0, 20.0)] * 2) == []


def test_summary_and_window_results_expose_optional_metrics():
    start = datetime(2027, 1, 1, tzinfo=UTC)
    horizon = {"azimuth_step_deg": 1.0, "elevation_deg": [0.0] * 360, "source": "synthetic"}

    scenario = summary(0.0, 0.0, start, start + timedelta(hours=2), horizon=horizon)
    slot = evaluate_slot(0.0, 0.0, start, 2.0, horizon, sample_step_minutes=60.0)

    assert scenario["uncertainty"]["horizon_margin_deg"] == 0.2
    assert isinstance(scenario["eclipses"], list)
    assert slot["uncertainty"]["solar_radius_deg"] == SOLAR_RADIUS_DEG
    assert isinstance(slot["eclipses"], list)
    CalendarSlot.model_validate(slot)


def test_uncertainty_rejects_mismatched_samples_and_invalid_time_order():
    times = ["2027-01-01T00:00:00Z", "2027-01-01T01:00:00Z"]

    with pytest.raises(ValueError, match="same length"):
        solar_visibility_uncertainty(times, [(0.0, 0.0)], [0.0, 0.0])

    with pytest.raises(ValueError, match="strictly increasing"):
        detect_eclipses(times[::-1], [(0.0, 0.0)] * 2, [(0.0, 0.0)] * 2)
