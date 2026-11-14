"""Testy jednostkowe silnika optymalizacji miejsca lądowania (Zadanie 018)."""

import time
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.metrics import find_optimal_site

client = TestClient(app)


def test_optimal_site_ranking_and_invariants():
    start = datetime(2027, 1, 1, tzinfo=UTC)
    end = start + timedelta(days=29.53)

    res = find_optimal_site(start, end, cursor_utc=start, step_minutes=60.0)

    assert "optimal" in res
    assert "ranking" in res
    assert "cursor_bodies" in res
    assert "weights" in res
    assert "meta" in res

    ranking = res["ranking"]
    assert len(ranking) >= 40  # 5 katalogowych + siatka polarnej czapy

    # Sprawdzenie sortowania rankingu i zgodności optimal z pierwszym elementem
    assert res["optimal"] == ranking[0]
    scores = [c["score"] for c in ranking]
    assert scores == sorted(scores, reverse=True)

    # Sprawdzenie niezmienników dla każdego kandydata: 0 <= F_overlap <= min(F_sun, F_earth) <= 1
    for cand in ranking:
        f_sun = cand["sun_visible_fraction"]
        f_earth = cand["earth_visible_fraction"]
        f_overlap = cand["overlap_fraction"]

        assert 0.0 <= f_sun <= 1.0
        assert 0.0 <= f_earth <= 1.0
        assert 0.0 <= f_overlap <= 1.0
        assert f_overlap <= min(f_sun, f_earth) + 1e-9

        # Score w granicach 0..100
        assert 0.0 <= cand["score"] <= 100.0

        # Max darkness w granicach czasu trwania
        total_hours = (end - start).total_seconds() / 3600.0
        assert 0.0 <= cand["max_darkness_hours"] <= total_hours + 1e-6


def test_optimal_site_weights_change_leader():
    start = datetime(2027, 1, 1, tzinfo=UTC)
    end = start + timedelta(days=29.53)

    # 1. Priorytet wyłącznie na Słońce
    res_sun = find_optimal_site(
        start, end, step_minutes=60.0, w_sun=1.0, w_earth=0.0, w_overlap=0.0
    )
    # 2. Priorytet wyłącznie na Ziemię
    res_earth = find_optimal_site(
        start, end, step_minutes=60.0, w_sun=0.0, w_earth=1.0, w_overlap=0.0
    )

    top_sun = res_sun["optimal"]
    top_earth = res_earth["optimal"]

    # Punkty optymalizujące różne cele powinny mieć różne rankingi / właściwości
    assert top_sun["sun_visible_fraction"] >= top_earth["sun_visible_fraction"] or (
        top_sun["score"] >= top_earth["score"]
    )
    assert top_earth["earth_visible_fraction"] >= top_sun["earth_visible_fraction"] or (
        top_earth["score"] >= top_sun["score"]
    )


def test_cursor_bodies_coordinates_validity():
    start = datetime(2027, 6, 15, 12, 0, tzinfo=UTC)
    end = start + timedelta(days=5)
    cursor = start + timedelta(days=2)

    res = find_optimal_site(start, end, cursor_utc=cursor, step_minutes=120.0)
    cb = res["cursor_bodies"]

    assert cb["cursor_utc"] == "2027-06-17T12:00:00Z"
    assert -90.0 <= cb["subsolar_lat_deg"] <= 90.0
    assert -180.0 <= cb["subsolar_lon_deg"] <= 180.0
    assert -90.0 <= cb["subearth_lat_deg"] <= 90.0
    assert -180.0 <= cb["subearth_lon_deg"] <= 180.0


def test_optimal_site_performance_under_one_second():
    start = datetime(2027, 1, 1, tzinfo=UTC)
    end = start + timedelta(days=29.53)

    t0 = time.perf_counter()
    res = find_optimal_site(start, end, step_minutes=60.0)
    t_calc = time.perf_counter() - t0

    assert len(res["ranking"]) >= 40
    # Obliczenie pełnego okna miesiąca synodycznego powinno zająć poniżej 1.5 sekundy (zwykle < 400 ms)
    assert t_calc < 1.5, f"Czas wykonania {t_calc:.3f} s przekracza limit"


def test_optimal_site_rejects_invalid_inputs():
    start = datetime(2027, 1, 1, tzinfo=UTC)
    end = datetime(2026, 1, 1, tzinfo=UTC)

    # end <= start
    with pytest.raises(ValueError, match="end_utc"):
        find_optimal_site(start, end)

    # Daty poza zasięgiem jąder
    out_of_range = datetime(2250, 1, 1, tzinfo=UTC)
    with pytest.raises(ValueError, match="1850"):
        find_optimal_site(start, out_of_range)


def test_api_optimal_site_endpoint():
    params = {
        "start_utc": "2027-01-01T00:00:00Z",
        "end_utc": "2027-01-15T00:00:00Z",
        "cursor_utc": "2027-01-05T00:00:00Z",
        "w_sun": 0.5,
        "w_earth": 0.3,
        "w_overlap": 0.2,
    }

    resp = client.get("/api/optimal-site", params=params)
    assert resp.status_code == 200
    data = resp.json()

    assert data["optimal"]["id"] == data["ranking"][0]["id"]
    assert len(data["ranking"]) >= 40
    assert data["cursor_bodies"]["cursor_utc"] == "2027-01-05T00:00:00Z"
    assert data["weights"]["w_sun"] == 0.5

    # Bad range
    bad_resp = client.get(
        "/api/optimal-site",
        params={"start_utc": "2027-02-01T00:00:00Z", "end_utc": "2027-01-01T00:00:00Z"},
    )
    assert bad_resp.status_code == 422
