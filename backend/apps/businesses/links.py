"""Mahsulot havolasi: faqat ruxsat etilgan platformalar, faqat https.

Frontenddagi `src/lib/item-link.ts` bilan bir xil saqlang. Roʻyxat — firibgarlikka qarshi:
ixtiyoriy sayt (soxta toʻlov sahifasi) oʻrniga faqat taniqli platformalardagi video va postlar.
"""

from urllib.parse import urlsplit

MAX_LENGTH = 500
HOSTS = {
    "instagram.com": "instagram",
    "www.instagram.com": "instagram",
    "m.instagram.com": "instagram",
    "t.me": "telegram",
    "telegram.me": "telegram",
    "youtube.com": "youtube",
    "www.youtube.com": "youtube",
    "m.youtube.com": "youtube",
    "youtu.be": "youtube",
    "tiktok.com": "tiktok",
    "www.tiktok.com": "tiktok",
    "m.tiktok.com": "tiktok",
    "vm.tiktok.com": "tiktok",
    "vt.tiktok.com": "tiktok",
    "facebook.com": "facebook",
    "www.facebook.com": "facebook",
    "m.facebook.com": "facebook",
    "web.facebook.com": "facebook",
    "fb.watch": "facebook",
}


def platform(url: str) -> str | None:
    """Platforma nomi yoki None (ruxsat etilmagan yoki notoʻgʻri havola)."""
    if not url or len(url) > MAX_LENGTH or any(c.isspace() or ord(c) < 32 for c in url):
        return None
    try:
        parts = urlsplit(url)
        port = parts.port
    except ValueError:
        return None
    if parts.scheme != "https" or parts.username or parts.password or port not in (None, 443):
        return None
    return HOSTS.get((parts.hostname or "").lower())
