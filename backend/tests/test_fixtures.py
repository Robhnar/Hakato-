"""Ensures the files in contracts/fixtures/ match the contract and the code."""

import json

import pytest
from pydantic import TypeAdapter

from app.api import schemas
from app.config import FIXTURES_DIR
from scripts.export_fixtures import build, dumps

MODELS = {
    "sites.json": list[schemas.Site],
    "horizon.json": schemas.Horizon,
    "timeline.json": schemas.Timeline,
    "summary.json": schemas.Summary,
    "windows.json": schemas.WindowsResponse,
    "optimal_site.json": schemas.OptimalSiteResponse,
}


@pytest.mark.parametrize("name", MODELS)
def test_fixture_matches_schema(name):
    payload = json.loads((FIXTURES_DIR / name).read_text(encoding="utf-8"))
    TypeAdapter(MODELS[name]).validate_python(payload)


def test_fixtures_are_up_to_date():
    for name, payload in build().items():
        on_disk = (FIXTURES_DIR / name).read_text(encoding="utf-8")
        assert on_disk == dumps(payload), (
            f"{name} is out of date - run: python -m scripts.export_fixtures"
        )
