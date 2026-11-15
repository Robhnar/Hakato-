import pytest

from app.ephemeris.geometry import az_el, unit_vector

FAR = 1.0e9  # km - far enough that parallax does not matter


def far_body(lat_deg, lon_deg):
    return tuple(c * FAR for c in unit_vector(lat_deg, lon_deg))


def test_body_overhead_is_at_zenith():
    _, el = az_el(10.0, 20.0, far_body(10.0, 20.0))
    assert el == pytest.approx(90.0, abs=1e-3)


@pytest.mark.parametrize(
    "body_lon, expected_az",
    [(0.0, 270.0), (180.0, 90.0)],  # a body over lon 0 is seen from lon 90E in the west
)
def test_body_on_equator_seen_on_horizon(body_lon, expected_az):
    az, el = az_el(0.0, 90.0, far_body(0.0, body_lon))
    assert el == pytest.approx(0.0, abs=1e-3)
    assert az == pytest.approx(expected_az, abs=1e-3)


def test_body_to_the_north():
    az, el = az_el(0.0, 0.0, far_body(30.0, 0.0))
    assert az == pytest.approx(0.0, abs=1e-3)
    assert el == pytest.approx(60.0, abs=1e-3)


def test_nearby_body_is_lowered_by_parallax():
    near = tuple(c * 384_400.0 for c in unit_vector(0.0, 0.0))
    _, el = az_el(-89.0, 0.0, near)
    assert 0.0 < el < 1.0  # for a body at infinity it would be exactly 1.0
