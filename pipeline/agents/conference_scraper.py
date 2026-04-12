"""
Conference Exhibitor Scraper — scrapes real exhibitor/vendor lists.

Strategies: static HTTP + BS4 -> Playwright browser -> PDF extraction.
No LLM. Real data only.
"""

import asyncio
import hashlib
import re
from dataclasses import dataclass, field
from typing import Optional
from urllib.parse import urljoin

from loguru import logger

from pipeline.utils.http_client import fetch_text, close_client
from pipeline.utils.html_parser import (
    extract_exhibitors_from_html, find_exhibitor_links,
    extract_pagination_links, ExhibitorRecord,
)
from pipeline.utils.browser import render_page, close_browser
from pipeline.utils.supabase_client import upsert_exhibitors, record_scrape_run

# ─── Conference targets with verified exhibitor URLs ─────────────────────────

CONFERENCE_TARGETS = [
    # Trucking & Logistics
    {"id": "mats-2026", "name": "Mid-America Trucking Show (MATS)", "website": "https://www.truckingshow.com", "exhibitor_paths": ["/exhibitors", "/exhibitor-list"]},
    {"id": "tmc-2026", "name": "TMC Annual Meeting", "website": "https://tmc.trucking.org", "exhibitor_paths": ["/exhibitors", "/expo"]},
    {"id": "modex-2026", "name": "MODEX", "website": "https://www.modexshow.com", "exhibitor_paths": ["/exhibitors", "/directory"]},
    {"id": "promat-2026", "name": "ProMat", "website": "https://www.promatshow.com", "exhibitor_paths": ["/exhibitors"]},
    {"id": "cscmp-edge-2026", "name": "CSCMP EDGE", "website": "https://cscmpedge.org", "exhibitor_paths": ["/exhibitors"]},
    {"id": "manifest-2026", "name": "Manifest", "website": "https://www.manife.st", "exhibitor_paths": ["/exhibitors"]},
    {"id": "freightweaves-f3-2026", "name": "FreightWaves F3", "website": "https://f3.freightwaves.com", "exhibitor_paths": ["/exhibitors"]},
    # Manufacturing
    {"id": "imts-2026", "name": "IMTS", "website": "https://www.imts.com", "exhibitor_paths": ["/exhibitors", "/exhibitor-directory"]},
    {"id": "fabtech-2026", "name": "FABTECH", "website": "https://www.fabtechexpo.com", "exhibitor_paths": ["/exhibitors"]},
    {"id": "automate-2026", "name": "Automate", "website": "https://www.automateshow.com", "exhibitor_paths": ["/exhibitors"]},
    # Defense
    {"id": "ausa-2026", "name": "AUSA Annual Meeting", "website": "https://www.ausa.org/meet", "exhibitor_paths": ["/exhibitors"]},
    # Tech
    {"id": "ces-2026", "name": "CES", "website": "https://www.ces.tech", "exhibitor_paths": ["/exhibitor-directory"]},
    # International Logistics
    {"id": "transport-logistic-2026", "name": "transport logistic", "website": "https://www.transportlogistic.de", "exhibitor_paths": ["/en/exhibitors"]},
    {"id": "logimat-2026", "name": "LogiMAT", "website": "https://www.logimat-messe.de", "exhibitor_paths": ["/en/exhibitors"]},
    # Supply Chain
    {"id": "rila-link-2026", "name": "RILA LINK", "website": "https://www.rila.org/events/link", "exhibitor_paths": ["/exhibitors"]},
    {"id": "gartner-scm-2026", "name": "Gartner Supply Chain Symposium", "website": "https://www.gartner.com/en/conferences/na/supply-chain-us", "exhibitor_paths": ["/exhibitors"]},
]


@dataclass
class ScrapeResult:
    conference_id: str
    conference_name: str
    exhibitor_page_url: str = ""
    exhibitors: list[ExhibitorRecord] = field(default_factory=list)
    scrape_method: str = "static"
    error: str = ""
    duration_ms: int = 0


async def scrape_conference(conf: dict) -> ScrapeResult:
    """Scrape one conference: static -> pagination -> browser -> PDF."""
    start = asyncio.get_event_loop().time()
    base = conf["website"].rstrip("/")
    result = ScrapeResult(conference_id=conf["id"], conference_name=conf["name"])

    # Step 1: Find exhibitor page
    html = None
    found_url = ""

    for path in conf.get("exhibitor_paths", ["/exhibitors"]):
        url = f"{base}{path}"
        page_html = await fetch_text(url)
        if page_html and len(page_html) > 1000:
            html = page_html
            found_url = url
            logger.info(f"[{conf['name']}] Found: {url}")
            break

    if not html:
        homepage = await fetch_text(base)
        if homepage:
            for link in find_exhibitor_links(homepage, base)[:3]:
                page_html = await fetch_text(link)
                if page_html and len(page_html) > 1000:
                    html = page_html
                    found_url = link
                    logger.info(f"[{conf['name']}] Found via homepage: {link}")
                    break

    if not html:
        result.error = "No exhibitor page found"
        result.duration_ms = int((asyncio.get_event_loop().time() - start) * 1000)
        return result

    result.exhibitor_page_url = found_url

    # Step 2: Extract from static HTML
    exhibitors = extract_exhibitors_from_html(html, conf["name"])

    # Step 3: Follow pagination
    page_links = extract_pagination_links(html, found_url)
    if page_links:
        logger.info(f"[{conf['name']}] {len(page_links)} pagination pages")
        for page_url in page_links[:15]:
            page_html = await fetch_text(page_url)
            if page_html:
                page_exhs = extract_exhibitors_from_html(page_html, conf["name"])
                existing = {e.name.lower() for e in exhibitors}
                for e in page_exhs:
                    if e.name.lower() not in existing:
                        exhibitors.append(e)
                        existing.add(e.name.lower())

    # Step 4: Browser if static got too few
    if len(exhibitors) < 10:
        logger.info(f"[{conf['name']}] Static got {len(exhibitors)}, trying browser...")
        browser_html = await render_page(found_url, scroll=True, click_load_more=True)
        if browser_html and len(browser_html) > len(html) * 1.2:
            browser_exhs = extract_exhibitors_from_html(browser_html, conf["name"])
            if len(browser_exhs) > len(exhibitors):
                existing = {e.name.lower() for e in exhibitors}
                for e in browser_exhs:
                    if e.name.lower() not in existing:
                        exhibitors.append(e)
                        existing.add(e.name.lower())
                result.scrape_method = "combined"
                logger.info(f"[{conf['name']}] Browser added {len(browser_exhs)} more")

    # Step 5: Check for exhibitor PDFs
    pdf_links = re.findall(r'href=["\']([^"\']*\.pdf[^"\']*)["\']', html, re.I)
    for pdf_url in pdf_links:
        if any(kw in pdf_url.lower() for kw in ["exhibitor", "sponsor", "vendor", "directory"]):
            full_url = pdf_url if pdf_url.startswith("http") else urljoin(found_url, pdf_url)
            pdf_exhs = await _extract_pdf(full_url)
            if pdf_exhs:
                existing = {e.name.lower() for e in exhibitors}
                for e in pdf_exhs:
                    if e.name.lower() not in existing:
                        exhibitors.append(e)
                        existing.add(e.name.lower())

    result.exhibitors = exhibitors
    result.scrape_method = result.scrape_method or "static"
    result.duration_ms = int((asyncio.get_event_loop().time() - start) * 1000)
    logger.info(f"[{conf['name']}] Total: {len(exhibitors)} ({result.scrape_method}, {result.duration_ms}ms)")
    return result


async def _extract_pdf(url: str) -> list[ExhibitorRecord]:
    try:
        from pipeline.utils.http_client import get_client
        client = get_client()
        resp = await client.get(url, headers={"User-Agent": "NXTLink-Bot/1.0"})
        if resp.status_code != 200:
            return []
        import pymupdf
        doc = pymupdf.open(stream=resp.content, filetype="pdf")
        text = "\n".join(page.get_text() for page in doc)
        doc.close()
        from pipeline.utils.name_filter import is_valid_company_name
        results, seen = [], set()
        for line in text.split("\n"):
            line = line.strip()
            if 3 <= len(line) <= 60 and is_valid_company_name(line):
                key = line.lower()
                if key not in seen:
                    seen.add(key)
                    results.append(ExhibitorRecord(name=line, confidence=0.5))
        return results
    except Exception as e:
        logger.warning(f"PDF failed for {url}: {e}")
        return []


# ─── Main runner ─────────────────────────────────────────────────────────────

@dataclass
class ScraperReport:
    conferences_scanned: int = 0
    pages_found: int = 0
    total_exhibitors: int = 0
    results: list[ScrapeResult] = field(default_factory=list)
    errors: list[dict] = field(default_factory=list)
    duration_ms: int = 0
    persisted: int = 0


async def run_conference_scraper(
    targets: Optional[list[dict]] = None,
    max_conferences: int = 20,
    persist: bool = True,
) -> ScraperReport:
    start = asyncio.get_event_loop().time()
    targets = (targets or CONFERENCE_TARGETS)[:max_conferences]
    report = ScraperReport(conferences_scanned=len(targets))
    logger.info(f"Starting conference scraper -- {len(targets)} targets")

    for i in range(0, len(targets), 3):
        batch = targets[i:i + 3]
        batch_results = await asyncio.gather(
            *[scrape_conference(c) for c in batch], return_exceptions=True,
        )
        for r in batch_results:
            if isinstance(r, Exception):
                report.errors.append({"error": str(r)})
                continue
            if r.error:
                report.errors.append({"conference_id": r.conference_id, "error": r.error})
            if r.exhibitors:
                report.results.append(r)
                report.pages_found += 1
                report.total_exhibitors += len(r.exhibitors)

    if persist and report.total_exhibitors > 0:
        records = []
        for result in report.results:
            for exh in result.exhibitors:
                eid = hashlib.md5(f"{result.conference_id}::{exh.name.lower()}".encode()).hexdigest()[:16]
                records.append({
                    "id": f"{result.conference_id}::{eid}",
                    "conference_id": result.conference_id,
                    "conference_name": result.conference_name,
                    "raw_name": exh.name, "normalized_name": exh.name,
                    "booth": exh.booth, "category": exh.category,
                    "description": exh.description, "website": exh.website,
                    "confidence": exh.confidence, "source_url": result.exhibitor_page_url,
                })
        try:
            report.persisted = upsert_exhibitors(records)
        except Exception as e:
            logger.error(f"Persist failed: {e}")

    report.duration_ms = int((asyncio.get_event_loop().time() - start) * 1000)
    logger.info(f"Done: {report.total_exhibitors} exhibitors from {report.pages_found}/{report.conferences_scanned} ({report.duration_ms}ms)")
    await close_client()
    await close_browser()
    return report


if __name__ == "__main__":
    import sys
    max_c = int(sys.argv[1]) if len(sys.argv) > 1 else 5
    persist = "--persist" in sys.argv
    report = asyncio.run(run_conference_scraper(max_conferences=max_c, persist=persist))
    print(f"\nScraped {report.total_exhibitors} exhibitors from {report.pages_found} conferences")
    for r in report.results:
        print(f"  {r.conference_name}: {len(r.exhibitors)} ({r.scrape_method})")
        for e in r.exhibitors[:5]:
            print(f"    - {e.name}")
