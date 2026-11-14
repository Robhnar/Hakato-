"""Geometria: wektor do ciała w układzie Księżyca -> azymut i wysokość nad horyzontem.

Układ: selenograficzny Mean Earth / Polar Axis, początek w środku Księżyca,
oś X przez (szer. 0, dł. 0), oś Z przez biegun północny. Jednostki: km i stopnie.
Ten plik nie zależy od źródła efemeryd - korzysta z niego i wersja tymczasowa, i SPICE.
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
    """Azymut (0 = północ, 90 = wschód) i wysokość ciała widzianego z miejsca na powierzchni.

    body_pos_km: położenie ciała względem środka Księżyca w układzie ME.
    Wysokość liczona względem lokalnej płaszczyzny poziomej kuli o promieniu MOON_RADIUS_KM.
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
