import os
from collections.abc import Iterator

import pytest
from django.core.cache import cache

from tests import contract


@pytest.fixture(autouse=True)
def _clear_cache() -> Iterator[None]:
    # Cheklov (throttle) hisoblagichlari testlar orasida aralashmasligi uchun
    cache.clear()
    yield
    cache.clear()


def _full_run(session: pytest.Session) -> bool:
    """To'liq to'plam (`pytest`, filtrsiz) — faqat shunda qamrov talab qilinadi."""
    options = session.config.option
    return (
        session.config.args_source != pytest.Config.ArgsSource.ARGS
        and not options.keyword
        and not options.markexpr
        and session.testsfailed == 0
    )


def pytest_sessionfinish(session: pytest.Session, exitstatus: int) -> None:
    """Kontraktdagi har bir operatsiya kamida bitta testda kontraktga qarshi tekshirilsin."""
    if not _full_run(session):
        return
    seen = {(method, path) for method, path, _ in contract.SEEN}
    missing = sorted(set(contract.operations()) - seen)
    reporter = session.config.pluginmanager.get_plugin("terminalreporter")
    if missing:
        if reporter:
            reporter.write_line("Kontraktdagi tekshirilmagan operatsiyalar:", red=True)
            for method, path in missing:
                reporter.write_line(f"  {method} {path}", red=True)
        session.exitstatus = pytest.ExitCode.TESTS_FAILED
    elif reporter:
        total = len(contract.operations())
        reporter.write_line(f"Kontrakt qamrovi: {total}/{total} operatsiya tekshirildi", green=True)
    if reporter and os.environ.get("CONTRACT_REPORT"):
        # Ma'lumot uchun: e'lon qilingan, lekin testlarda uchramagan status kodlari
        for (method, path), codes in sorted(contract.operations().items()):
            unseen = codes - {status for m, p, status in contract.SEEN if (m, p) == (method, path)}
            if unseen:
                reporter.write_line(f"  {method} {path}: {sorted(unseen)}")
