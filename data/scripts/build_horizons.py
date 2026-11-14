"""Liczy z wyprzedzeniem profile horyzontu dla miejsc z data/sites.json i zapisuje w data/horizons/."""

from __future__ import annotations

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "backend"))

from app import config
from app.terrain import _find_dem_path
from app.terrain.lola import compute_horizon_profile, load_polar_dem


def build_horizons(data_dir: Path | None = None) -> list[Path]:
    """Generuje pliki data/horizons/<id>.json dla miejsc objętych modelem DEM."""
    base = data_dir or config.DATA_DIR
    dem_path = _find_dem_path(base / "raw" / "dem")
    if dem_path is None:
        raise FileNotFoundError(
            f"Brak modelu DEM w {base / 'raw' / 'dem'}. Uruchom najpierw data/scripts/fetch_dem.py."
        )

    dem = load_polar_dem(dem_path)
    sites = json.loads((base / "sites.json").read_text(encoding="utf-8"))
    out_dir = base / "horizons"
    out_dir.mkdir(parents=True, exist_ok=True)

    written: list[Path] = []
    for site in sites:
        profile = compute_horizon_profile(dem, float(site["lat_deg"]), float(site["lon_deg"]))
        if profile is None:
            print(f"[skip] {site['id']} ({site['lat_deg']}°, {site['lon_deg']}°) poza obszarem DEM")
            continue

        dest = out_dir / f"{site['id']}.json"
        dest.write_text(
            json.dumps(profile, ensure_ascii=False, separators=(",", ":")) + "\n",
            encoding="utf-8",
        )
        print(
            f"[ok]   {site['id']} -> {dest.relative_to(base)} "
            f"(min={min(profile['elevation_deg']):.2f}°, max={max(profile['elevation_deg']):.2f}°)"
        )
        written.append(dest)
    return written


if __name__ == "__main__":
    build_horizons()
