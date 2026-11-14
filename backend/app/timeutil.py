"""Czas w kontraktach: zawsze UTC, ISO 8601 z sufiksem Z."""

from datetime import UTC, datetime, timedelta

# Pokrycie jądra SPICE de440s.bsp (1849-12-25 .. 2150-01-21) z marginesem jednej doby.
SPICE_MIN_UTC = datetime(1849, 12, 26, tzinfo=UTC)
SPICE_MAX_UTC = datetime(2150, 1, 20, tzinfo=UTC)


def check_spice_range(*times: datetime) -> None:
    """Rzuca ValueError, gdy którykolwiek z czasów leży poza pokryciem SPICE de440s."""
    for t in times:
        t_utc = to_utc(t)
        if not (SPICE_MIN_UTC <= t_utc <= SPICE_MAX_UTC):
            raise ValueError(
                f"Time {iso_z(t_utc)} is outside SPICE kernel coverage "
                f"({iso_z(SPICE_MIN_UTC)} .. {iso_z(SPICE_MAX_UTC)})"
            )


def to_utc(t: datetime) -> datetime:
    """Czas bez strefy traktujemy jako UTC."""
    if t.tzinfo is None:
        return t.replace(tzinfo=UTC)
    return t.astimezone(UTC)


def iso_z(t: datetime) -> str:
    return to_utc(t).strftime("%Y-%m-%dT%H:%M:%SZ")


def time_range(start: datetime, end: datetime, step_minutes: float) -> list[datetime]:
    """Próbki od start do end włącznie, co step_minutes."""
    start, end = to_utc(start), to_utc(end)
    step = timedelta(minutes=step_minutes)
    count = int((end - start) / step) + 1
    return [start + i * step for i in range(count)]
