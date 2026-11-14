"""Obsługa biegunowych modeli wysokości (DEM) LOLA w formacie PDS3 (.img + .lbl)."""

from __future__ import annotations

import math
import re
from dataclasses import dataclass
from pathlib import Path

import numpy as np

DEFAULT_MOON_RADIUS_M = 1_737_400.0
DEFAULT_MAX_DISTANCE_M = 160_000.0
DEFAULT_OBSERVER_HEIGHT_M = 2.0
SOUTH_POLE_LIMIT_DEG = -80.0

_KV_RE = re.compile(r"^\s*([A-Z0-9_^]+)\s*=\s*(.+?)\s*$")
_NUM_RE = re.compile(r"^[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?")


@dataclass(frozen=True)
class PolarDem:
    """Biegunowy model wysokości LOLA w odwzorowaniu stereograficznym."""

    data: np.ndarray
    lines: int
    line_samples: int
    map_scale_m: float
    line_offset: float
    sample_offset: float
    scaling_factor: float
    radius_m: float = DEFAULT_MOON_RADIUS_M
    center_lat_deg: float = -90.0
    center_lon_deg: float = 0.0
    max_lat_deg: float = -75.0


def parse_pds_label(lbl_path: Path) -> dict[str, str]:
    """Parsuje podstawowe pary klucz = wartość z etykiety PDS3."""
    values: dict[str, str] = {}
    for line in lbl_path.read_text(encoding="ascii", errors="replace").splitlines():
        m = _KV_RE.match(line)
        if m:
            key, raw = m.group(1), m.group(2).strip()
            values[key] = raw.strip('"')
    return values


def _parse_float(raw: str) -> float:
    m = _NUM_RE.match(raw.strip())
    if not m:
        raise ValueError(f"Nieprawidłowa wartość liczbowa w etykiecie PDS: {raw!r}")
    return float(m.group(0))


def load_polar_dem(img_path: Path, lbl_path: Path | None = None) -> PolarDem:
    """Wczytuje raster PDS3 (.img + .lbl) przez memmap bez ładowania całości do RAM."""
    if lbl_path is None:
        lbl_path = img_path.with_suffix(".lbl")
    meta = parse_pds_label(lbl_path)

    lines = int(_parse_float(meta["LINES"]))
    line_samples = int(_parse_float(meta["LINE_SAMPLES"]))
    map_scale_m = _parse_float(meta["MAP_SCALE"])
    line_offset = _parse_float(meta["LINE_PROJECTION_OFFSET"])
    sample_offset = _parse_float(meta["SAMPLE_PROJECTION_OFFSET"])
    scaling_factor = _parse_float(meta.get("SCALING_FACTOR", "0.5"))
    radius_km = _parse_float(meta.get("A_AXIS_RADIUS", "1737.4"))
    center_lat_deg = _parse_float(meta.get("CENTER_LATITUDE", "-90"))
    center_lon_deg = _parse_float(meta.get("CENTER_LONGITUDE", "0"))
    max_lat_deg = _parse_float(meta.get("MAXIMUM_LATITUDE", "-75"))

    sample_type = meta.get("SAMPLE_TYPE", "LSB_INTEGER").upper()
    dtype = "<i2" if "LSB" in sample_type else ">i2"

    data = np.memmap(img_path, dtype=dtype, mode="r", shape=(lines, line_samples))
    return PolarDem(
        data=data,
        lines=lines,
        line_samples=line_samples,
        map_scale_m=map_scale_m,
        line_offset=line_offset,
        sample_offset=sample_offset,
        scaling_factor=scaling_factor,
        radius_m=radius_km * 1000.0,
        center_lat_deg=center_lat_deg,
        center_lon_deg=center_lon_deg,
        max_lat_deg=max_lat_deg,
    )


def latlon_to_pixel(
    lat_rad: np.ndarray, lon_rad: np.ndarray, dem: PolarDem
) -> tuple[np.ndarray, np.ndarray]:
    """Przelicza współrzędne selenograficzne (rad) na (sample, line) w rastrze biegunowym."""
    # Dla bieguna południowego (CENTER_LATITUDE = -90°, POSITIVE_LONGITUDE_DIRECTION = EAST):
    # patrząc na biegun południowy z góry, 0° leży na górze (+Y), a 90° E po prawej (+X).
    rho = 2.0 * dem.radius_m * np.tan((math.pi / 2.0 + lat_rad) / 2.0)
    dlon = lon_rad - math.radians(dem.center_lon_deg)
    x = rho * np.sin(dlon)
    y = rho * np.cos(dlon)
    sample = dem.sample_offset + x / dem.map_scale_m
    line = dem.line_offset - y / dem.map_scale_m
    return sample, line


def sample_heights(dem: PolarDem, sample: np.ndarray, line: np.ndarray) -> np.ndarray | None:
    """Interpoluje dwuliniowo wysokość terenu (w metrach) dla tablic (sample, line).

    Punkty leżące poza rastrem otrzymują wartość `np.nan`. Zwraca `None`, gdy wszystkie
    przekazane punkty leżą poza rastrem.
    """
    in_bounds = (
        (sample >= 0.0) & (sample <= dem.line_samples - 1) & (line >= 0.0) & (line <= dem.lines - 1)
    )
    if not np.any(in_bounds):
        return None

    sample_c = np.clip(sample, 0.0, dem.line_samples - 1)
    line_c = np.clip(line, 0.0, dem.lines - 1)

    x0 = np.floor(sample_c).astype(np.int64)
    y0 = np.floor(line_c).astype(np.int64)
    x1 = np.minimum(x0 + 1, dem.line_samples - 1)
    y1 = np.minimum(y0 + 1, dem.lines - 1)

    wx = sample_c - x0
    wy = line_c - y0

    z00 = dem.data[y0, x0].astype(np.float64)
    z10 = dem.data[y0, x1].astype(np.float64)
    z01 = dem.data[y1, x0].astype(np.float64)
    z11 = dem.data[y1, x1].astype(np.float64)

    dn = (
        z00 * (1.0 - wx) * (1.0 - wy)
        + z10 * wx * (1.0 - wy)
        + z01 * (1.0 - wx) * wy
        + z11 * wx * wy
    )
    return np.where(in_bounds, dn * dem.scaling_factor, np.nan)


def compute_horizon_profile(
    dem: PolarDem,
    lat_deg: float,
    lon_deg: float,
    max_distance_m: float = DEFAULT_MAX_DISTANCE_M,
    observer_height_m: float = DEFAULT_OBSERVER_HEIGHT_M,
) -> dict | None:
    """Liczy 360-elementowy profil horyzontu (azymuty 0..359°) z modelu wysokości."""
    if lat_deg > SOUTH_POLE_LIMIT_DEG or lat_deg < -90.0:
        return None

    lat0 = math.radians(lat_deg)
    lon0 = math.radians(lon_deg)

    s0, l0 = latlon_to_pixel(np.array([lat0]), np.array([lon0]), dem)
    h0_arr = sample_heights(dem, s0, l0)
    if h0_arr is None or np.isnan(h0_arr[0]):
        return None
    h0 = float(h0_arr[0])
    r0 = dem.radius_m + h0 + observer_height_m

    step_m = dem.map_scale_m
    distances = np.arange(step_m, max_distance_m + step_m * 0.5, step_m, dtype=np.float64)
    delta = distances[None, :] / dem.radius_m  # (1, S)
    az = np.radians(np.arange(360, dtype=np.float64))[:, None]  # (360, 1)

    sin_lat0 = math.sin(lat0)
    cos_lat0 = math.cos(lat0)

    if cos_lat0 < 1e-12:
        # Na samym biegunie południowym wszystkie kierunki idą na północ wzdłuż południka az.
        lat_pts = np.broadcast_to(-math.pi / 2.0 + delta, (360, distances.size))
        lon_pts = np.broadcast_to(az, (360, distances.size))
    else:
        sin_delta = np.sin(delta)
        cos_delta = np.cos(delta)
        sin_lat = sin_lat0 * cos_delta + cos_lat0 * sin_delta * np.cos(az)
        sin_lat = np.clip(sin_lat, -1.0, 1.0)
        lat_pts = np.arcsin(sin_lat)
        y = np.sin(az) * sin_delta * cos_lat0
        x = cos_delta - sin_lat0 * sin_lat
        lon_pts = lon0 + np.arctan2(y, x)

    samples, lines = latlon_to_pixel(lat_pts, lon_pts, dem)
    h1 = sample_heights(dem, samples, lines)
    if h1 is None:
        return None

    r1 = dem.radius_m + h1
    elev_rad = np.arctan2(r1 * np.cos(delta) - r0, r1 * np.sin(delta))
    elev_rad = np.where(np.isnan(elev_rad), -np.inf, elev_rad)
    max_elev_rad = elev_rad.max(axis=1)
    max_elev_rad = np.where(np.isinf(max_elev_rad), 0.0, max_elev_rad)
    max_elev_deg = np.degrees(max_elev_rad)

    return {
        "azimuth_step_deg": 1.0,
        "elevation_deg": [round(float(v), 3) for v in max_elev_deg],
        "source": "lola",
    }
