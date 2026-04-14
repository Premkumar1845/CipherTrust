import logging
from typing import Optional

import redis.asyncio as redis
from app.core.config import settings

log = logging.getLogger(__name__)

_redis_client: Optional[redis.Redis] = None


async def init_redis() -> None:
    global _redis_client
    try:
        _redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        await _redis_client.ping()
        log.info("Redis connected at %s", settings.REDIS_URL.split("@")[-1] if "@" in settings.REDIS_URL else settings.REDIS_URL)
    except Exception as exc:
        log.warning("Redis unavailable (%s) — caching disabled", exc)
        _redis_client = None


async def close_redis() -> None:
    if _redis_client:
        await _redis_client.aclose()


def get_redis() -> Optional[redis.Redis]:
    return _redis_client
