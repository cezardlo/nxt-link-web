"""Agent 1: Ingestion — collect signals from RSS, APIs, and web pages."""

import logging
import hashlib
from datetime import datetime, timezone

import feedparser
import requests
import trafilatura

from pipeline.config import RSS_FEEDS
from pipeline.utils.db import get_db

logger = logging.getLogger("pipeline.ingestion")


class IngestionAgent:
    name = "ingestion"

    async def run(self) -> dict:
        db = get_db()

        # Get existing URLs to skip duplicates
        existing = db.select("intel_signals", {"select": "url", "limit": "10000"})
        seen_urls = {row["url"] for row in existing if row.get("url")}

        new_signals = []

        # ── RSS Feeds ──
        for feed_name, feed_url in RSS_FEEDS:
            try:
                entries = self._fetch_rss(feed_name, feed_url)
                for entry in entries:
                    if entry["url"] in seen_urls:
                        continue
                    seen_urls.add(entry["url"])
                    new_signals.append(entry)
            except Exception as e:
                logger.warning(f"[{feed_name}] RSS failed: {e}")

        if not new_signals:
            logger.info("No new signals found")
            return {"new_signals": 0}

        # Extract article text for top signals (limit to avoid rate limits)
        for signal in new_signals[:50]:
            try:
                text = trafilatura.fetch_url(signal["url"])
                if text:
                    extracted = trafilatura.extract(text)
                    if extracted:
                        signal["evidence"] = [{"text": extracted[:2000], "source": signal["source"]}]
            except Exception:
                pass

        # Write to Supabase in batches
        batch_size = 50
        total_inserted = 0
        for i in range(0, len(new_signals), batch_size):
            batch = new_signals[i : i + batch_size]
            rows = [self._to_row(s) for s in batch]
            try:
                db.insert("intel_signals", rows)
                total_inserted += len(rows)
            except Exception as e:
                logger.error(f"Insert failed: {e}")

        logger.info(f"Ingested {total_inserted} new signals from {len(RSS_FEEDS)} feeds")
        return {"new_signals": total_inserted, "feeds_checked": len(RSS_FEEDS)}

    def _fetch_rss(self, name: str, url: str) -> list[dict]:
        """Parse an RSS feed and return normalized signal dicts."""
        resp = requests.get(url, timeout=15, headers={"User-Agent": "NxtLink/1.0"})
        resp.raise_for_status()
        feed = feedparser.parse(resp.text)

        signals = []
        for entry in feed.entries[:30]:  # Cap per feed
            link = getattr(entry, "link", None)
            title = getattr(entry, "title", None)
            if not link or not title:
                continue

            published = getattr(entry, "published_parsed", None)
            if published:
                try:
                    dt = datetime(*published[:6], tzinfo=timezone.utc)
                except Exception:
                    dt = datetime.now(timezone.utc)
            else:
                dt = datetime.now(timezone.utc)

            signals.append({
                "title": title.strip(),
                "url": link.strip(),
                "source": name,
                "source_domain": _domain(link),
                "discovered_at": dt.isoformat(),
            })
        return signals

    def _to_row(self, signal: dict) -> dict:
        """Convert a signal dict to an intel_signals row."""
        return {
            "id": _signal_id(signal["url"]),
            "title": signal["title"][:500],
            "url": signal["url"],
            "source": signal["source"],
            "source_domain": signal.get("source_domain", ""),
            "signal_type": "unknown",
            "industry": "unknown",
            "confidence": 0.0,
            "importance_score": 0.0,
            "relevance_score": 0.0,
            "is_noise": False,
            "discovered_at": signal.get("discovered_at", datetime.now(timezone.utc).isoformat()),
            "evidence": signal.get("evidence", []),
            "tags": [],
            "quality_flags": [],
        }


def _signal_id(url: str) -> str:
    """Deterministic UUID-shaped ID from URL."""
    h = hashlib.sha256(url.encode()).hexdigest()
    return f"{h[:8]}-{h[8:12]}-{h[12:16]}-{h[16:20]}-{h[20:32]}"


def _domain(url: str) -> str:
    """Extract domain from URL."""
    try:
        from urllib.parse import urlparse
        return urlparse(url).netloc.replace("www.", "")
    except Exception:
        return ""
