"""
NXT//LINK Industry Observer — Sensor / Collector Agent
Fetches raw content from RSS feeds and web pages, stores RawItem records.
"""

import logging
import time
from datetime import datetime, timedelta
from email.utils import parsedate_to_datetime
from typing import Any
from urllib.parse import urljoin, urlparse

import feedparser
import requests
from bs4 import BeautifulSoup

try:
    import trafilatura
    HAS_TRAFILATURA = True
except ImportError:
    HAS_TRAFILATURA = False

from config import (
    CRAWL_SCHEDULE,
    SEED_SOURCES,
)
from models import RawItem, Source, get_session, init_db

logger = logging.getLogger(__name__)

REQUEST_TIMEOUT = 15
MAX_ITEMS_PER_FEED = 50
USER_AGENT = "NXTLINKObserver/1.0 (+https://nxtlink.io/bot)"

HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _safe_parse_date(date_str: str | None) -> datetime | None:
    """Try to parse an RFC-2822 date string; return None on failure."""
    if not date_str:
        return None
    try:
        return parsedate_to_datetime(date_str)
    except Exception:
        return None


def _domain_from_url(url: str) -> str:
    """Extract the bare domain (netloc) from a URL."""
    return urlparse(url).netloc.lower().lstrip("www.")


# ─── Core Collection Functions ────────────────────────────────────────────────

def collect_from_rss(source: Source) -> int:
    """
    Fetch an RSS/Atom feed for *source* and persist new RawItem rows.

    Returns the number of new items stored.
    """
    if not source.feed_url:
        logger.warning("Source %s has no feed_url — skipping RSS collect", source.domain)
        return 0

    logger.info("Collecting RSS: %s", source.feed_url)
    try:
        feed = feedparser.parse(
            source.feed_url,
            request_headers={"User-Agent": USER_AGENT},
        )
    except Exception as exc:
        logger.error("feedparser error for %s: %s", source.feed_url, exc)
        return 0

    new_count = 0
    session = get_session()
    try:
        for entry in feed.entries[:MAX_ITEMS_PER_FEED]:
            url: str = entry.get("link", "").strip()
            if not url:
                continue

            # Skip already-stored URLs
            exists = session.query(RawItem).filter_by(url=url).first()
            if exists:
                continue

            title: str = entry.get("title", "").strip()
            summary: str = entry.get("summary", "") or entry.get("description", "") or ""
            pub_date = _safe_parse_date(entry.get("published", ""))

            item = RawItem(
                source_id=source.id,
                url=url,
                title=title[:1024] if title else None,
                text=summary[:8000] if summary else None,
                published_at=pub_date,
                fetched_at=datetime.utcnow(),
                processed=False,
            )
            session.add(item)
            new_count += 1

        source.last_crawled = datetime.utcnow()
        source.items_count = (source.items_count or 0) + new_count
        session.commit()
        logger.info("Stored %d new items from %s", new_count, source.domain)
    except Exception as exc:
        session.rollback()
        logger.error("DB error storing items from %s: %s", source.domain, exc)
    finally:
        session.close()

    return new_count


def collect_from_web(url: str) -> str | None:
    """
    Fetch a web page and extract clean article text.
    Uses trafilatura if available, falls back to BeautifulSoup.

    Returns cleaned text or None on failure.
    """
    logger.debug("Fetching web page: %s", url)
    try:
        resp = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
        html = resp.text
    except requests.RequestException as exc:
        logger.warning("HTTP error fetching %s: %s", url, exc)
        return None

    if HAS_TRAFILATURA:
        text = trafilatura.extract(
            html,
            include_comments=False,
            include_tables=False,
            no_fallback=False,
        )
        if text and len(text) > 100:
            return text

    # Fallback: BeautifulSoup paragraph extraction
    try:
        soup = BeautifulSoup(html, "lxml")
        paragraphs = soup.find_all("p")
        text = " ".join(p.get_text(separator=" ") for p in paragraphs)
        return text[:10000] if text else None
    except Exception as exc:
        logger.warning("BeautifulSoup fallback failed for %s: %s", url, exc)
        return None


def discover_rss(domain: str) -> list[str]:
    """
    Attempt RSS autodiscovery for *domain*.
    Checks well-known feed paths and <link rel='alternate'> tags.

    Returns a list of discovered feed URLs (may be empty).
    """
    found: list[str] = []
    base_url = f"https://{domain}"

    CANDIDATE_PATHS = [
        "/feed",
        "/rss",
        "/feed.xml",
        "/rss.xml",
        "/atom.xml",
        "/blog/feed",
        "/news/feed",
        "/feed/rss2",
        "/index.xml",
    ]

    # 1. Try well-known paths via HEAD
    for path in CANDIDATE_PATHS:
        url = f"{base_url}{path}"
        try:
            resp = requests.head(url, headers=HEADERS, timeout=8, allow_redirects=True)
            ct = resp.headers.get("Content-Type", "")
            if resp.status_code == 200 and any(t in ct for t in ["xml", "rss", "atom"]):
                found.append(url)
                logger.debug("Found feed via path probe: %s", url)
        except requests.RequestException:
            pass

    if found:
        return found

    # 2. Parse <link rel='alternate'> in homepage HTML
    try:
        resp = requests.get(base_url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(resp.text, "lxml")
        for link in soup.find_all("link", rel="alternate"):
            href = link.get("href", "")
            link_type = link.get("type", "")
            if href and any(t in link_type for t in ["rss", "atom", "xml"]):
                absolute = urljoin(base_url, href)
                found.append(absolute)
                logger.debug("Found feed via autodiscovery: %s", absolute)
    except Exception as exc:
        logger.debug("Autodiscovery HTML parse failed for %s: %s", domain, exc)

    return found


# ─── Cycle Orchestration ──────────────────────────────────────────────────────

def run_collection_cycle(status_filter: str = "approved") -> dict[str, int]:
    """
    Iterate all sources with *status_filter* and collect new items from each.
    Respects CRAWL_SCHEDULE — skips sources crawled too recently.

    Returns a summary dict: {domain: new_items_count}.
    """
    session = get_session()
    summary: dict[str, int] = {}

    try:
        sources = (
            session.query(Source)
            .filter(Source.status == status_filter)
            .all()
        )
        logger.info("Running collection cycle for %d %s sources", len(sources), status_filter)

        interval_hours = CRAWL_SCHEDULE.get(status_filter, 24)
        cutoff = datetime.utcnow() - timedelta(hours=interval_hours)

        for source in sources:
            if source.last_crawled and source.last_crawled > cutoff:
                logger.debug(
                    "Skipping %s — crawled recently (%s)", source.domain, source.last_crawled
                )
                continue

            count = collect_from_rss(source)
            summary[source.domain] = count
            time.sleep(1.0)  # polite crawl rate

    finally:
        session.close()

    total = sum(summary.values())
    logger.info("Collection cycle complete. New items: %d across %d sources", total, len(summary))
    return summary


def discover_new_sources(seed_urls: list[str] | None = None) -> int:
    """
    Crawl outbound links from high-quality existing articles to find new domains.
    Any new domain with a discoverable RSS feed is added to the watchlist.

    Also bootstraps SEED_SOURCES into the DB if they are not already present.

    Returns the number of new Source rows created.
    """
    session = get_session()
    new_source_count = 0

    try:
        # ── Bootstrap seed sources ────────────────────────────────────────────
        for industry, feed_urls in SEED_SOURCES.items():
            for feed_url in feed_urls:
                domain = _domain_from_url(feed_url)
                exists = session.query(Source).filter_by(domain=domain).first()
                if not exists:
                    src = Source(
                        domain=domain,
                        url=f"https://{domain}",
                        feed_url=feed_url,
                        industry=industry,
                        score=50.0,
                        status="approved",
                    )
                    session.add(src)
                    new_source_count += 1
                    logger.info("Seeded new source: %s (%s)", domain, industry)

        session.commit()

        # ── Follow outbound links from useful approved items ──────────────────
        urls_to_explore = seed_urls or []

        if not urls_to_explore:
            # Pick recent high-yield approved items
            good_items = (
                session.query(RawItem)
                .join(Source)
                .filter(Source.status == "approved")
                .order_by(RawItem.fetched_at.desc())
                .limit(20)
                .all()
            )
            urls_to_explore = [item.url for item in good_items]

        seen_domains: set[str] = {
            src.domain for src in session.query(Source).all()
        }

        for url in urls_to_explore:
            try:
                resp = requests.get(url, headers=HEADERS, timeout=10)
                soup = BeautifulSoup(resp.text, "lxml")
                for a_tag in soup.find_all("a", href=True):
                    href: str = a_tag["href"]
                    if not href.startswith("http"):
                        continue
                    candidate_domain = _domain_from_url(href)
                    if not candidate_domain or candidate_domain in seen_domains:
                        continue

                    feeds = discover_rss(candidate_domain)
                    if feeds:
                        # Guess industry from the referring source's industry
                        referring_source = (
                            session.query(Source)
                            .filter_by(domain=_domain_from_url(url))
                            .first()
                        )
                        industry = referring_source.industry if referring_source else "general"

                        src = Source(
                            domain=candidate_domain,
                            url=f"https://{candidate_domain}",
                            feed_url=feeds[0],
                            industry=industry,
                            score=40.0,
                            status="watchlist",
                        )
                        session.add(src)
                        seen_domains.add(candidate_domain)
                        new_source_count += 1
                        logger.info(
                            "Discovered new watchlist source: %s", candidate_domain
                        )

                time.sleep(0.5)
            except Exception as exc:
                logger.debug("Error exploring %s: %s", url, exc)
                continue

        session.commit()

    except Exception as exc:
        session.rollback()
        logger.error("Error in discover_new_sources: %s", exc)
    finally:
        session.close()

    logger.info("Source discovery complete. New sources: %d", new_source_count)
    return new_source_count


# ─── Entrypoint ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    init_db()
    discover_new_sources()
    run_collection_cycle()
