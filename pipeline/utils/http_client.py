"""Shared async HTTP client with retry, rate limiting, and rotating user agents."""

import asyncio
import random
from typing import Optional

import httpx
from fake_useragent import UserAgent
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from loguru import logger

ua = UserAgent()
_client: Optional[httpx.AsyncClient] = None


def get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0, connect=10.0),
            follow_redirects=True,
            http2=True,
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
        )
    return _client


def random_headers() -> dict:
    return {
        "User-Agent": ua.random,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "DNT": "1",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
    }


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    retry=retry_if_exception_type((httpx.TimeoutException, httpx.ConnectError)),
)
async def fetch(url: str, method: str = "GET", **kwargs) -> httpx.Response:
    client = get_client()
    headers = {**random_headers(), **kwargs.pop("headers", {})}
    await asyncio.sleep(random.uniform(0.3, 1.5))
    response = await client.request(method, url, headers=headers, **kwargs)
    logger.debug(f"{method} {url} -> {response.status_code}")
    return response


async def fetch_text(url: str) -> Optional[str]:
    try:
        resp = await fetch(url)
        if resp.status_code == 200:
            return resp.text
        logger.warning(f"HTTP {resp.status_code} for {url}")
        return None
    except Exception as e:
        logger.warning(f"Failed to fetch {url}: {e}")
        return None


async def close_client():
    global _client
    if _client and not _client.is_closed:
        await _client.aclose()
        _client = None
