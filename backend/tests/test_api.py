from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from app import ephemeris
from app.api import routes
from app.main import app

client = TestClient(app)

SCENARIO = {
    "lat_deg": -89.5,
    "lon_deg": 0,
    "start_utc": "2027-01-01T00:00:00Z",
    "end_utc": "2027-01-03T00:00:00Z",
}


def test_sites_lists_catalogue():
    r = client.get("/api/sites")
    assert r.status_code == 200
    ids = [s["id"] for s in r.json()]
    assert "apollo-11" in ids
    assert len(ids) == len(set(ids))


def test_horizon_has_full_circle():
    r = client.get("/api/horizon", params={"lat_deg": -89.5, "lon_deg": 0})
    assert r.status_code == 200
    body = r.json()
    assert len(body["elevation_deg"]) * body["azimuth_step_deg"] == 360


def test_timeline_series_have_equal_length():
    r = client.get("/api/timeline", params={**SCENARIO, "step_minutes": 60})
    assert r.status_code == 200
    body = r.json()
    assert len(body["times_utc"]) == 49
    assert body["times_utc"][0] == "2027-01-01T00:00:00Z"
    for name in ("sun", "earth"):
        for field in ("az_deg", "el_deg", "visible"):
            assert len(body[name][field]) == 49


def test_summary_shape():
    r = client.get("/api/summary", params=SCENARIO)
    assert r.status_code == 200
    body = r.json()
    assert 0.0 <= body["sun"]["visible_fraction"] <= 1.0
    assert set(body["meta"]) == {"ephemeris", "horizon"}


def test_windows_contract_stub():
    r = client.get(
        "/api/windows",
        params={
            "lat_deg": -89.5,
            "lon_deg": 0,
            "search_start_utc": "2027-01-01T00:00:00Z",
            "search_end_utc": "2028-01-01T00:00:00Z",
            "duration_hours": 708.7,
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["matches"]
    assert body["matches"] == sorted(body["matches"], key=lambda s: s["score"], reverse=True)
    assert set(body["meta"]) == {"ephemeris", "horizon"}
    assert body["cycles_summary"]["synodic_month_days"] == 29.53
    assert (
        client.get(
            "/api/windows",
            params={
                "lat_deg": -89.5,
                "lon_deg": 0,
                "search_start_utc": "2028-01-01T00:00:00Z",
                "search_end_utc": "2027-01-01T00:00:00Z",
            },
        ).status_code
        == 422
    )


def test_optimal_site_contract_stub():
    r = client.get("/api/optimal-site", params=SCENARIO)
    assert r.status_code == 200
    body = r.json()
    assert body["optimal"] == body["ranking"][0]
    assert body["weights"] == {"w_sun": 0.45, "w_earth": 0.25, "w_overlap": 0.30}
    assert body["cursor_bodies"]["cursor_utc"] == SCENARIO["start_utc"]
    assert any(candidate["is_catalog_site"] for candidate in body["ranking"])
    assert any(not candidate["is_catalog_site"] for candidate in body["ranking"])

    weighted = client.get(
        "/api/optimal-site",
        params={**SCENARIO, "w_sun": 0.7, "w_earth": 0.1, "w_overlap": 0.2},
    )
    assert weighted.status_code == 200
    assert weighted.json()["weights"] == {"w_sun": 0.7, "w_earth": 0.1, "w_overlap": 0.2}

    invalid_range = client.get(
        "/api/optimal-site",
        params={**SCENARIO, "end_utc": "2026-12-01T00:00:00Z"},
    )
    assert invalid_range.status_code == 422


@pytest.mark.parametrize(
    "params",
    [
        {"w_sun": "nan"},
        {"w_sun": -1},
        {"w_earth": "inf"},
    ],
    ids=["w_sun_nan", "w_sun_negative", "w_earth_inf"],
)
def test_optimal_site_rejects_invalid_weights(params):
    r = client.get(
        "/api/optimal-site",
        params={
            "start_utc": "2027-01-01T00:00:00Z",
            "end_utc": "2027-01-10T00:00:00Z",
            **params,
        },
    )
    assert r.status_code == 422


def test_rejects_bad_input():
    assert client.get("/api/horizon", params={"lat_deg": 91, "lon_deg": 0}).status_code == 422
    reversed_range = {**SCENARIO, "end_utc": "2026-12-01T00:00:00Z"}
    assert client.get("/api/timeline", params=reversed_range).status_code == 422
    too_dense = {**SCENARIO, "end_utc": "2028-01-01T00:00:00Z", "step_minutes": 1}
    assert client.get("/api/timeline", params=too_dense).status_code == 422
    assert client.get("/api/optimal-site", params=too_dense).status_code == 422
    out_of_spice_years = {
        **SCENARIO,
        "start_utc": "3000-01-01T00:00:00Z",
        "end_utc": "3000-01-02T00:00:00Z",
    }
    assert client.get("/api/timeline", params=out_of_spice_years).status_code == 422
    too_many_windows = {
        "lat_deg": -89.5,
        "lon_deg": 0,
        "search_start_utc": "2020-01-01T00:00:00Z",
        "search_end_utc": "2030-01-01T00:00:00Z",
        "duration_hours": 0.5,
    }
    assert client.get("/api/windows", params=too_many_windows).status_code == 422


def test_single_sample_summary_and_outside_calendar_windows():
    single = client.get(
        "/api/summary",
        params={
            "lat_deg": 0.0,
            "lon_deg": 0.0,
            "start_utc": "2027-01-01T00:00:00Z",
            "end_utc": "2027-01-01T00:30:00Z",
            "step_minutes": 60,
        },
    )
    assert single.status_code == 200
    body = single.json()
    assert body["earth"]["visible_at_start"] is True
    assert body["earth"]["visible_fraction"] == 1.0

    # Zakres w roku 2026 (poza prekomputowanym kalendarzem 2027-2035) liczy się na żądanie
    win_2026 = client.get(
        "/api/windows",
        params={
            "lat_deg": -89.5,
            "lon_deg": 0.0,
            "search_start_utc": "2026-01-01T00:00:00Z",
            "search_end_utc": "2026-03-01T00:00:00Z",
            "duration_hours": 708.7,
        },
    )
    assert win_2026.status_code == 200
    assert len(win_2026.json()["grid"]) >= 1


def test_horizon_response_is_cached_without_sharing_mutable_data(monkeypatch):
    calls = 0

    def build_profile(lat_deg, lon_deg):
        nonlocal calls
        calls += 1
        return {"azimuth_step_deg": 1.0, "elevation_deg": [0.0], "source": "flat"}

    routes._cached_horizon.cache_clear()
    monkeypatch.setattr(routes.terrain, "horizon_profile", build_profile)

    first = routes.horizon(1.0, 2.0)
    first["elevation_deg"].append(99.0)
    second = routes.horizon(1.0, 2.0)

    assert calls == 1
    assert second["elevation_deg"] == [0.0]
    routes._cached_horizon.cache_clear()


def test_timeline_response_is_cached_by_query(monkeypatch):
    calls = 0

    def build_timeline(*args):
        nonlocal calls
        calls += 1
        return {"call": calls}

    start = datetime(2027, 2, 1, tzinfo=UTC)
    end = datetime(2027, 2, 2, tzinfo=UTC)
    routes._cached_timeline.cache_clear()
    monkeypatch.setattr(routes.metrics, "timeline", build_timeline)

    first = routes.timeline(1.0, 2.0, start, end, 60)
    repeated = routes.timeline(1.0, 2.0, start, end, 60)
    different_step = routes.timeline(1.0, 2.0, start, end, 30)

    assert first == repeated
    assert different_step != first
    assert calls == 2
    routes._cached_timeline.cache_clear()


def test_summary_response_is_cached_by_query(monkeypatch):
    calls = 0

    def build_summary(*args):
        nonlocal calls
        calls += 1
        return {"call": calls}

    start = datetime(2027, 3, 1, tzinfo=UTC)
    end = datetime(2027, 3, 2, tzinfo=UTC)
    routes._cached_summary.cache_clear()
    monkeypatch.setattr(routes.metrics, "summary", build_summary)

    first = routes.summary(1.0, 2.0, start, end, 60)
    repeated = routes.summary(1.0, 2.0, start, end, 60)
    different_step = routes.summary(1.0, 2.0, start, end, 30)

    assert first == repeated
    assert different_step != first
    assert calls == 2
    routes._cached_summary.cache_clear()


@pytest.mark.skipif(not ephemeris.are_kernels_loaded(), reason="Wymaga pobranych jąder SPICE")
def test_timeline_rejects_spice_out_of_range():
    r = client.get(
        "/api/timeline",
        params={
            "lat_deg": -89.5,
            "lon_deg": 0,
            "start_utc": "2150-06-01T00:00:00Z",
            "end_utc": "2150-06-05T00:00:00Z",
        },
    )
    assert r.status_code == 422


@pytest.mark.skipif(not ephemeris.are_kernels_loaded(), reason="Wymaga pobranych jąder SPICE")
def test_optimal_site_rejects_spice_out_of_range_cursor():
    r = client.get(
        "/api/optimal-site",
        params={
            "start_utc": "2027-01-01T00:00:00Z",
            "end_utc": "2027-01-10T00:00:00Z",
            "cursor_utc": "2300-01-01T00:00:00Z",
        },
    )
    assert r.status_code == 422


@pytest.mark.skipif(not ephemeris.are_kernels_loaded(), reason="Wymaga pobranych jąder SPICE")
def test_windows_rejects_spice_out_of_range_search():
    r = client.get(
        "/api/windows",
        params={
            "lat_deg": -89.5,
            "lon_deg": 0,
            "search_start_utc": "2150-03-01T00:00:00Z",
            "search_end_utc": "2150-08-01T00:00:00Z",
            "duration_hours": 72,
        },
    )
    assert r.status_code == 422


@pytest.mark.skipif(not ephemeris.are_kernels_loaded(), reason="Wymaga pobranych jąder SPICE")
def test_windows_rejects_spice_out_of_range_reference():
    r = client.get(
        "/api/windows",
        params={
            "lat_deg": -89.5,
            "lon_deg": 0,
            "search_start_utc": "2027-01-01T00:00:00Z",
            "search_end_utc": "2027-06-01T00:00:00Z",
            "duration_hours": 72,
            "reference_start_utc": "2150-06-01T00:00:00Z",
            "slip_days": 10,
        },
    )
    assert r.status_code == 422
