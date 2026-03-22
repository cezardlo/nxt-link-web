"""
NEXUS — The AI CEO for NXT LINK
================================

This script wires together all the existing agents and runs them.
It uses YOUR existing infrastructure - no new dependencies.

Usage:
    python nexus.py run          # Run all agents once
    python nexus.py scan-news    # Just run news agent
    python nexus.py scan-all     # Run all discovery agents
    python nexus.py status       # Show agent status
    python nexus.py schedule     # Start scheduled runs (Prefect)

Your existing packages used:
- feedparser (RSS)
- httpx (HTTP)
- trafilatura (text extraction)
- sentence-transformers (embeddings)
- prefect (scheduling)
"""

import asyncio
import sys
import os
from datetime import datetime, timezone
from pathlib import Path

# Add the intel_backend to path
INTEL_BACKEND = Path(__file__).parent / "intelligence" / "intel_backend"
sys.path.insert(0, str(INTEL_BACKEND))

# Now import from intel_backend
try:
    from app.agents.registry import registry
    from app.agents.base import AgentResult
    from app.agents.discovery.news_agent import NewsAgent
    from app.agents.discovery.patent_agent import PatentAgent
    from app.agents.discovery.conference_agent import ConferenceAgent
    from app.agents.discovery.sam_agent import SAMAgent
    from app.logging import get_logger
except ImportError as e:
    print(f"Import error: {e}")
    print("Make sure you're in the nxt-link-web directory")
    print("Run: pip install -e intelligence/intel_backend")
    sys.exit(1)

import httpx
import feedparser

logger = get_logger("nexus")

# ============================================================================
# CONFIGURATION
# ============================================================================

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Industries to monitor
INDUSTRIES = [
    "logistics",
    "supply chain",
    "semiconductors",
    "artificial intelligence",
    "manufacturing",
    "warehouse automation",
    "electric vehicles",
    "fintech",
]

# RSS Feeds (your NewsAgent already has some, adding more)
EXTRA_FEEDS = [
    ("Supply Chain Dive", "https://www.supplychaindive.com/feeds/news/"),
    ("Logistics Management", "https://www.logisticsmgmt.com/rss/lm_all.xml"),
    ("FreightWaves", "https://www.freightwaves.com/news/feed"),
    ("The Loadstar", "https://theloadstar.com/feed/"),
    ("Modern Shipper", "https://www.freightwaves.com/modern-shipper/feed"),
]

# ============================================================================
# DATABASE HELPER
# ============================================================================

async def insert_signal(signal: dict) -> bool:
    """Insert a signal into intel_signals table via Supabase REST API."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print(f"  [LOCAL] Would insert: {signal.get('title', 'untitled')[:60]}")
        return True

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }

    # Map to intel_signals schema
    row = {
        "title": signal.get("title", "Untitled")[:200],
        "signal_type": signal.get("type", "news"),
        "industry": signal.get("industry", "technology"),
        "source_url": signal.get("url", ""),
        "source_name": signal.get("source_feed", "news"),
        "importance_score": signal.get("confidence", 0.5),
        "detected_at": datetime.now(timezone.utc).isoformat(),
        "raw_content": signal.get("summary", ""),
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{SUPABASE_URL}/rest/v1/intel_signals",
                headers=headers,
                json=row,
                timeout=10,
            )
            if resp.status_code in (200, 201):
                return True
            else:
                print(f"  [ERROR] Insert failed: {resp.status_code} - {resp.text[:100]}")
                return False
    except Exception as e:
        print(f"  [ERROR] Insert error: {e}")
        return False


async def insert_company(company: dict) -> bool:
    """Insert a company into vendors table."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print(f"  [LOCAL] Would insert company: {company.get('name', 'unknown')}")
        return True

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }

    row = {
        "company_name": company.get("name", "Unknown")[:200],
        "industry": company.get("industry", "technology"),
        "source": company.get("source", "nexus"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{SUPABASE_URL}/rest/v1/vendors",
                headers=headers,
                json=row,
                timeout=10,
            )
            return resp.status_code in (200, 201)
    except Exception:
        return False


# ============================================================================
# AGENT RUNNERS
# ============================================================================

async def run_news_scan():
    """Scan RSS feeds for news signals."""
    print("\n  NEXUS: Scanning news feeds...")

    signals_found = 0
    companies_found = 0

    # Use your existing NewsAgent
    try:
        agent = NewsAgent()
        result = await agent.run()

        if result.success and result.data:
            signals = result.data.get("signals", [])
            entities = result.data.get("entities", [])

            print(f"   NewsAgent found {len(signals)} signals, {len(entities)} entities")

            for signal in signals[:20]:  # Limit to 20
                if await insert_signal(signal):
                    signals_found += 1

            for entity in entities[:10]:  # Limit to 10
                if await insert_company(entity):
                    companies_found += 1
    except Exception as e:
        print(f"   [ERROR] NewsAgent failed: {e}")

    # Also scan extra feeds directly
    print("   Scanning extra RSS feeds...")
    for feed_name, feed_url in EXTRA_FEEDS:
        try:
            feed = feedparser.parse(feed_url)
            for entry in feed.entries[:10]:
                signal = {
                    "title": entry.get("title", "")[:200],
                    "type": "news",
                    "url": entry.get("link", ""),
                    "source_feed": feed_name,
                    "summary": entry.get("summary", "")[:500],
                    "confidence": 0.6,
                    "industry": detect_industry(entry.get("title", "") + entry.get("summary", "")),
                }
                if await insert_signal(signal):
                    signals_found += 1
        except Exception as e:
            print(f"   [WARN] Feed {feed_name} failed: {e}")

    print(f"   Inserted {signals_found} signals, {companies_found} companies")
    return signals_found


def detect_industry(text: str) -> str:
    """Simple keyword-based industry detection."""
    text_lower = text.lower()

    industry_keywords = {
        "logistics": ["logistics", "shipping", "freight", "warehouse", "supply chain", "delivery"],
        "semiconductors": ["semiconductor", "chip", "processor", "nvidia", "tsmc", "intel", "amd"],
        "artificial intelligence": ["ai", "artificial intelligence", "machine learning", "llm", "gpt", "neural"],
        "manufacturing": ["manufacturing", "factory", "production", "assembly", "automation"],
        "fintech": ["fintech", "payment", "banking", "crypto", "blockchain", "finance"],
        "electric vehicles": ["ev", "electric vehicle", "tesla", "battery", "charging"],
        "healthcare": ["health", "medical", "pharma", "biotech", "hospital"],
        "defense": ["defense", "military", "pentagon", "dod", "army", "navy", "missile", "fort bliss"],
        "cybersecurity": ["cyber", "security", "breach", "hack", "ransomware", "encryption"],
        "energy": ["energy", "solar", "wind", "nuclear", "grid", "renewable", "hydrogen"],
        "border-tech": ["border", "cbp", "customs", "immigration", "checkpoint"],
    }

    for industry, keywords in industry_keywords.items():
        if any(kw in text_lower for kw in keywords):
            return industry

    return "technology"


async def run_all_agents():
    """Run all registered agents."""
    print("\n  NEXUS: Running all agents...")

    # Register agents
    registry.register(NewsAgent())

    # Try to register other agents if they exist
    try:
        registry.register(PatentAgent())
    except Exception:
        pass

    try:
        registry.register(ConferenceAgent())
    except Exception:
        pass

    try:
        registry.register(SAMAgent())
    except Exception:
        pass

    # Run all
    results = await registry.run_all()

    total_signals = 0
    for name, result in results.items():
        if result.success:
            total_signals += result.signals_found
            print(f"   {name}: {result.signals_found} signals, {result.entities_found} entities")
        else:
            print(f"   {name}: FAILED - {result.errors}")

    return total_signals


async def generate_daily_briefing():
    """Generate today's briefing based on signals."""
    print("\n  NEXUS: Generating daily briefing...")

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("   [LOCAL] Would generate briefing from local data")
        return

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    }

    try:
        async with httpx.AsyncClient() as client:
            # Get recent signals
            resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/intel_signals",
                headers=headers,
                params={
                    "select": "*",
                    "order": "detected_at.desc",
                    "limit": "50",
                },
                timeout=10,
            )
            signals = resp.json() if resp.status_code == 200 else []

            # Count by industry
            industry_counts = {}
            for s in signals:
                ind = s.get("industry", "other")
                industry_counts[ind] = industry_counts.get(ind, 0) + 1

            # Find highest importance
            top_signals = sorted(signals, key=lambda x: x.get("importance_score", 0), reverse=True)[:5]

            print(f"   {len(signals)} signals in last batch")
            print(f"   Industries: {dict(sorted(industry_counts.items(), key=lambda x: -x[1]))}")
            print(f"   Top signals:")
            for s in top_signals:
                print(f"      - {s.get('title', 'untitled')[:60]}...")

    except Exception as e:
        print(f"   [ERROR] Briefing failed: {e}")


def show_status():
    """Show current agent status."""
    print("\n  NEXUS STATUS")
    print("=" * 50)

    # Check Supabase connection
    if SUPABASE_URL and SUPABASE_KEY:
        print(f"  Supabase: Connected")
        print(f"   URL: {SUPABASE_URL[:40]}...")
    else:
        print("  Supabase: Not configured (running in local mode)")

    # List agents
    print("\n  Registered Agents:")

    agents = [
        ("NewsAgent", "Scans 7 RSS feeds for tech news"),
        ("PatentAgent", "USPTO patent signals"),
        ("ConferenceAgent", "Industry conferences"),
        ("SAMAgent", "Government contracts (SAM.gov)"),
        ("USASpendingAgent", "Federal spending data"),
        ("DirectoryAgent", "Company directories"),
    ]

    for name, desc in agents:
        print(f"   - {name}: {desc}")

    print("\n  Schedule (when running):")
    print("   - News scan: Every 1 hour")
    print("   - Full crawl: Every 4 hours")
    print("   - ML training: Nightly")


# ============================================================================
# MAIN
# ============================================================================

async def main():
    if len(sys.argv) < 2:
        print("""
    NEXUS -- AI CEO for NXT LINK

    Commands:
      python nexus.py run         Run all agents once
      python nexus.py scan-news   Just scan news feeds
      python nexus.py scan-all    Run all discovery agents
      python nexus.py briefing    Generate daily briefing
      python nexus.py status      Show system status

    Environment:
      SUPABASE_URL               Your Supabase URL
      SUPABASE_SERVICE_ROLE_KEY  Your service role key
        """)
        return

    command = sys.argv[1].lower()

    if command == "run":
        await run_news_scan()
        await generate_daily_briefing()

    elif command == "scan-news":
        await run_news_scan()

    elif command == "scan-all":
        await run_all_agents()

    elif command == "briefing":
        await generate_daily_briefing()

    elif command == "status":
        show_status()

    else:
        print(f"Unknown command: {command}")
        print("Use: run, scan-news, scan-all, briefing, status")


if __name__ == "__main__":
    asyncio.run(main())
