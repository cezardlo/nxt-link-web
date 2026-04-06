from __future__ import annotations

import asyncio
from datetime import datetime, timezone

from prefect import flow, task
from sqlalchemy.orm import Session

from app.config import settings
from app.crawler.engine import CrawlEngine
from app.crawler.registry import enqueue_due_sources, lease_queue_items
from app.db import SessionLocal
from app.logging import get_logger
from app.ranking.train import train_ranker
from app.trends.engine import compute_trend_metrics

logger = get_logger(__name__)


@task(retries=2, retry_delay_seconds=10)
def source_registry_tick() -> int:
    with SessionLocal() as db:
        queued = enqueue_due_sources(db, now=datetime.now(timezone.utc))
        db.commit()
        return queued


@task(retries=0)
def crawl_sources_batch(worker_id: str, batch_size: int) -> int:
    with SessionLocal() as db:
        jobs = lease_queue_items(db, worker_id, batch_size)
        db.commit()
    if not jobs:
        return 0

    engine = CrawlEngine()
    with SessionLocal() as db:
        asyncio.run(engine.run_batch(db, jobs))
        db.commit()
        return len(jobs)


@task(retries=1, retry_delay_seconds=30)
def train_ranker_nightly() -> dict:
    with SessionLocal() as db:
        result = train_ranker(db)
        db.commit()
        return result


@task(retries=1, retry_delay_seconds=30)
def compute_trends_nightly() -> dict:
    with SessionLocal() as db:
        result = compute_trend_metrics(db)
        db.commit()
        return result


@flow(name="nxtlink-hourly-crawl")
def hourly_crawl_flow() -> dict:
    queued = source_registry_tick.submit()
    processed = crawl_sources_batch.submit(settings.crawl_worker_id, settings.crawl_batch_size)
    return {"queued": queued.result(), "processed": processed.result()}


@flow(name="nxtlink-nightly-ml")
def nightly_ml_flow() -> dict:
    ranker = train_ranker_nightly.submit()
    trends = compute_trends_nightly.submit()
    result = {"ranker": ranker.result(), "trends": trends.result()}
    logger.info("nightly_ml_flow_done", extra={"trace_id": "nightly-ml", "result": result})
    return result

