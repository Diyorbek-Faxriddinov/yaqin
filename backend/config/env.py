"""Muhit o'zgaruvchilari: productionda haqiqiy muhitdan, ishlab chiqishda `backend/.env` dan.

Qo'shimcha kutubxonasiz — sintaksis oddiy: `KALIT=qiymat`, `#` bilan izoh. Muhitda allaqachon
bor qiymat `.env` dagidan ustun (server sozlamalari faylni bosib o'tadi).
"""

import os
from pathlib import Path


def load_dotenv(path: Path) -> None:
    if not path.is_file():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip("\"'"))


def env_str(key: str, default: str = "") -> str:
    return os.environ.get(key, default)


def env_bool(key: str, default: bool = False) -> bool:
    value = os.environ.get(key)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def env_list(key: str, default: str = "") -> list[str]:
    return [item.strip() for item in env_str(key, default).split(",") if item.strip()]
