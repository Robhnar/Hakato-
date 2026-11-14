"""Moduł efemeryd: gdzie na niebie są Słońce i Ziemia. Kontrakt w docs/ARCHITECTURE.md."""

from datetime import datetime

from ..timeutil import to_utc
from . import placeholder
from .geometry import az_el

# "placeholder" dopóki zadanie 001 nie podłączy SPICE; wtedy "spice".
SOURCE = "placeholder"


def body_positions(lat_deg: float, lon_deg: float, times_utc: list[datetime]) -> dict:
    """Azymut i wysokość Słońca i Ziemi dla każdej chwili z times_utc."""
    out = {
        "sun": {"az_deg": [], "el_deg": []},
        "earth": {"az_deg": [], "el_deg": []},
    }
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
