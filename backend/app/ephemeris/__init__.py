"""Moduł efemeryd: gdzie na niebie są Słońce i Ziemia. Kontrakt w docs/ARCHITECTURE.md."""

import os
from datetime import datetime

from ..config import DATA_DIR
from ..timeutil import to_utc
from . import placeholder
from .geometry import az_el

try:
    import spiceypy as spice

    _SPICE_AVAILABLE = True
except ImportError:
    spice = None
    _SPICE_AVAILABLE = False

_KERNELS_DIR = DATA_DIR / "raw" / "kernels"
_REQUIRED_KERNELS = [
    "naif0012.tls",
    "pck00010.tpc",
    "de440s.bsp",
    "moon_pa_de440_200625.bpc",
    "moon_de440_250416.tf",
]

_KERNELS_LOADED = False


def _try_load_kernels() -> bool:
    global _KERNELS_LOADED
    if os.environ.get("HAKATO_FORCE_PLACEHOLDER") == "1":
        return False
    if _KERNELS_LOADED:
        return True
    if not _SPICE_AVAILABLE:
        return False

    for k in _REQUIRED_KERNELS:
        kernel_path = _KERNELS_DIR / k
        if not (kernel_path.exists() and kernel_path.stat().st_size > 0):
            return False

    try:
        for k in _REQUIRED_KERNELS:
            spice.furnsh(str(_KERNELS_DIR / k))
        _KERNELS_LOADED = True
        return True
    except Exception:  # noqa: BLE001
        _KERNELS_LOADED = False
        return False


def are_kernels_loaded() -> bool:
    if os.environ.get("HAKATO_FORCE_PLACEHOLDER") == "1":
        return False
    return _try_load_kernels()


def __getattr__(name: str):
    if name == "SOURCE":
        return "spice" if are_kernels_loaded() else "placeholder"
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


def body_positions(lat_deg: float, lon_deg: float, times_utc: list[datetime]) -> dict:
    """Azymut i wysokość Słońca i Ziemi dla każdej chwili z times_utc."""
    out = {
        "sun": {"az_deg": [], "el_deg": []},
        "earth": {"az_deg": [], "el_deg": []},
    }

    if are_kernels_loaded():
        iso_times = [to_utc(t).strftime("%Y-%m-%dT%H:%M:%SZ") for t in times_utc]
        ets = [spice.str2et(iso) for iso in iso_times]
        for et in ets:
            pos_sun, _ = spice.spkpos("SUN", et, "MOON_ME", "LT+S", "MOON")
            pos_earth, _ = spice.spkpos("EARTH", et, "MOON_ME", "LT+S", "MOON")

            az_s, el_s = az_el(lat_deg, lon_deg, pos_sun)
            out["sun"]["az_deg"].append(az_s)
            out["sun"]["el_deg"].append(el_s)

            az_e, el_e = az_el(lat_deg, lon_deg, pos_earth)
            out["earth"]["az_deg"].append(az_e)
            out["earth"]["el_deg"].append(el_e)
    else:
        for t in times_utc:
            t = to_utc(t)
            for body, position in (
                ("sun", placeholder.sun_position_km(t)),
                ("earth", placeholder.earth_position_km(t)),
            ):
                az, el = az_el(lat_deg, lon_deg, position)
                out[body]["az_deg"].append(az)
                out[body]["el_deg"].append(el)

    return out
