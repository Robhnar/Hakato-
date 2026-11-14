"""Generuje contracts/fixtures/*.json - przykładowe odpowiedzi API dla frontendu.

Uruchom z katalogu backend/ po każdej zmianie kontraktu:  python -m scripts.export_fixtures

Scenariusz: punkt odniesienia przy biegunie południowym, 30 dni od 2027-01-01, krok 1 h.
Horyzont jest SZTUCZNY (source = "synthetic"), żeby widoki miały na czym pracować,
zanim powstanie prawdziwy profil z danych LOLA.
"""

import json
import math
from datetime import UTC, datetime

from app import metrics
from app.config import DATA_DIR, FIXTURES_DIR

LAT_DEG, LON_DEG = -89.5, 0.0
START = datetime(2027, 1, 1, tzinfo=UTC)
END = datetime(2027, 1, 31, tzinfo=UTC)
STEP_MINUTES = 60


def synthetic_horizon() -> dict:
    elevation = [
        round(
            0.6 + 0.9 * math.sin(math.radians(3 * az)) + 0.5 * math.sin(math.radians(7 * az) + 1.0),
            3,
        )
        for az in range(360)
    ]
    return {"azimuth_step_deg": 1.0, "elevation_deg": elevation, "source": "synthetic"}


def build() -> dict[str, object]:
    horizon = synthetic_horizon()
    return {
        "sites.json": json.loads((DATA_DIR / "sites.json").read_text(encoding="utf-8")),
        "horizon.json": horizon,
        "timeline.json": metrics.timeline(LAT_DEG, LON_DEG, START, END, STEP_MINUTES, horizon),
        "summary.json": metrics.summary(LAT_DEG, LON_DEG, START, END, horizon=horizon),
    }


def dumps(payload: object) -> str:
    return json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n"


if __name__ == "__main__":
    FIXTURES_DIR.mkdir(parents=True, exist_ok=True)
    for name, payload in build().items():
        (FIXTURES_DIR / name).write_text(dumps(payload), encoding="utf-8")
        print("zapisano", name)
