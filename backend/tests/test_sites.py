import json

from pydantic import TypeAdapter

from app.api.schemas import Site
from app.config import DATA_DIR

CATEGORIES = {"apollo", "clps", "commercial", "international", "candidate"}


def test_site_catalogue_has_valid_unique_entries_and_sources():
    sites = TypeAdapter(list[Site]).validate_python(
        json.loads((DATA_DIR / "sites.json").read_text(encoding="utf-8"))
    )
    ids = [site.id for site in sites]

    assert len(sites) >= 15
    assert len(ids) == len(set(ids))
    assert {site.category for site in sites} == CATEGORIES
    assert all(-90 <= site.lat_deg <= 90 for site in sites)
    assert all(-180 <= site.lon_deg <= 180 for site in sites)

    sources = (DATA_DIR / "sites.sources.md").read_text(encoding="utf-8")
    assert all(f"### {site_id}" in sources for site_id in ids)
