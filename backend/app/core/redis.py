from typing import Optional

import redis.asyncio as redis
from app.core.config import settings

_redis_client: Optional[redis.Redis] = None


async def init_redis() -> None:
    global _redis_client
    _redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    await _redis_client.ping()


async def close_redis() -> None:
    if _redis_client:
        await _redis_client.aclose()


def get_redis() -> redis.Redis:
    if _redis_client is None:
        raise RuntimeError("Redis not initialised")
    return _redis_client
