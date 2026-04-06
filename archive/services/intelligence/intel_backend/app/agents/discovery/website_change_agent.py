"""Website Change Detection Agent — monitors vendor websites for updates, hiring signals, and growth indicators."""

from __future__ import annotations
import hashlib
import logging
import re
from typing import Any

from ..base import BaseAgent, AgentResult

logger = logging.getLogger(__name__)

# In-memory hash store (replaced by DB table in production)
_hash_store: dict[str, str] = {}

# Signal detection patterns
HIRING_PATTERNS = re.compile(
    r"(careers|jobs|hiring|open positions|join our team|we.re hiring|work with us|job openings)",
    re.IGNORECASE,
)
GROWTH_PATTERNS = re.compile(
    r"(expansion|new facility|grand opening|relocated|new office|growing|expanded|launched)",
    re.IGNORECASE,
)
RISK_PATTERNS = re.compile(
    r"(layoff|restructuring|closure|shutdown|bankruptcy|litigation|recall)",
    re.IGNORECASE,
)
TECH_PATTERNS = re.compile(
    r"(automation|robotics|ai |artificial intelligence|machine learning|iot|digital twin|erp|sap|oracle)",
    re.IGNORECASE,
)


def _content_hash(html: str) -> str:
    """Hash text content only (strip HTML tags to avoid false positives from CSS/JS changes)."""
    text = re.sub(r"<[^>]+>", " ", html)
    text = re.sub(r"\s+", " ", text).strip().lower()
    return hashlib.sha256(text[:10000].encode()).hexdigest()[:16]


def _detect_signals(text: str, vendor_name: str) -> list[dict[str, Any]]:
    """Detect growth, hiring, risk, and tech signals from website content."""
    signals: list[dict[str, Any]] = []
    clean = re.sub(r"<[^>]+>", " ", text).lower()

    if HIRING_PATTERNS.search(clean):
        signals.append({
            "type": "hiring",
            "vendor": vendor_name,
            "confidence": 0.75,
            "message": f"{vendor_name} has active hiring/careers page",
        })
    if GROWTH_PATTERNS.search(clean):
        signals.append({
            "type": "growth",
            "vendor": vendor_name,
            "confidence": 0.70,
            "message": f"{vendor_name} shows expansion signals",
        })
    if RISK_PATTERNS.search(clean):
        signals.append({
            "type": "risk",
            "vendor": vendor_name,
            "confidence": 0.65,
            "message": f"{vendor_name} shows potential risk indicators",
        })
    if TECH_PATTERNS.search(clean):
        signals.append({
            "type": "tech_adoption",
            "vendor": vendor_name,
            "confidence": 0.70,
            "message": f"{vendor_name} mentions automation/AI technology",
        })
    return signals


class WebsiteChangeAgent(BaseAgent):
    """Monitors vendor websites for content changes and detects growth/hiring/risk signals."""

    name = "website_change"
    description = "Detects vendor website changes and extracts growth signals"
    group = "discovery"
    cadence_hours = 168  # weekly

    async def run(self) -> AgentResult:
        # In production: fetch vendor URLs from DB and check each one via httpx.
        # For now: demonstrate the detection pattern with sample content.
        sample_pages: list[dict[str, str]] = [
            {
                "vendor": "L3Harris Technologies",
                "url": "https://www.l3harris.com",
                "content": (
                    "<html><body><h1>L3Harris</h1><p>We're hiring for Fort Bliss positions. "
                    "Join our team of innovators in electronic warfare and AI-powered sensor systems.</p></body></html>"
                ),
            },
            {
                "vendor": "SAIC",
                "url": "https://www.saic.com",
                "content": (
                    "<html><body><h1>SAIC</h1><p>SAIC announces expansion of El Paso operations "
                    "with new facility for cloud and automation services.</p></body></html>"
                ),
            },
            {
                "vendor": "Precision Machine Works",
                "url": "https://precisionmachineworks.com",
                "content": (
                    "<html><body><h1>Precision Machine Works</h1><p>CNC machining and fabrication "
                    "for defense and aerospace. ISO 9001 certified.</p></body></html>"
                ),
            },
        ]

        total_checked = 0
        changed_count = 0
        all_signals: list[dict[str, Any]] = []
        errors: list[str] = []

        for page in sample_pages:
            total_checked += 1
            vendor_name = page["vendor"]
            content = page["content"]
            new_hash = _content_hash(content)
            old_hash = _hash_store.get(vendor_name)

            if old_hash and old_hash == new_hash:
                self.logger.debug("No change detected for %s", vendor_name)
                continue

            # Content changed (or first scan)
            _hash_store[vendor_name] = new_hash
            changed_count += 1

            # Detect signals
            signals = _detect_signals(content, vendor_name)
            all_signals.extend(signals)

            if signals:
                self.logger.info("%s: %d signal(s) detected", vendor_name, len(signals))

        self.logger.info(
            "Website change scan: %d checked, %d changed, %d signals",
            total_checked,
            changed_count,
            len(all_signals),
        )

        return AgentResult(
            success=True,
            entities_found=0,
            signals_found=len(all_signals),
            errors=errors,
            data={
                "total_checked": total_checked,
                "changed_count": changed_count,
                "signals": all_signals,
                "signal_types": list({s["type"] for s in all_signals}),
            },
        )
