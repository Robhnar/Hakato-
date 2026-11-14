"""Moduł terenu: profil horyzontu wokół miejsca lądowania. Kontrakt w docs/ARCHITECTURE.md."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from .. import config
from .lola import PolarDem, compute_horizon_profile, load_polar_dem

AZIMUTH_STEP_DEG = 1.0
SAMPLES = 360
PREFERRED_DEMS = ("ldem_75s_120m.img", "ldem_80s_80m.img", "ldem_75s_240m.img")


def flat_profile() -> dict:
    """Zwraca awaryjny, płaski profil horyzontu."""
    return {
        "azimuth_step_deg": AZIMUTH_STEP_DEG,
        "elevation_deg": [0.0] * SAMPLES,
        "source": "flat",
    }


def _find_dem_path(dem_dir: Path) -> Path | None:
    if not dem_dir.is_dir():
        return None
    for name in PREFERRED_DEMS:
        candidate = dem_dir / name
        if candidate.is_file() and candidate.with_suffix(".lbl").is_file():
            return candidate
    for candidate in sorted(dem_dir.glob("*.img")):
        if candidate.with_suffix(".lbl").is_file():
            return candidate
    return None


@lru_cache(maxsize=4)
def _cached_dem(img_path: Path) -> PolarDem:
    return load_polar_dem(img_path)


def _find_precomputed_horizon(data_dir: Path, lat_deg: float, lon_deg: float) -> dict | None:
    sites_file = data_dir / "sites.json"
    horizons_dir = data_dir / "horizons"
    if not sites_file.is_file() or not horizons_dir.is_dir():
        return None
    try:
        sites = json.loads(sites_file.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None

    for site in sites:
        if (
            abs(float(site.get("lat_deg", 999)) - lat_deg) < 1e-6
            and abs(float(site.get("lon_deg", 999)) - lon_deg) < 1e-6
        ):
            horizon_file = horizons_dir / f"{site['id']}.json"
            if horizon_file.is_file():
                try:
                    data = json.loads(horizon_file.read_text(encoding="utf-8"))
                    if (
                        isinstance(data, dict)
                        and len(data.get("elevation_deg", [])) == SAMPLES
                        and "source" in data
                    ):
                        return data
                except (OSError, json.JSONDecodeError):
                    return None
    return None


@lru_cache(maxsize=64)
def _compute_cached(data_dir_str: str, lat_key: float, lon_key: float) -> dict | None:
    dem_path = _find_dem_path(Path(data_dir_str) / "raw" / "dem")
    if dem_path is None:
        return None
    try:
        dem = _cached_dem(dem_path)
        return compute_horizon_profile(dem, lat_key, lon_key)
    except (OSError, ValueError, KeyError):
        return None


def horizon_profile(lat_deg: float, lon_deg: float) -> dict:
    """Wysokość horyzontu dla azymutów 0, 1, ..., 359 stopni.

    Najpierw szuka gotowego profilu w `data/horizons/<id>.json`.
    Jeśli brak, liczy na żądanie z pobranego modelu LOLA w `data/raw/dem/`.
    Poza obszarem modelu albo bez pobranych danych zwraca płaski horyzont.
    """
    data_dir = config.DATA_DIR
    precomputed = _find_precomputed_horizon(data_dir, lat_deg, lon_deg)
    if precomputed is not None:
        return precomputed

    if lat_deg <= -80.0:
        computed = _compute_cached(str(data_dir), round(lat_deg, 5), round(lon_deg, 5))
        if computed is not None:
            return computed

    return flat_profile()
