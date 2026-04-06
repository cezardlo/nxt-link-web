"""Scheduled pipeline runner — runs every 6 hours automatically.

Usage:
    python -m pipeline.scheduler          # start scheduler (runs forever)
    python -m pipeline.scheduler --now    # run once immediately, then schedule
"""

import asyncio
import logging
import sys

import pipeline.config  # noqa: F401 — triggers sys.path + .env setup

from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.interval import IntervalTrigger
from pipeline.run import run_pipeline

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("pipeline.scheduler")


def run_once():
    """Synchronous wrapper for the async pipeline."""
    logger.info("═══ Scheduled pipeline run starting ═══")
    asyncio.run(run_pipeline())
    logger.info("═══ Scheduled pipeline run complete ═══")


def main():
    run_now = "--now" in sys.argv

    if run_now:
        run_once()

    scheduler = BlockingScheduler()
    scheduler.add_job(
        run_once,
        trigger=IntervalTrigger(hours=6),
        id="nxtlink_pipeline",
        name="NxtLink Intelligence Pipeline",
        replace_existing=True,
    )

    logger.info("Scheduler started — pipeline runs every 6 hours")
    logger.info("Press Ctrl+C to stop")

    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        logger.info("Scheduler stopped")


if __name__ == "__main__":
    main()
