from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from hashlib import sha256
from urllib.parse import urlparse

import httpx
from playwright.async_api import async_playwright
from sqlalchemy.orm import Session
from tenacity import AsyncRetrying, retry_if_exception_type, stop_after_attempt, wait_exponential_jitter

from app.config import settings
from app.crawler.circuit_breaker import CircuitBreaker
from app.crawler.connectors import CONNECTOR_REGISTRY
from app.crawler.rate_limiter import DomainRateLimiter
from app.extraction.truth_card import extract_truth_card
from app.classification.classifier import classify_truth_card
from app.logging import get_logger
from app.models import Capture, CrawlQueue, EvidenceSnippet, ReviewQueue, Source, VendorTruthCard
from app.storage import ObjectStore

logger = get_logger(__name__)


class CrawlEngine:
    def __init__(self) -> None:
        self.rate_limiter = DomainRateLimiter()
        self.circuit = CircuitBreaker(
            threshold=settings.circuit_breaker_threshold,
            open_minutes=settings.circuit_breaker_open_minutes,
        )
        self.object_store = ObjectStore()

    async def run_batch(self, db: Session, jobs: list[CrawlQueue]) -> None:
        tasks = [self._run_job(db, job) for job in jobs]
        await asyncio.gather(*tasks)

    async def _run_job(self, db: Session, job: CrawlQueue) -> None:
        source = db.get(Source, job.source_id)
        if not source:
            return
        if self.circuit.is_open(source.source_id):
            job.status = "retry_scheduled"
            job.next_retry_at = datetime.now(timezone.utc) + timedelta(minutes=15)
            job.error_message = "Circuit breaker open"
            return

        connector_cls = CONNECTOR_REGISTRY.get(source.crawl_method)
        if not connector_cls:
            job.status = "failed"
            job.error_message = f"Unknown connector: {source.crawl_method}"
            return

        headers = {}
        if source.etag:
            headers["If-None-Match"] = source.etag
        if source.last_modified:
            headers["If-Modified-Since"] = source.last_modified

        try:
            connector = connector_cls()
            connector_result = await connector.discover(source.base_url, headers=headers)
            source.etag = connector_result.etag or source.etag
            source.last_modified = connector_result.last_modified or source.last_modified

            for url in connector_result.urls[:200]:
                await self._capture_url(db, source, job, url)

            source.last_success = datetime.now(timezone.utc)
            source.last_error = None
            source.reliability_score = min(1.0, source.reliability_score + 0.01)
            self.circuit.record_success(source.source_id)
            job.status = "completed"
            job.finished_at = datetime.now(timezone.utc)
        except Exception as exc:  # noqa: BLE001
            self.circuit.record_failure(source.source_id)
            source.last_error = str(exc)
            source.reliability_score = max(0.0, source.reliability_score - 0.04)
            if job.attempt_count < job.max_attempts:
                delay = min(120, 2 ** max(1, job.attempt_count))
                job.status = "retry_scheduled"
                job.next_retry_at = datetime.now(timezone.utc) + timedelta(minutes=delay)
            else:
                job.status = "dead_letter"
            job.error_message = str(exc)
            logger.exception("crawl_job_failed", extra={"trace_id": job.queue_id})

    async def _capture_url(self, db: Session, source: Source, job: CrawlQueue, url: str) -> None:
        domain = urlparse(url).netloc.lower()
        await self.rate_limiter.wait_for_slot(domain, source.rate_limit_per_minute)

        response, text = await self._fetch_document(url, source.render_js)
        content_hash = sha256(text.encode("utf-8")).hexdigest() if text else None
        raw_uri = self.object_store.put_text(f"captures/{source.source_id}/raw", text[:1_200_000]) if text else None

        capture = Capture(
            source_id=source.source_id,
            queue_id=job.queue_id,
            url=url,
            normalized_url=url,
            domain=domain,
            http_status=response.status_code if response else None,
            status="success" if response and response.is_success else "failed",
            etag=response.headers.get("etag") if response else None,
            last_modified=response.headers.get("last-modified") if response else None,
            content_hash=content_hash,
            content_type=response.headers.get("content-type") if response else None,
            raw_snapshot_uri=raw_uri,
            parser_version="crawler-v1",
            extraction_version="truth-card-v1",
            response_ms=None,
            bytes_downloaded=len(text.encode("utf-8")) if text else 0,
        )
        db.add(capture)
        db.flush()

        if not text or len(text) < 80:
            return

        truth_card = extract_truth_card(url=url, capture_id=capture.capture_id, text=text)
        if not truth_card.evidence_snippets:
            return

        evidence_ids: list[str] = []
        for evidence in truth_card.evidence_snippets:
            row = EvidenceSnippet(
                capture_id=capture.capture_id,
                source_id=source.source_id,
                url=str(evidence.url),
                quote_text=evidence.quote,
                section_hint=None,
            )
            db.add(row)
            db.flush()
            evidence_ids.append(row.evidence_id)

        card = VendorTruthCard(
            source_id=source.source_id,
            capture_id=capture.capture_id,
            canonical_vendor_id=truth_card.vendor_name.lower().replace(" ", "-"),
            vendor_name=truth_card.vendor_name,
            product_names=truth_card.product_names,
            capabilities=truth_card.capabilities,
            industries_mentioned=truth_card.industries_mentioned,
            integrations_mentioned=truth_card.integrations_mentioned,
            deployment_type=truth_card.deployment_type,
            geographic_signals=truth_card.geographic_signals,
            card_text=self._compose_card_text(truth_card),
            evidence_ids=evidence_ids,
            confidence=0.50,
            review_status="needs_review",
        )
        db.add(card)
        db.flush()

        classification = classify_truth_card(truth_card, evidence_ids)
        card.confidence = classification.confidence
        card.review_status = "auto_accepted" if classification.confidence >= settings.default_confidence_threshold else "needs_review"

        if classification.confidence < settings.default_confidence_threshold:
            db.add(
                ReviewQueue(
                    truth_card_id=card.truth_card_id,
                    reason="Low classification confidence",
                    priority=60,
                    status="open",
                )
            )

    async def _fetch_document(self, url: str, render_js: bool) -> tuple[httpx.Response | None, str]:
        if render_js:
            return await self._fetch_with_playwright(url)
        return await self._fetch_with_http(url)

    async def _fetch_with_http(self, url: str) -> tuple[httpx.Response | None, str]:
        async for attempt in AsyncRetrying(
            stop=stop_after_attempt(4),
            retry=retry_if_exception_type(httpx.HTTPError),
            wait=wait_exponential_jitter(initial=1, max=16),
            reraise=True,
        ):
            with attempt:
                async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
                    response = await client.get(url)
                    return response, response.text
        return None, ""

    async def _fetch_with_playwright(self, url: str) -> tuple[httpx.Response | None, str]:
        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto(url, wait_until="domcontentloaded", timeout=45000)
            content = await page.content()
            await browser.close()
        response = httpx.Response(status_code=200, request=httpx.Request("GET", url))
        return response, content

    @staticmethod
    def _compose_card_text(card) -> str:
        sections = [
            card.vendor_name,
            " ".join(card.product_names),
            " ".join(card.capabilities),
            " ".join(card.industries_mentioned),
            " ".join(card.integrations_mentioned),
            card.deployment_type or "",
            " ".join(card.geographic_signals),
        ]
        return "\n".join([s for s in sections if s]).strip()

