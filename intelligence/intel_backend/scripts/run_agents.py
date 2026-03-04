#!/usr/bin/env python3
"""CLI runner for NXT//LINK discovery agents.

Usage:
    python run_agents.py --all              Run every registered agent
    python run_agents.py --group discovery  Run all discovery agents
    python run_agents.py --agent patents    Run a single agent by name
    python run_agents.py --list             List all registered agents
"""

import argparse
import asyncio
import logging
import sys
from pathlib import Path

# Add parent directory to path so imports work
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.agents.registry import registry  # noqa: E402

# Discovery agents
from app.agents.discovery.usaspending_agent import USASpendingAgent  # noqa: E402
from app.agents.discovery.sam_agent import SAMAgent  # noqa: E402
from app.agents.discovery.patent_agent import PatentAgent  # noqa: E402
from app.agents.discovery.news_agent import NewsAgent  # noqa: E402
from app.agents.discovery.conference_agent import ConferenceAgent  # noqa: E402
from app.agents.discovery.directory_agent import DirectoryAgent  # noqa: E402

# Enrichment agents
from app.agents.enrichment.sbir_agent import SBIRAgent  # noqa: E402
from app.agents.enrichment.sec_edgar_agent import SECEdgarAgent  # noqa: E402
from app.agents.enrichment.crunchbase_agent import CrunchbaseAgent  # noqa: E402

# Analysis agents
from app.agents.analysis.trend_agent import TrendAgent  # noqa: E402
from app.agents.analysis.risk_agent import RiskAgent  # noqa: E402


def setup_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
        datefmt="%H:%M:%S",
    )


def register_all() -> None:
    """Register all known agents."""
    # Discovery (6)
    registry.register(USASpendingAgent())
    registry.register(SAMAgent())
    registry.register(PatentAgent())
    registry.register(NewsAgent())
    registry.register(ConferenceAgent())
    registry.register(DirectoryAgent())

    # Enrichment (3)
    registry.register(SBIRAgent())
    registry.register(SECEdgarAgent())
    registry.register(CrunchbaseAgent())

    # Analysis (2)
    registry.register(TrendAgent())
    registry.register(RiskAgent())


async def main() -> None:
    parser = argparse.ArgumentParser(description="NXT//LINK Agent Runner")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--all", action="store_true", help="Run all agents")
    group.add_argument("--group", type=str, help="Run agents in a group")
    group.add_argument("--agent", type=str, help="Run a single agent")
    group.add_argument("--list", action="store_true", help="List all agents")
    args = parser.parse_args()

    setup_logging()
    register_all()

    if args.list:
        agents = registry.list_agents()
        print(f"\n{'NAME':<20} {'GROUP':<15} {'CADENCE':<10} DESCRIPTION")
        print("-" * 75)
        for a in agents:
            print(
                f"{a['name']:<20} {a['group']:<15} {a['cadence_hours']}h"
                f"{'':>8} {a['description']}"
            )
        print(f"\nTotal: {len(agents)} agents in {len(registry.list_groups())} groups")
        return

    if args.all:
        print("\n=== Running ALL agents ===\n")
        results = await registry.run_all()
    elif args.group:
        print(f"\n=== Running group: {args.group} ===\n")
        results = await registry.run_group(args.group)
    else:
        print(f"\n=== Running agent: {args.agent} ===\n")
        result = await registry.run_agent(args.agent)
        results = {args.agent: result}

    # Print summary
    print("\n" + "=" * 60)
    print("RESULTS SUMMARY")
    print("=" * 60)
    total_entities = 0
    total_signals = 0
    for name, result in results.items():
        status = "OK" if result.success else "FAIL"
        total_entities += result.entities_found
        total_signals += result.signals_found
        print(
            f"  [{status}] {name:<20} "
            f"{result.entities_found:>4} entities  "
            f"{result.signals_found:>4} signals  "
            f"{result.duration_seconds:.1f}s"
        )
        if result.errors:
            for err in result.errors:
                print(f"         ERROR: {err}")

    print("-" * 60)
    print(f"  TOTAL: {total_entities} entities, {total_signals} signals")
    print()


if __name__ == "__main__":
    asyncio.run(main())
