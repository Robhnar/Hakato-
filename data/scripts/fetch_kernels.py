"""Skrypt do pobierania oficjalnych jąder SPICE z NAIF (NASA JPL).

Pobiera jądra potrzebne do obliczeń położeń Słońca i Ziemi w układzie MOON_ME:
- naif0012.tls (LSK - leap seconds)
- de440s.bsp (SPK - efemerydy planet i Księżyca 1849-2150)
- pck00010.tpc (PCK tekstowy - stałe planetarne)
- moon_pa_de440_200625.bpc (PCK binarny - wysoka dokładność orientacji Księżyca)
- moon_de440_250416.tf (FK - ramki odniesienia Księżyca w tym MOON_ME)
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

    print(f"Pobieranie jąder SPICE do: {target_dir}")
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

    print("Wszystkie jądra są gotowe.")


if __name__ == "__main__":
    download_kernels()
