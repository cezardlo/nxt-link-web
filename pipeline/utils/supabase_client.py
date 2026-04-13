"""Supabase client using direct REST API (no SDK — Python 3.14 compatible)."""

import json
import httpx
from loguru import logger
from pipeline.config import SUPABASE_URL, SUPABASE_SERVICE_KEY

_client: httpx.Client | None = None


def _get_client() -> httpx.Client:
    global _client
    if _client is None or _client.is_closed:
        if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
            raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
        _client = httpx.Client(
            base_url=f"{SUPABASE_URL}/rest/v1",
            headers={
                "apikey": SUPABASE_SERVICE_KEY,
                "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "return=representation,resolution=merge-duplicates",
            },
            timeout=30.0,
        )
    return _client


def upsert_exhibitors(records: list[dict]) -> int:
    if not records:
        return 0
    client = _get_client()
    total = 0
    for i in range(0, len(records), 100):
        chunk = records[i:i + 100]
        resp = client.post("/exhibitors", content=json.dumps(chunk))
        if resp.status_code in (200, 201):
            data = resp.json()
            total += len(data) if isinstance(data, list) else 1
        else:
            logger.warning(f"Upsert exhibitors failed: {resp.status_code} {resp.text[:200]}")
    logger.info(f"Upserted {total} exhibitors to Supabase")
    return total


def upsert_vendors(records: list[dict]) -> int:
    if not records:
        return 0
    client = _get_client()
    total = 0
    for i in range(0, len(records), 50):
        chunk = records[i:i + 50]
        resp = client.post("/enriched_vendors", content=json.dumps(chunk))
        if resp.status_code in (200, 201):
            data = resp.json()
            total += len(data) if isinstance(data, list) else 1
        else:
            logger.warning(f"Upsert vendors failed: {resp.status_code} {resp.text[:200]}")
    logger.info(f"Upserted {total} enriched vendors to Supabase")
    return total


def record_scrape_run(report: dict) -> None:
    try:
        client = _get_client()
        resp = client.post("/conference_scrape_runs", content=json.dumps(report))
        if resp.status_code not in (200, 201):
            logger.warning(f"Record run failed: {resp.status_code}")
    except Exception as e:
        logger.warning(f"Failed to record scrape run: {e}")


def query_table(table: str, select: str = "*", limit: int = 50) -> list[dict]:
    """Simple SELECT query."""
    client = _get_client()
    resp = client.get(f"/{table}", params={"select": select, "limit": str(limit)})
    if resp.status_code == 200:
        return resp.json()
    logger.warning(f"Query {table} failed: {resp.status_code}")
    return []
