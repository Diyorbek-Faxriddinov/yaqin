from collections.abc import Iterator

import pytest
from django.core.cache import cache


@pytest.fixture(autouse=True)
def _clear_cache() -> Iterator[None]:
    # Cheklov (throttle) hisoblagichlari testlar orasida aralashmasligi uchun
    cache.clear()
    yield
    cache.clear()
