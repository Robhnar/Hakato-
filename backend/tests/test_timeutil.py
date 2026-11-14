"""Testy czasu bez jąder SPICE: granice pokrycia sprawdzane też w CI."""

from datetime import UTC, datetime, timedelta, timezone

import pytest

from app.timeutil import SPICE_MAX_UTC, SPICE_MIN_UTC, check_spice_range


def test_check_spice_range_accepts_both_limits():
    check_spice_range(SPICE_MIN_UTC, SPICE_MAX_UTC)


@pytest.mark.parametrize(
    "t",
    [
        SPICE_MAX_UTC + timedelta(seconds=1),
        datetime(2150, 1, 21, tzinfo=UTC),  # koniec de440s - margines doby
        datetime(2150, 6, 1, tzinfo=UTC),
        datetime(2300, 1, 1, tzinfo=UTC),
        SPICE_MIN_UTC - timedelta(seconds=1),
    ],
)
def test_check_spice_range_rejects_outside(t):
    with pytest.raises(ValueError, match="outside SPICE kernel coverage"):
        check_spice_range(datetime(2027, 1, 1, tzinfo=UTC), t)


def test_check_spice_range_treats_naive_as_utc_and_converts_zones():
    check_spice_range(datetime(2027, 1, 1))  # bez strefy = UTC
    # 2150-01-19 23:00 w UTC-5 to 2150-01-20 04:00 UTC, czyli już po końcu zakresu;
    # bez konwersji do UTC ten czas wyglądałby na mieszczący się w zakresie.
    late = datetime(2150, 1, 19, 23, 0, tzinfo=timezone(timedelta(hours=-5)))
    assert late.replace(tzinfo=UTC) < SPICE_MAX_UTC < late.astimezone(UTC)
    with pytest.raises(ValueError):
        check_spice_range(late)
