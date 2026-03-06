"""
NXT//LINK Industry Observer — Orchestrator
Ties all agents together. Provides a CLI and a scheduled run loop.

Usage:
    python main.py collect       — fetch new raw items from approved sources
    python main.py classify      — classify pending raw items
    python main.py extract       — extract structured records
    python main.py verify        — dedup, conflict-detect, score sources
    python main.py discover      — find & seed new sources
    python main.py learn         — nightly learning cycle
    python main.py all           — full pipeline cycle (once)
    python main.py schedule      — run on a loop (approved=6h, watchlist=24h)
    python main.py export        — export JSON for Next.js consumption
    python main.py status        — print DB stats
"""

import argparse
import json
import logging
import sys
import time
from datetime import datetime

import schedule

from models import (
    ClassifiedItem,
    Deployment,
    Milestone,
    Product,
    RawItem,
    Source,
    get_session,
    init_db,
)

logger = logging.getLogger(__name__)


# ─── Logging Setup ────────────────────────────────────────────────────────────

def _setup_logging(level: str = "INFO") -> None:
    from config import LOG_DIR
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    log_file = LOG_DIR / f"observer_{datetime.utcnow().strftime('%Y%m%d')}.log"

    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler(log_file, encoding="utf-8"),
        ],
    )


# ─── Individual Stages ────────────────────────────────────────────────────────

def cmd_collect(status: str = "approved") -> None:
    """Run RSS/web collection for sources matching *status*."""
    from collector import run_collection_cycle
    logger.info("=== COLLECT (status=%s) ===", status)
    summary = run_collection_cycle(status_filter=status)
    total = sum(summary.values())
    logger.info("Collected %d new items across %d sources", total, len(summary))


def cmd_classify() -> None:
    """Classify all unprocessed raw items."""
    from classifier import classify_pending_items
    logger.info("=== CLASSIFY ===")
    count = classify_pending_items()
    logger.info("Classified %d items", count)


def cmd_extract() -> None:
    """Extract structured records from classified items."""
    from extractor import extract_all_pending
    logger.info("=== EXTRACT ===")
    result = extract_all_pending()
    logger.info("Extraction result: %s", result)


def cmd_verify() -> None:
    """Run dedup, conflict detection, and source scoring."""
    from verifier import run_verification
    logger.info("=== VERIFY ===")
    result = run_verification()
    logger.info("Verification result: %s", result)


def cmd_discover() -> None:
    """Discover and seed new sources."""
    from collector import discover_new_sources
    logger.info("=== DISCOVER ===")
    count = discover_new_sources()
    logger.info("Discovered %d new sources", count)


def cmd_learn() -> None:
    """Run the nightly learning cycle."""
    from learner import run_learning_cycle
    logger.info("=== LEARN ===")
    result = run_learning_cycle()
    logger.info("Learning result: %s", result)


def cmd_export(output_format: str = "json") -> None:
    """Export all data for Next.js consumption."""
    from export_to_nextjs import run_full_export
    logger.info("=== EXPORT (format=%s) ===", output_format)
    run_full_export()


# ─── Full Cycle ───────────────────────────────────────────────────────────────

def run_once(include_watchlist: bool = False) -> None:
    """
    Execute one complete pipeline cycle:
    collect → classify → extract → verify.
    """
    logger.info("=" * 60)
    logger.info("FULL CYCLE START — %s", datetime.utcnow().isoformat())
    logger.info("=" * 60)

    cmd_collect("approved")
    if include_watchlist:
        cmd_collect("watchlist")
    cmd_classify()
    cmd_extract()
    cmd_verify()

    logger.info("=" * 60)
    logger.info("FULL CYCLE COMPLETE — %s", datetime.utcnow().isoformat())
    logger.info("=" * 60)


# ─── Scheduled Loop ───────────────────────────────────────────────────────────

def run_scheduled() -> None:
    """
    Run the observer on a continuous loop using the `schedule` library.
    - Approved sources: every 6 hours
    - Watchlist sources: every 24 hours
    - Learning: every day at 02:00 UTC
    - Export: every 6 hours (after collection)
    """
    from config import CRAWL_SCHEDULE

    logger.info("Starting scheduled observer loop...")

    # Approved source full cycle every N hours
    approved_interval = CRAWL_SCHEDULE.get("approved", 6)

    def approved_cycle() -> None:
        cmd_collect("approved")
        cmd_classify()
        cmd_extract()
        cmd_verify()
        cmd_export()

    def watchlist_cycle() -> None:
        cmd_collect("watchlist")
        cmd_classify()

    def learning_cycle() -> None:
        cmd_learn()
        cmd_discover()

    schedule.every(approved_interval).hours.do(approved_cycle)
    schedule.every(CRAWL_SCHEDULE.get("watchlist", 24)).hours.do(watchlist_cycle)
    schedule.every().day.at("02:00").do(learning_cycle)

    # Run immediately on startup
    approved_cycle()

    while True:
        schedule.run_pending()
        time.sleep(60)


# ─── Status ───────────────────────────────────────────────────────────────────

def cmd_status() -> None:
    """Print a quick summary of the database contents."""
    session = get_session()
    try:
        sources_total = session.query(Source).count()
        sources_approved = session.query(Source).filter(Source.status == "approved").count()
        sources_watchlist = session.query(Source).filter(Source.status == "watchlist").count()
        sources_blocked = session.query(Source).filter(Source.status == "blocked").count()
        raw_total = session.query(RawItem).count()
        raw_pending = session.query(RawItem).filter(RawItem.processed == False).count()  # noqa: E712
        classified_total = session.query(ClassifiedItem).count()
        deployments_total = session.query(Deployment).count()
        products_total = session.query(Product).count()
        milestones_total = session.query(Milestone).count()

        lines = [
            "",
            "NXT//LINK INDUSTRY OBSERVER — STATUS",
            f"  Timestamp: {datetime.utcnow().isoformat()}",
            "",
            f"  Sources       total={sources_total}  approved={sources_approved}  "
            f"watchlist={sources_watchlist}  blocked={sources_blocked}",
            f"  Raw Items     total={raw_total}  pending={raw_pending}",
            f"  Classified    total={classified_total}",
            f"  Deployments   total={deployments_total}",
            f"  Products      total={products_total}",
            f"  Milestones    total={milestones_total}",
            "",
        ]
        print("\n".join(lines))
    finally:
        session.close()


# ─── CLI ──────────────────────────────────────────────────────────────────────

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="main.py",
        description="NXT//LINK Industry Observer — autonomous intelligence pipeline",
    )
    parser.add_argument(
        "command",
        choices=[
            "collect",
            "classify",
            "extract",
            "verify",
            "discover",
            "learn",
            "all",
            "schedule",
            "export",
            "status",
        ],
        help="Pipeline stage to run",
    )
    parser.add_argument(
        "--format",
        dest="output_format",
        default="json",
        choices=["json"],
        help="Output format for export command (default: json)",
    )
    parser.add_argument(
        "--include-watchlist",
        action="store_true",
        help="Include watchlist sources in 'all' cycle",
    )
    parser.add_argument(
        "--log-level",
        default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        help="Logging verbosity (default: INFO)",
    )
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    _setup_logging(args.log_level)
    init_db()

    command = args.command

    if command == "collect":
        cmd_collect("approved")

    elif command == "classify":
        cmd_classify()

    elif command == "extract":
        cmd_extract()

    elif command == "verify":
        cmd_verify()

    elif command == "discover":
        cmd_discover()

    elif command == "learn":
        cmd_learn()

    elif command == "all":
        run_once(include_watchlist=args.include_watchlist)

    elif command == "schedule":
        run_scheduled()

    elif command == "export":
        cmd_export(args.output_format)

    elif command == "status":
        cmd_status()

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
