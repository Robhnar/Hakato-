"""Czas w kontraktach: zawsze UTC, ISO 8601 z sufiksem Z."""

from datetime import UTC, datetime, timedelta


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
