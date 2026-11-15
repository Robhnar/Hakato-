"""Geometry: vector to a body in the Moon frame -> azimuth and elevation above the horizon.

Frame: selenographic Mean Earth / Polar Axis, origin at the center of the Moon,
X axis through (lat 0, lon 0), Z axis through the north pole. Units: km and degrees.
This file does not depend on the ephemeris source - both the placeholder and SPICE use it.
"""

import math

MOON_RADIUS_KM = 1737.4

Vec = tuple[float, float, float]


def unit_vector(lat_deg: float, lon_deg: float) -> Vec:
    lat, lon = math.radians(lat_deg), math.radians(lon_deg)
    return (math.cos(lat) * math.cos(lon), math.cos(lat) * math.sin(lon), math.sin(lat))


def _dot(a: Vec, b: Vec) -> float:
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]


def az_el(
    lat_deg: float, lon_deg: float, body_pos_km: Vec, site_height_km: float = 0.0
) -> tuple[float, float]:
    """Azimuth (0 = north, 90 = east) and elevation of a body seen from a point on the surface.

    body_pos_km: position of the body relative to the center of the Moon in the ME frame.
    Elevation is measured against the local horizontal plane of a sphere of radius MOON_RADIUS_KM.
    """
    lat, lon = math.radians(lat_deg), math.radians(lon_deg)
    up = unit_vector(lat_deg, lon_deg)
    east = (-math.sin(lon), math.cos(lon), 0.0)
    north = (-math.sin(lat) * math.cos(lon), -math.sin(lat) * math.sin(lon), math.cos(lat))

    r = MOON_RADIUS_KM + site_height_km
    to_body = (
        body_pos_km[0] - r * up[0],
        body_pos_km[1] - r * up[1],
        body_pos_km[2] - r * up[2],
    )
    dist = math.sqrt(_dot(to_body, to_body))
    el = math.degrees(math.asin(max(-1.0, min(1.0, _dot(to_body, up) / dist))))
    az = math.degrees(math.atan2(_dot(to_body, east), _dot(to_body, north))) % 360.0
    return az, el
