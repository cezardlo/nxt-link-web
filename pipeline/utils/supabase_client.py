"""Supabase client for Python pipeline."""

from loguru import logger

_client = None


def get_supabase():
    global _client
    if _client is not None:
        return _client
    from supabase import create_client
    from pipeline.config import SUPABASE_URL, SUPABASE_SERVICE_KEY
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
    _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    logger.info(f"Supabase connected: {SUPABASE_URL[:40]}...")
    return _client


def upsert_exhibitors(records: list[dict]) -> int:
    if not records:
        return 0
    db = get_supabase()
    total = 0
    for i in range(0, len(records), 100):
        chunk = records[i:i + 100]
        result = db.table("exhibitors").upsert(chunk, on_conflict="id").execute()
        total += len(result.data) if result.data else 0
    logger.info(f"Upserted {total} exhibitors to Supabase")
    return total


def upsert_vendors(records: list[dict]) -> int:
    if not records:
        return 0
    db = get_supabase()
    total = 0
    for i in range(0, len(records), 50):
        chunk = records[i:i + 50]
        result = db.table("enriched_vendors").upsert(chunk, on_conflict="id").execute()
        total += len(result.data) if result.data else 0
    logger.info(f"Upserted {total} enriched vendors to Supabase")
    return total


def record_scrape_run(report: dict) -> None:
    try:
        db = get_supabase()
        db.table("conference_scrape_runs").insert(report).execute()
    except Exception as e:
        logger.warning(f"Failed to record scrape run: {e}")
