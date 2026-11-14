from fastapi.testclient import TestClient

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


def test_rejects_bad_input():
    assert client.get("/api/horizon", params={"lat_deg": 91, "lon_deg": 0}).status_code == 422
    reversed_range = {**SCENARIO, "end_utc": "2026-12-01T00:00:00Z"}
    assert client.get("/api/timeline", params=reversed_range).status_code == 422
    too_dense = {**SCENARIO, "end_utc": "2028-01-01T00:00:00Z", "step_minutes": 1}
    assert client.get("/api/timeline", params=too_dense).status_code == 422
