import asyncio
import time
from collections import defaultdict, deque


class DomainRateLimiter:
    """Token-bucket style limiter per domain."""

    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._history = defaultdict(deque)

    async def wait_for_slot(self, domain: str, max_per_minute: int) -> None:
        async with self._lock:
            now = time.time()
            window_start = now - 60.0
            hits = self._history[domain]
            while hits and hits[0] < window_start:
                hits.popleft()
            if len(hits) >= max_per_minute:
                wait_seconds = 60.0 - (now - hits[0])
                await asyncio.sleep(max(0.0, wait_seconds))
            hits.append(time.time())

