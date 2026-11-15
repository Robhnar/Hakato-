"""TEMPORARY model of Sun and Earth positions - to be replaced by SPICE (task 001).

Simplified sinusoids: they give a qualitatively right picture (synodic month, Sun
just at the horizon at the poles, Earth librations), but the error reaches several degrees,
and the libration phases are arbitrary. NOT suitable for assessing real visibility windows.
"""

import math
from datetime import UTC, datetime

from .geometry import Vec, unit_vector

AU_KM = 149_597_870.7
EARTH_MOON_KM = 384_400.0

_J2000 = datetime(2000, 1, 1, 12, 0, 0, tzinfo=UTC)
_NEW_MOON_DAYS = 5.2597  # new moon 2000-01-06 18:14 UTC, in days since J2000
_SYNODIC_MONTH = 29.530588
_DRACONIC_YEAR = 346.62
_ANOMALISTIC_MONTH = 27.554550
_DRACONIC_MONTH = 27.212221


def _days(t: datetime) -> float:
    return (t - _J2000).total_seconds() / 86400.0


def _scaled(lat_deg: float, lon_deg: float, dist_km: float) -> Vec:
    x, y, z = unit_vector(lat_deg, lon_deg)
    return (x * dist_km, y * dist_km, z * dist_km)


def sun_position_km(t: datetime) -> Vec:
    d = _days(t)
    # At new moon the Sun is over the far side (lon 180); the subsolar point moves west.
    lon = (180.0 - 360.0 * (d - _NEW_MOON_DAYS) / _SYNODIC_MONTH + 180.0) % 360.0 - 180.0
    lat = 1.54 * math.sin(2 * math.pi * d / _DRACONIC_YEAR)
    return _scaled(lat, lon, AU_KM)


def earth_position_km(t: datetime) -> Vec:
    d = _days(t)
    lon = 6.3 * math.sin(2 * math.pi * d / _ANOMALISTIC_MONTH)
    lat = 6.7 * math.sin(2 * math.pi * d / _DRACONIC_MONTH)
    return _scaled(lat, lon, EARTH_MOON_KM)
