from datetime import datetime, timezone

from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from app.models import CrawlQueue, Source
from app.schemas import SourceCreate


def create_source(db: Session, payload: SourceCreate) -> Source:
    source = Source(
        name=payload.name,
        base_url=str(payload.base_url),
        category=payload.category,
        crawl_method=payload.crawl_method,
        crawl_frequency_minutes=payload.crawl_frequency_minutes,
        rate_limit_per_minute=payload.rate_limit_per_minute,
        render_js=payload.render_js,
    )
    db.add(source)
    db.flush()
    return source


def enqueue_due_sources(db: Session, now: datetime | None = None) -> int:
    now = now or datetime.now(timezone.utc)
    due_sources = db.scalars(select(Source).where(Source.active.is_(True))).all()
    queued = 0
    for source in due_sources:
        recent_queue = db.scalar(
            select(CrawlQueue.queue_id)
            .where(
                and_(
                    CrawlQueue.source_id == source.source_id,
                    CrawlQueue.status.in_(("queued", "running", "retry_scheduled")),
                    or_(CrawlQueue.scheduled_at >= now, CrawlQueue.next_retry_at >= now),
                )
            )
            .limit(1)
        )
        if recent_queue:
            continue
        db.add(
            CrawlQueue(
                source_id=source.source_id,
                scheduled_at=now,
                status="queued",
                priority=max(1, int((1 - source.reliability_score) * 30) + 40),
            )
        )
        queued += 1
    return queued


def lease_queue_items(db: Session, worker_id: str, limit: int) -> list[CrawlQueue]:
    rows = db.scalars(
        select(CrawlQueue)
        .where(CrawlQueue.status.in_(("queued", "retry_scheduled")))
        .order_by(CrawlQueue.priority.asc(), CrawlQueue.scheduled_at.asc())
        .limit(limit)
    ).all()
    leased: list[CrawlQueue] = []
    for row in rows:
        row.status = "running"
        row.worker_id = worker_id
        row.started_at = datetime.now(timezone.utc)
        row.attempt_count = (row.attempt_count or 0) + 1
        leased.append(row)
    return leased

