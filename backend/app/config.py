"""Paths shared across the whole backend."""

import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = Path(os.environ.get("HAKATO_DATA_DIR", REPO_ROOT / "data"))
FIXTURES_DIR = REPO_ROOT / "contracts" / "fixtures"
