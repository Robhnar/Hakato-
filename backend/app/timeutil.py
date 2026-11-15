"""Time in contracts: always UTC, ISO 8601 with the Z suffix."""

from datetime import UTC, datetime, timedelta

# Coverage of the SPICE kernel de440s.bsp (1849-12-25 .. 2150-01-21) with a one-day margin.
SPICE_MIN_UTC = datetime(1849, 12, 26, tzinfo=UTC)
SPICE_MAX_UTC = datetime(2150, 1, 20, tzinfo=UTC)


def check_spice_range(*times: datetime) -> None:
    """Raises ValueError when any of the times lies outside the SPICE de440s coverage."""
    for t in times:
        t_utc = to_utc(t)
        if not (SPICE_MIN_UTC <= t_utc <= SPICE_MAX_UTC):
            raise ValueError(
                f"Time {iso_z(t_utc)} is outside SPICE kernel coverage "
                f"({iso_z(SPICE_MIN_UTC)} .. {iso_z(SPICE_MAX_UTC)})"
            )


def to_utc(t: datetime) -> datetime:
    """A time without a zone is treated as UTC."""
    if t.tzinfo is None:
        return t.replace(tzinfo=UTC)
    return t.astimezone(UTC)


def iso_z(t: datetime) -> str:
    return to_utc(t).strftime("%Y-%m-%dT%H:%M:%SZ")


def time_range(start: datetime, end: datetime, step_minutes: float) -> list[datetime]:
    """Samples from start to end inclusive, every step_minutes."""
    start, end = to_utc(start), to_utc(end)
    step = timedelta(minutes=step_minutes)
    count = int((end - start) / step) + 1
    return [start + i * step for i in range(count)]
