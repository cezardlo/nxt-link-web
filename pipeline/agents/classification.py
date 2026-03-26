"""Agent 2: Classification — classify signals by industry, type, region, importance."""

import re
import logging
from pipeline.config import (
    INDUSTRY_KEYWORDS,
    SIGNAL_TYPE_KEYWORDS,
    REGION_KEYWORDS,
    KNOWN_COMPANIES,
)
from pipeline.utils.db import get_db

logger = logging.getLogger("pipeline.classification")

# Pre-compile company patterns for fast matching
_COMPANY_PATTERNS = [(c, re.compile(r"\b" + re.escape(c) + r"\b", re.IGNORECASE)) for c in KNOWN_COMPANIES]


class ClassificationAgent:
    name = "classification"

    async def run(self) -> dict:
        db = get_db()

        # Load unclassified signals
        signals = db.select("intel_signals", {
            "select": "id,title,evidence,industry,signal_type,company",
            "importance_score": "eq.0",
            "order": "discovered_at.desc",
            "limit": "500",
        })

        if not signals:
            logger.info("No unclassified signals")
            return {"classified": 0}

        classified = 0
        for signal in signals:
            text = self._get_text(signal)
            text_lower = text.lower()

            updates = {}

            # ── Industry (rules) ──
            industry = self._classify_industry(text_lower)
            if industry:
                updates["industry"] = industry

            # ── Signal type (rules) ──
            signal_type = self._classify_signal_type(text_lower)
            if signal_type:
                updates["signal_type"] = signal_type

            # ── Company (pattern matching) ──
            company = self._extract_company(text)
            if company:
                updates["company"] = company

            # ── Region ──
            region = self._extract_region(text_lower)
            quality_flags = []
            if region:
                quality_flags.append(region)

            # ── Amount (regex) ──
            amount = self._extract_amount(text)
            if amount:
                updates["amount_usd"] = amount
                quality_flags.append("has_amount")

            # ── Importance score ──
            importance = self._score_importance(
                has_company=bool(company),
                has_amount=bool(amount),
                has_industry=bool(industry),
                has_signal_type=bool(signal_type),
                title_len=len(signal.get("title", "")),
            )
            updates["importance_score"] = importance
            updates["relevance_score"] = importance
            updates["confidence"] = min(importance + 0.2, 1.0)

            # ── Noise filter ──
            if importance < 0.15:
                updates["is_noise"] = True

            if quality_flags:
                updates["quality_flags"] = quality_flags

            # Write updates
            if updates:
                try:
                    db.update("intel_signals", updates, {"id": f"eq.{signal['id']}"})
                    classified += 1
                except Exception as e:
                    logger.warning(f"Update failed for {signal['id']}: {e}")

        logger.info(f"Classified {classified}/{len(signals)} signals")
        return {"classified": classified, "total": len(signals)}

    def _get_text(self, signal: dict) -> str:
        """Get searchable text from title + evidence."""
        parts = [signal.get("title", "")]
        evidence = signal.get("evidence") or []
        if isinstance(evidence, list):
            for e in evidence:
                if isinstance(e, dict):
                    parts.append(e.get("text", ""))
        return " ".join(parts)

    def _classify_industry(self, text: str) -> str | None:
        """Match industry by keyword density."""
        scores = {}
        for industry, keywords in INDUSTRY_KEYWORDS.items():
            count = sum(1 for kw in keywords if kw in text)
            if count > 0:
                scores[industry] = count
        if scores:
            return max(scores, key=scores.get)
        return None

    def _classify_signal_type(self, text: str) -> str | None:
        """Match signal type by keywords."""
        scores = {}
        for stype, keywords in SIGNAL_TYPE_KEYWORDS.items():
            count = sum(1 for kw in keywords if kw in text)
            if count > 0:
                scores[stype] = count
        if scores:
            return max(scores, key=scores.get)
        return None

    def _extract_company(self, text: str) -> str | None:
        """Match known companies in text."""
        for company, pattern in _COMPANY_PATTERNS:
            if pattern.search(text):
                return company
        return None

    def _extract_region(self, text: str) -> str | None:
        """Match region by keywords."""
        for region, keywords in REGION_KEYWORDS.items():
            for kw in keywords:
                if kw in text:
                    return region
        return None

    def _extract_amount(self, text: str) -> float | None:
        """Extract dollar amounts from text."""
        patterns = [
            r"\$(\d+(?:\.\d+)?)\s*(?:billion|B)\b",
            r"\$(\d+(?:\.\d+)?)\s*(?:million|M)\b",
            r"\$(\d[\d,]*(?:\.\d+)?)\b",
        ]
        for i, pat in enumerate(patterns):
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                val = float(m.group(1).replace(",", ""))
                if i == 0:  # billions
                    return val * 1_000_000_000
                elif i == 1:  # millions
                    return val * 1_000_000
                else:
                    return val
        return None

    def _score_importance(
        self,
        has_company: bool,
        has_amount: bool,
        has_industry: bool,
        has_signal_type: bool,
        title_len: int,
    ) -> float:
        """Simple rule-based importance score 0.0–1.0."""
        score = 0.1  # base
        if has_company:
            score += 0.25
        if has_amount:
            score += 0.20
        if has_industry:
            score += 0.20
        if has_signal_type:
            score += 0.15
        if title_len > 40:
            score += 0.05
        if title_len > 80:
            score += 0.05
        return min(score, 1.0)
