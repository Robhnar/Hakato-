"""Tests of the terrain module (horizon profile from the LOLA elevation model and the flat fallback)."""

import json
import math

import numpy as np
import pytest
from fastapi.testclient import TestClient

from app import config, terrain
from app.main import app
from app.terrain.lola import (
    DEFAULT_MOON_RADIUS_M,
    PolarDem,
    compute_horizon_profile,
    latlon_to_pixel,
)

client = TestClient(app)


def _make_synthetic_dem(size: int = 1201, scale_m: float = 500.0) -> PolarDem:
    offset = (size - 1) / 2.0
    return PolarDem(
        data=np.zeros((size, size), dtype=np.int16),
        lines=size,
        line_samples=size,
        map_scale_m=scale_m,
        line_offset=offset,
        sample_offset=offset,
        scaling_factor=1.0,
        radius_m=DEFAULT_MOON_RADIUS_M,
        center_lat_deg=-90.0,
        center_lon_deg=0.0,
        max_lat_deg=-75.0,
    )


def _destination_point(
    lat_deg: float, lon_deg: float, az_deg: float, distance_m: float, radius_m: float
) -> tuple[float, float]:
    lat0 = math.radians(lat_deg)
    lon0 = math.radians(lon_deg)
    az = math.radians(az_deg)
    delta = distance_m / radius_m
    sin_lat = math.sin(lat0) * math.cos(delta) + math.cos(lat0) * math.sin(delta) * math.cos(az)
    lat1 = math.asin(max(-1.0, min(1.0, sin_lat)))
    lon1 = lon0 + math.atan2(
        math.sin(az) * math.sin(delta) * math.cos(lat0),
        math.cos(delta) - math.sin(lat0) * sin_lat,
    )
    return math.degrees(lat1), math.degrees(lon1)


def test_flat_sphere_gives_near_zero_horizon():
    dem = _make_synthetic_dem()
    profile = compute_horizon_profile(dem, lat_deg=-89.5, lon_deg=0.0, max_distance_m=150_000.0)
    assert profile is not None
    assert profile["source"] == "lola"
    assert profile["azimuth_step_deg"] == 1.0
    assert len(profile["elevation_deg"]) == 360
    # With h_obs = 2 m on a smooth sphere the geometric horizon dip is about -0.087°
    for el in profile["elevation_deg"]:
        assert -0.15 < el <= 0.0


@pytest.mark.parametrize("target_az", [0, 90, 180, 270])
def test_single_hill_gives_expected_elevation_at_correct_azimuth(target_az: int):
    dem = _make_synthetic_dem(size=1401, scale_m=500.0)
    lat0, lon0 = -85.0, 25.0
    dist_m = 30_000.0
    hill_height_m = 1_500.0

    hill_lat, hill_lon = _destination_point(lat0, lon0, target_az, dist_m, dem.radius_m)
    sx, sy = latlon_to_pixel(
        np.array([math.radians(hill_lat)]), np.array([math.radians(hill_lon)]), dem
    )
    cx, cy = float(sx[0]), float(sy[0])
    yy, xx = np.ogrid[: dem.lines, : dem.line_samples]
    dist_px = np.hypot(xx - cx, yy - cy)
    dem.data[:] = (hill_height_m * np.clip(2.0 - dist_px / 2.0, 0.0, 1.0)).astype(np.int16)

    profile = compute_horizon_profile(dem, lat_deg=lat0, lon_deg=lon0, max_distance_m=150_000.0)
    assert profile is not None
    elevs = profile["elevation_deg"]

    # Maximum at the expected azimuth (to within the peak width)
    peak_az = int(np.argmax(elevs))
    assert abs(peak_az - target_az) <= 1

    # The remaining perpendicular and opposite directions stay close to 0
    for other_az in (0, 90, 180, 270):
        if other_az != target_az:
            assert elevs[other_az] < 0.0

    # Compare the angle with the exact formula accounting for the Moon's curvature and a 2 m observer
    delta = dist_m / dem.radius_m
    r0 = dem.radius_m + 2.0
    r1 = dem.radius_m + hill_height_m
    expected_deg = math.degrees(math.atan2(r1 * math.cos(delta) - r0, r1 * math.sin(delta)))
    assert abs(elevs[target_az] - expected_deg) < 0.15


def test_fallback_to_flat_without_dem_or_precomputed(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "DATA_DIR", tmp_path)
    terrain._compute_cached.cache_clear()

    profile = terrain.horizon_profile(-89.5, 0.0)
    assert profile["source"] == "flat"
    assert len(profile["elevation_deg"]) == 360
    assert all(v == 0.0 for v in profile["elevation_deg"])

    r = client.get("/api/horizon", params={"lat_deg": -89.5, "lon_deg": 0.0})
    assert r.status_code == 200
    assert r.json()["source"] == "flat"


def test_outside_polar_coverage_returns_flat():
    profile = terrain.horizon_profile(0.674, 23.473)
    assert profile["source"] == "flat"
    assert len(profile["elevation_deg"]) == 360


def test_uses_precomputed_horizon_when_available(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "DATA_DIR", tmp_path)
    sites = [
        {
            "id": "south-pole-test",
            "name": "South Pole Test",
            "lat_deg": -89.5,
            "lon_deg": 0.0,
            "category": "candidate",
            "landing_utc": None,
        }
    ]
    (tmp_path / "sites.json").write_text(json.dumps(sites), encoding="utf-8")
    (tmp_path / "horizons").mkdir()
    expected = {
        "azimuth_step_deg": 1.0,
        "elevation_deg": [1.25] * 360,
        "source": "lola",
    }
    (tmp_path / "horizons" / "south-pole-test.json").write_text(
        json.dumps(expected), encoding="utf-8"
    )

    profile = terrain.horizon_profile(-89.5, 0.0)
    assert profile == expected


def test_api_horizon_south_pole_returns_lola_with_variation():
    r = client.get("/api/horizon", params={"lat_deg": -89.5, "lon_deg": 0.0})
    assert r.status_code == 200
    body = r.json()
    assert body["source"] == "lola"
    elevs = body["elevation_deg"]
    assert len(elevs) == 360
    assert max(elevs) - min(elevs) > 1.0


def test_site_near_raster_edge_ignores_out_of_bounds_ray_points():
    # Raster +/-310 km around the pole: the IM-1 Odysseus point (-80.13°, 1.44°) lies ~300 km from the pole,
    # so it fits in the raster, but the 160 km radius to the north goes past the edge.
    dem = _make_synthetic_dem(size=1241, scale_m=500.0)
    profile = compute_horizon_profile(dem, lat_deg=-80.13, lon_deg=1.44, max_distance_m=160_000.0)
    assert profile is not None
    assert profile["source"] == "lola"
    assert len(profile["elevation_deg"]) == 360

    # When the observer itself lies outside the raster (e.g. a raster that is too small), the function returns None.
    tiny_dem = _make_synthetic_dem(size=201, scale_m=500.0)
    assert compute_horizon_profile(tiny_dem, lat_deg=-80.13, lon_deg=1.44) is None
