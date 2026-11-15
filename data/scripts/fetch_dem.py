"""Downloads the LOLA polar elevation model (DEM) from the PDS Geosciences Node to data/raw/dem/.

Default product: ldem_75s_120m (120 m/pix, area -90°..-75° S, ~111 MiB),
which covers the whole +/-150 km neighborhood of every point below -80° latitude.
"""

from __future__ import annotations

import argparse
import os
import sys
import urllib.request
from pathlib import Path

BASE_URL = (
    "https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img"
)
DEFAULT_PRODUCT = "ldem_75s_120m"

REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = Path(os.environ.get("HAKATO_DATA_DIR", REPO_ROOT / "data"))
DEM_DIR = DATA_DIR / "raw" / "dem"


def _download(url: str, dest: Path, force: bool = False) -> None:
    req = urllib.request.Request(url, headers={"User-Agent": "hakato-fetch-dem/1.0"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        total = int(resp.headers.get("Content-Length") or 0)
        if dest.exists() and not force and total and dest.stat().st_size == total:
            print(f"[skip] {dest.name} already exists ({total} B)")
            return

        dest.parent.mkdir(parents=True, exist_ok=True)
        tmp = dest.with_suffix(dest.suffix + ".part")
        downloaded = 0
        chunk_size = 1024 * 1024
        with tmp.open("wb") as f:
            while True:
                chunk = resp.read(chunk_size)
                if not chunk:
                    break
                f.write(chunk)
                downloaded += len(chunk)
                if total:
                    pct = 100.0 * downloaded / total
                    print(
                        f"\r[download] {dest.name}: {downloaded / 1_048_576:.1f} / "
                        f"{total / 1_048_576:.1f} MiB ({pct:.0f}%)",
                        end="",
                        flush=True,
                    )
        print()
        tmp.replace(dest)


def fetch_dem(
    product: str = DEFAULT_PRODUCT, dest_dir: Path = DEM_DIR, force: bool = False
) -> Path:
    """Downloads the .lbl and .img files of the chosen LOLA product."""
    for ext in (".lbl", ".img"):
        filename = f"{product}{ext}"
        url = f"{BASE_URL}/{filename}"
        _download(url, dest_dir / filename, force=force)
    return dest_dir / f"{product}.img"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Downloads the LOLA elevation model from PDS.")
    parser.add_argument(
        "--product",
        default=DEFAULT_PRODUCT,
        help=f"Product name in polar/img/ without extension (default: {DEFAULT_PRODUCT})",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Download again even if the file already exists.",
    )
    args = parser.parse_args(argv)
    path = fetch_dem(product=args.product, force=args.force)
    print(f"Gotowe: {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
