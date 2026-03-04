"""Industrial Scoring Agent — computes growth, automation, opportunity, and risk scores for vendors."""

from __future__ import annotations
import logging
from typing import Any

from ..base import BaseAgent, AgentResult

logger = logging.getLogger(__name__)

# ─── Keyword sets (mirrored from TypeScript industrial-scoring.ts) ────────────

GROWTH_TAG_KEYWORDS = [
    "expansion", "funding", "growth", "series", "venture", "investment",
    "scale", "hiring", "recruiting", "headcount", "workforce", "build-out",
    "new facility", "opening", "launched", "expanded",
]

AUTOMATION_TAG_KEYWORDS = [
    "ai", "artificial intelligence", "machine learning", "ml", "robotics",
    "autonomous", "automation", "computer vision", "nlp", "deep learning",
    "neural", "inference", "iot", "digital twin", "predictive", "sensor fusion",
    "unmanned", "uas", "drone",
]

OPPORTUNITY_EVIDENCE_KEYWORDS = [
    "contract", "award", "task order", "idiq", "sbir", "sttr", "grant",
    "government", "dod", "army", "cbp", "federal", "usaf", "navy",
    "solicitation", "rfp", "bpa", "bliss", "fort", "department", "agency",
]

RISK_EVIDENCE_KEYWORDS = [
    "lawsuit", "litigation", "layoff", "restructuring", "downgrade",
    "investigation", "breach", "penalty", "fine", "settled", "complaint",
    "bankruptcy", "acquired", "sunset", "discontinued", "cancelled",
]

GROWTH_EVIDENCE_KEYWORDS = [
    "funding", "expansion", "series a", "series b", "raised", "investment",
    "hired", "hiring", "+", "new office", "opened", "relocated", "grow",
]

# Category-based score boosts
CATEGORY_AUTOMATION_BOOST: dict[str, int] = {
    "Robotics": 35, "Warehousing": 30, "AI / ML": 28,
    "Manufacturing": 20, "Defense": 15, "Defense IT": 12,
    "Consulting": 8, "Fabrication": 25, "HVAC": 15,
}

CATEGORY_OPPORTUNITY_BOOST: dict[str, int] = {
    "Defense": 30, "Defense IT": 28, "Border Tech": 25,
    "Consulting": 20, "Logistics": 15, "Engineering": 18,
    "Energy": 10, "Water Tech": 8, "Fabrication": 15,
}


def _match_score(text: str, keywords: list[str]) -> int:
    """Count keyword hits in text (case-insensitive)."""
    lower = text.lower()
    return sum(1 for kw in keywords if kw in lower)


def _clamp(val: float, lo: int = 0, hi: int = 100) -> int:
    return max(lo, min(hi, round(val)))


def _grade(score: int) -> str:
    if score >= 80:
        return "A"
    if score >= 65:
        return "B"
    if score >= 50:
        return "C"
    if score >= 35:
        return "D"
    return "F"


def compute_vendor_scores(vendor: dict[str, Any]) -> dict[str, Any]:
    """Compute industrial scores for a single vendor. Pure function, no I/O."""
    tags_text = " ".join(vendor.get("tags", []))
    evidence_text = " ".join(vendor.get("evidence", []))
    iker = vendor.get("iker_score", 50)
    category = vendor.get("category", "")
    weight = vendor.get("weight", 0.5)
    confidence = vendor.get("confidence", 0.7)
    signals: list[str] = []

    # Growth score
    growth = (iker / 100) * 30
    tag_hits = _match_score(tags_text, GROWTH_TAG_KEYWORDS)
    if tag_hits:
        growth += min(25, tag_hits * 8)
        signals.append(f"{tag_hits} growth tag(s)")
    ev_hits = _match_score(evidence_text, GROWTH_EVIDENCE_KEYWORDS)
    if ev_hits:
        growth += min(30, ev_hits * 10)
        signals.append(f"Funding/expansion evidence ({ev_hits})")
    growth += weight * 15
    growth_score = _clamp(growth)

    # Automation score
    auto = CATEGORY_AUTOMATION_BOOST.get(category, 0)
    if auto:
        signals.append(f"{category} automation base")
    auto_tag_hits = _match_score(tags_text, AUTOMATION_TAG_KEYWORDS)
    if auto_tag_hits:
        auto += min(35, auto_tag_hits * 9)
        signals.append(f"{auto_tag_hits} automation tag(s)")
    auto_ev_hits = _match_score(evidence_text, AUTOMATION_TAG_KEYWORDS)
    if auto_ev_hits:
        auto += min(20, auto_ev_hits * 7)
    if iker >= 85:
        auto += 10
        signals.append("High IKER = tech leader")
    elif iker >= 70:
        auto += 5
    auto_score = _clamp(auto)

    # Opportunity score
    opp = CATEGORY_OPPORTUNITY_BOOST.get(category, 0)
    if opp:
        signals.append(f"{category} opportunity multiplier")
    opp_ev_hits = _match_score(evidence_text, OPPORTUNITY_EVIDENCE_KEYWORDS)
    if opp_ev_hits:
        opp += min(40, opp_ev_hits * 9)
        signals.append(f"{opp_ev_hits} contract/award signal(s)")
    opp += (iker / 100) * 20
    opp += confidence * 10
    opp_score = _clamp(opp)

    # Risk score
    risk = 20  # baseline
    risk_hits = _match_score(evidence_text, RISK_EVIDENCE_KEYWORDS)
    if risk_hits:
        risk += risk_hits * 20
        signals.append(f"{risk_hits} risk indicator(s)")
    if iker < 50:
        risk += 25
        signals.append("Low IKER (below 50)")
    elif iker < 65:
        risk += 12
    if confidence < 0.7:
        risk += 10
        signals.append("Low data confidence")
    risk_score = _clamp(risk)

    # Composite
    composite = _clamp(
        growth_score * 0.30 + auto_score * 0.25 + opp_score * 0.30 + (100 - risk_score) * 0.15
    )

    return {
        "vendor_id": vendor.get("id", ""),
        "vendor_name": vendor.get("name", ""),
        "category": category,
        "growth_score": growth_score,
        "automation_score": auto_score,
        "opportunity_score": opp_score,
        "risk_score": risk_score,
        "composite_score": composite,
        "grade": _grade(composite),
        "signals": signals[:5],
    }


class IndustrialScoringAgent(BaseAgent):
    """Computes industrial intelligence scores for all tracked vendors."""

    name = "industrial_scoring"
    description = "Rule-based growth, automation, opportunity, and risk scoring"
    group = "analysis"
    cadence_hours = 24  # daily

    async def run(self) -> AgentResult:
        # In production, load vendors from DB. For now, use seed data.
        sample_vendors: list[dict[str, Any]] = [
            {
                "id": "ep-l3harris", "name": "L3Harris Technologies", "category": "Defense",
                "tags": ["electronic warfare", "sensors", "C5ISR"],
                "evidence": ["$1.2B Fort Bliss contract"],
                "iker_score": 92, "weight": 0.92, "confidence": 0.95,
            },
            {
                "id": "ep-saic", "name": "SAIC", "category": "Defense IT",
                "tags": ["systems integration", "cloud", "cyber"],
                "evidence": ["AMCOM support contract"],
                "iker_score": 88, "weight": 0.85, "confidence": 0.90,
            },
        ]

        results: list[dict[str, Any]] = []
        for vendor in sample_vendors:
            scores = compute_vendor_scores(vendor)
            results.append(scores)
            self.logger.info(
                "Scored %s: composite=%d grade=%s",
                scores["vendor_name"],
                scores["composite_score"],
                scores["grade"],
            )

        return AgentResult(
            success=True,
            entities_found=0,
            signals_found=len(results),
            errors=[],
            data={
                "scored_vendors": results,
                "total_scored": len(results),
                "grade_distribution": {
                    g: sum(1 for r in results if r["grade"] == g)
                    for g in ["A", "B", "C", "D", "F"]
                },
            },
        )
