"""Run the full NxtLink pipeline: ingest → classify → track → connect → insight.

Usage:
    python -m pipeline.run              # run all 5 agents
    python -m pipeline.run classify     # run single agent
    python -m pipeline.run track insight # run specific agents
"""

import asyncio
import logging
import sys
import time

# Ensure .pylibs is on path before any imports
import pipeline.config  # noqa: F401 — triggers sys.path setup

from pipeline.agents.ingestion import IngestionAgent
from pipeline.agents.classification import ClassificationAgent
from pipeline.agents.tracking import TrackingAgent
from pipeline.agents.connection import ConnectionAgent
from pipeline.agents.insight import InsightAgent
from pipeline.agents.economic import EconomicAgent

ALL_AGENTS = {
    "ingestion": IngestionAgent,
    "classification": ClassificationAgent,
    "economic": EconomicAgent,
    "tracking": TrackingAgent,
    "connection": ConnectionAgent,
    "insight": InsightAgent,
}

PIPELINE_ORDER = ["ingestion", "classification", "economic", "tracking", "connection", "insight"]


async def run_pipeline(agent_names: list[str] | None = None):
    """Run agents in pipeline order."""
    if agent_names is None:
        agent_names = PIPELINE_ORDER

    # Ensure order matches pipeline sequence
    ordered = [name for name in PIPELINE_ORDER if name in agent_names]

    results = {}
    total_start = time.monotonic()

    for name in ordered:
        agent_cls = ALL_AGENTS.get(name)
        if not agent_cls:
            logging.warning(f"Unknown agent: {name}")
            continue

        agent = agent_cls()
        start = time.monotonic()
        logging.info(f"─── [{agent.name}] Starting ───")

        try:
            result = await agent.run()
            elapsed = time.monotonic() - start
            results[name] = result
            logging.info(f"─── [{agent.name}] Done in {elapsed:.1f}s → {result} ───")
        except Exception as e:
            elapsed = time.monotonic() - start
            logging.error(f"─── [{agent.name}] FAILED in {elapsed:.1f}s: {e} ───")
            results[name] = {"error": str(e)}

    total_elapsed = time.monotonic() - total_start
    logging.info(f"═══ Pipeline complete in {total_elapsed:.1f}s ═══")
    return results


def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        datefmt="%H:%M:%S",
    )

    # Parse args: which agents to run
    args = sys.argv[1:]
    if args:
        agent_names = [a.strip().lower() for a in args]
    else:
        agent_names = None  # run all

    asyncio.run(run_pipeline(agent_names))


if __name__ == "__main__":
    main()
