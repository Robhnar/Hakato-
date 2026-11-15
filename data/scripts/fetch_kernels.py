"""Script for downloading the official SPICE kernels from NAIF (NASA JPL).

Downloads the kernels needed to compute Sun and Earth positions in the MOON_ME frame:
- naif0012.tls (LSK - leap seconds)
- de440s.bsp (SPK - ephemerides of planets and the Moon 1849-2150)
- pck00010.tpc (text PCK - planetary constants)
- moon_pa_de440_200625.bpc (binary PCK - high-accuracy Moon orientation)
- moon_de440_250416.tf (FK - Moon reference frames including MOON_ME)
"""

import urllib.request
from pathlib import Path

BASE_URL = "https://naif.jpl.nasa.gov/pub/naif/generic_kernels"

KERNELS = [
    ("lsk/naif0012.tls", "naif0012.tls"),
    ("spk/planets/de440s.bsp", "de440s.bsp"),
    ("pck/pck00010.tpc", "pck00010.tpc"),
    ("pck/moon_pa_de440_200625.bpc", "moon_pa_de440_200625.bpc"),
    ("fk/satellites/moon_de440_250416.tf", "moon_de440_250416.tf"),
]


def download_kernels(target_dir: Path | None = None) -> None:
    if target_dir is None:
        target_dir = Path(__file__).resolve().parents[1] / "raw" / "kernels"
    target_dir.mkdir(parents=True, exist_ok=True)

    print(f"Downloading SPICE kernels to: {target_dir}")
    for remote_path, filename in KERNELS:
        dest = target_dir / filename
        if dest.exists() and dest.stat().st_size > 0:
            print(
                f"  [OK] {filename} (istnieje, {dest.stat().st_size / 1024 / 1024:.2f} MB)"
            )
            continue

        url = f"{BASE_URL}/{remote_path}"
        print(f"  Pobieranie {filename} z {url} ...")
        req = urllib.request.Request(
            url, headers={"User-Agent": "NASA-SpaceApps-Hakato/1.0"}
        )
        with urllib.request.urlopen(req) as resp, open(dest, "wb") as out:
            data = resp.read()
            out.write(data)
        print(f"  [ZAPISANO] {filename} ({dest.stat().st_size / 1024 / 1024:.2f} MB)")

    print("All kernels are ready.")


if __name__ == "__main__":
    download_kernels()
