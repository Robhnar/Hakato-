"""Shared test configuration."""

import pytest

from app.api import routes


@pytest.fixture(autouse=True)
def clear_api_caches():
    """The endpoint cache must not carry results between tests."""

    def clear():
        for name in dir(routes):
            cache_clear = getattr(getattr(routes, name), "cache_clear", None)
            if name.startswith("_cached_") and callable(cache_clear):
                cache_clear()

    clear()
    yield
    clear()
