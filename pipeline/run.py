#!/usr/bin/env python3
"""
NxtLink Pipeline Runner

Usage:
    python -m pipeline.run test                # Quick test (2 conferences)
    python -m pipeline.run scrape --max 10     # Scrape top 10 conferences
    python -m pipeline.run enrich              # Enrich unenriched vendors
    python -m pipeline.run full --persist      # Full pipeline with DB writes
"""

import asyncio
import sys
from loguru import logger


def setup_logging(verbose=False):
    logger.remove()
    logger.add(sys.stderr, level="DEBUG" if verbose else "INFO",
               format="<green>{time:HH:mm:ss}</green> | <level>{level:7s}</level> | {message}")


async def cmd_scrape(max_conf, persist):
    from pipeline.agents.conference_scraper import run_conference_scraper
    report = await run_conference_scraper(max_conferences=max_conf, persist=persist)
    print(f"\n[OK] Scraped {report.total_exhibitors} exhibitors from {report.pages_found} conferences")
    return report


async def cmd_enrich(persist):
    from pipeline.utils.supabase_client import get_supabase
    from pipeline.agents.vendor_enricher import run_vendor_enrichment
    db = get_supabase()
    result = db.table("exhibitors").select("normalized_name, conference_name, website").limit(50).execute()
    vendors = [{"name": r["normalized_name"], "conference_source": r.get("conference_name", ""),
                "website_hint": r.get("website", "")} for r in (result.data or [])]
    if not vendors:
        print("No unenriched vendors found")
        return
    report = await run_vendor_enrichment(vendors, persist=persist)
    print(f"\n[OK] Enriched {report.vendors_enriched}/{report.vendors_processed} vendors")


async def cmd_full(max_conf, persist):
    from pipeline.agents.conference_scraper import run_conference_scraper
    from pipeline.agents.vendor_enricher import run_vendor_enrichment

    print("=" * 60)
    print("PHASE 1: SCRAPING CONFERENCES")
    print("=" * 60)
    scrape = await run_conference_scraper(max_conferences=max_conf, persist=persist)
    print(f"-> {scrape.total_exhibitors} exhibitors from {scrape.pages_found} conferences\n")

    if scrape.total_exhibitors > 0:
        print("=" * 60)
        print("PHASE 2: ENRICHING VENDORS")
        print("=" * 60)
        vendors, seen = [], set()
        for r in scrape.results:
            for e in r.exhibitors:
                if e.name.lower() not in seen:
                    seen.add(e.name.lower())
                    vendors.append({"name": e.name, "conference_source": r.conference_name, "website_hint": e.website})
        enrich = await run_vendor_enrichment(vendors[:30], persist=persist)
        print(f"-> {enrich.vendors_enriched}/{enrich.vendors_processed} enriched\n")

    print("=" * 60)
    print("PIPELINE COMPLETE")
    print("=" * 60)


async def cmd_test():
    from pipeline.agents.conference_scraper import run_conference_scraper, CONFERENCE_TARGETS
    report = await run_conference_scraper(targets=CONFERENCE_TARGETS[:2], max_conferences=2, persist=False)
    print(f"\nTest: {report.total_exhibitors} exhibitors from {report.pages_found}/{report.conferences_scanned}")
    for r in report.results:
        print(f"  {r.conference_name}: {len(r.exhibitors)} ({r.scrape_method})")
        for e in r.exhibitors[:5]:
            print(f"    - {e.name}")
    if report.errors:
        print(f"  Errors: {report.errors}")


def main():
    args = sys.argv[1:]
    cmd = args[0] if args else "test"
    max_conf = 20
    persist = "--persist" in args
    verbose = "--verbose" in args
    if "--max" in args:
        idx = args.index("--max")
        max_conf = int(args[idx + 1]) if idx + 1 < len(args) else 20

    setup_logging(verbose)

    if cmd == "scrape":
        asyncio.run(cmd_scrape(max_conf, persist))
    elif cmd == "enrich":
        asyncio.run(cmd_enrich(persist))
    elif cmd == "full":
        asyncio.run(cmd_full(max_conf, persist))
    elif cmd == "test":
        asyncio.run(cmd_test())
    else:
        print(__doc__)


if __name__ == "__main__":
    main()
