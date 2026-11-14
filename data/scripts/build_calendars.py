"""Prekalkuluje wieloletnie kalendarze dni księżycowych (2027–2035) dla miejsc z data/sites.json.

Uruchom z katalogu głównego repozytorium:
    PYTHONPATH=backend python -m data.scripts.build_calendars
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = REPO_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.config import DATA_DIR  # noqa: E402
from app.metrics.calendar_store import CALENDARS_DIR, build_site_calendar  # noqa: E402


def build_all(start_year: int = 2027, end_year: int = 2035) -> int:
    sites_path = DATA_DIR / "sites.json"
    sites = json.loads(sites_path.read_text(encoding="utf-8"))
    CALENDARS_DIR.mkdir(parents=True, exist_ok=True)

    written = 0
    for site in sites:
        site_id = site["id"]
        lat_deg = float(site["lat_deg"])
        lon_deg = float(site["lon_deg"])
        if lat_deg > -80.0:
            continue

        slots = build_site_calendar(
            lat_deg=lat_deg,
            lon_deg=lon_deg,
            start_year=start_year,
            end_year=end_year,
        )
        out_path = CALENDARS_DIR / f"{site_id}.json"
        out_path.write_text(
            json.dumps(slots, ensure_ascii=False, separators=(",", ":")) + "\n",
            encoding="utf-8",
        )
        sun_hours = [s["sunlight_hours"] for s in slots]
        print(
            f"[ok]   {site_id} -> calendars/{site_id}.json "
            f"({len(slots)} lunar days, sunlight {min(sun_hours):.1f}..{max(sun_hours):.1f} h)"
        )
        written += 1

    return written


def main() -> int:
    count = build_all()
    return 0 if count > 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
