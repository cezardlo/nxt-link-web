"""
NXT//LINK Industry Observer — Understanding / Classifier Agent
Takes raw items and produces ClassifiedItem records with industry,
warehouse zone, technology category, signal type, and confidence.

3-tier approach:
  Tier 1 — Keyword rules (fast, no API cost)
  Tier 2 — Pattern matching for deployment signals
  Tier 3 — Gemini LLM (only for ambiguous items below threshold)
"""

import json
import logging
import os
import re
import time
from datetime import datetime
from typing import Any

import requests as http_requests

try:
    import spacy

    _nlp = spacy.load("en_core_web_sm")
    HAS_SPACY = True
except Exception:
    _nlp = None  # type: ignore[assignment]
    HAS_SPACY = False

from config import (
    CONFIDENCE_THRESHOLDS,
    GEMINI_MAX_TOKENS,
    GEMINI_MODEL,
    LLM_BUDGET,
    SIGNAL_TYPE_KEYWORDS,
    TECH_CATEGORIES,
    WAREHOUSE_ZONES,
)
from models import ClassifiedItem, RawItem, get_session

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
LLM_CALL_COUNTER: int = 0  # module-level daily counter (reset on process restart)

# ─── Tier 1: Keyword Rule Tables ─────────────────────────────────────────────

ZONE_KEYWORDS: dict[str, list[str]] = {
    "receiving": [
        "receiving", "inbound", "dock", "unloading", "goods receipt", "purchase order",
        "delivery appointment", "advanced ship notice", "asn",
    ],
    "storage": [
        "storage", "racking", "shelving", "asrs", "automated storage", "pallet",
        "bin", "slot", "location", "replenishment",
    ],
    "picking": [
        "picking", "pick list", "wave picking", "zone picking", "batch picking",
        "goods to person", "put-to-light", "pick to light", "voice picking",
    ],
    "packing": [
        "packing", "pack station", "kitting", "void fill", "dimensioning",
        "cartonization", "box erection", "sealing",
    ],
    "shipping": [
        "shipping", "parcel", "carrier", "label printing", "manifesting",
        "last mile", "dispatch", "outbound",
    ],
    "inventory": [
        "inventory", "cycle count", "stocktake", "rfid", "barcode",
        "wms", "stock level", "reorder point", "safety stock",
    ],
}

TECH_KEYWORDS: dict[str, list[str]] = {
    "AI/ML": [
        "artificial intelligence", "machine learning", "deep learning", "neural network",
        "nlp", "natural language", "computer vision", "generative ai", "llm",
        "large language model", "edge ai", "mlops",
    ],
    "Robotics & Automation": [
        "robot", "cobot", "amr", "agv", "autonomous mobile robot", "pick and place",
        "robotic arm", "automation", "rpa", "robotic process",
    ],
    "IoT & Sensors": [
        "iot", "sensor", "telematics", "connected device", "edge computing",
        "mqtt", "opcua", "smart device", "asset tracking",
    ],
    "Warehouse Management Systems": [
        "wms", "warehouse management", "slotting", "order management",
        "labor management", "yard management",
    ],
    "Transportation Management Systems": [
        "tms", "transportation management", "load planning", "freight audit",
        "carrier selection", "route optimization",
    ],
    "ERP & Integrations": [
        "erp", "sap", "oracle", "microsoft dynamics", "integration", "api",
        "middleware", "edi", "enterprise resource",
    ],
    "Computer Vision": [
        "computer vision", "image recognition", "object detection", "camera",
        "visual inspection", "optical", "lidar",
    ],
    "Predictive Analytics": [
        "predictive", "forecast", "demand planning", "prescriptive",
        "analytics", "dashboard", "bi ", "business intelligence",
    ],
    "Autonomous Vehicles": [
        "autonomous vehicle", "self-driving", "driverless", "av ", "uav",
        "drone", "unmanned",
    ],
    "Cybersecurity": [
        "cybersecurity", "zero trust", "endpoint", "siem", "threat",
        "vulnerability", "identity", "access management", "soc",
    ],
    "Defense Systems": [
        "defense", "military", "army", "navy", "air force", "missile", "radar",
        "isr", "c4isr", "electronic warfare", "counter-uas",
    ],
    "Border Technology": [
        "border", "customs", "cbp", "biometric", "cargo scanning", "port of entry",
        "global entry", "tsa",
    ],
    "Energy Management": [
        "energy management", "smart grid", "battery storage", "solar", "microgrid",
        "demand response", "ev charging", "power analytics",
    ],
    "Healthcare Technology": [
        "telemedicine", "ehr", "emr", "medical device", "patient monitoring",
        "health it", "clinical decision", "interoperability",
    ],
    "Supply Chain Visibility": [
        "supply chain visibility", "track and trace", "shipment tracking",
        "control tower", "event management",
    ],
    "Route Optimization": [
        "route optimization", "last mile", "delivery route", "vrp",
        "vehicle routing", "fleet routing",
    ],
    "Fleet Management": [
        "fleet management", "eld", "telematics", "gps tracking", "driver behavior",
        "fuel management",
    ],
    "Additive Manufacturing": [
        "3d printing", "additive manufacturing", "fused deposition",
        "stereolithography", "metal printing",
    ],
    "Digital Twin": [
        "digital twin", "simulation", "virtual model", "cyber physical",
    ],
    "Augmented Reality": [
        "augmented reality", "ar ", "mixed reality", "smart glasses",
        "wearable", "heads-up display",
    ],
}

DEPLOYMENT_VERB_PATTERN = re.compile(
    r"\b(deploys?|implements?|selects?|adopts?|launches?|rolls? out|integrates?|"
    r"installs?|partners? with|contracts?|awards?|chooses?|purchases?|signs?|"
    r"chooses?|wins?|procures?)\b",
    re.IGNORECASE,
)


# ─── Tier 1: Keyword Scoring ──────────────────────────────────────────────────

def _score_zones(text: str) -> dict[str, float]:
    """Return confidence scores per warehouse zone."""
    text_lower = text.lower()
    scores: dict[str, float] = {}
    for zone, keywords in ZONE_KEYWORDS.items():
        hits = sum(1 for kw in keywords if kw in text_lower)
        if hits:
            scores[zone] = min(1.0, hits / max(len(keywords) * 0.3, 1))
    return scores


def _score_technologies(text: str) -> dict[str, float]:
    """Return confidence scores per technology category."""
    text_lower = text.lower()
    scores: dict[str, float] = {}
    for tech, keywords in TECH_KEYWORDS.items():
        hits = sum(1 for kw in keywords if kw in text_lower)
        if hits:
            scores[tech] = min(1.0, hits / max(len(keywords) * 0.25, 1))
    return scores


def _top_key(scores: dict[str, float]) -> tuple[str | None, float]:
    """Return (key, score) for the highest-scoring entry, or (None, 0)."""
    if not scores:
        return None, 0.0
    key = max(scores, key=scores.__getitem__)
    return key, scores[key]


# ─── Tier 2: Pattern Matching ─────────────────────────────────────────────────

def classify_signal_type(text: str) -> tuple[str | None, float]:
    """
    Classify the signal type (case_study / product_launch / partnership /
    funding / research) using keyword pattern matching.

    Returns (signal_type, confidence).
    """
    text_lower = text.lower()
    best_type: str | None = None
    best_score: float = 0.0

    for signal_type, keywords in SIGNAL_TYPE_KEYWORDS.items():
        hits = sum(1 for kw in keywords if kw in text_lower)
        if hits:
            score = min(1.0, hits / max(len(keywords) * 0.3, 1))
            if score > best_score:
                best_score = score
                best_type = signal_type

    # Boost if deployment verb is present
    if DEPLOYMENT_VERB_PATTERN.search(text):
        best_score = min(1.0, best_score + 0.15)

    return best_type, best_score


# ─── Tier 2: Entity Extraction ────────────────────────────────────────────────

_CAPITALIZED_RE = re.compile(r"[A-Z][a-zA-Z&\-\.]{1,30}(?:\s+[A-Z][a-zA-Z&\-\.]{1,30}){0,3}")
_NOISE_WORDS = {
    "the", "and", "for", "with", "from", "that", "this", "they", "their",
    "our", "your", "its", "how", "what", "when", "where", "why", "who",
    "which", "will", "can", "has", "have", "had", "are", "was", "were",
    "but", "not", "also", "more", "new", "inc", "llc", "ltd", "corp",
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
    "january", "february", "march", "april", "june", "july", "august",
    "september", "october", "november", "december",
}


def extract_entities(text: str) -> dict[str, list[str]]:
    """
    Extract company, vendor, and product names from *text*.

    Uses spaCy NER if available; falls back to capitalized n-gram heuristics.
    Returns {"companies": [...], "vendors": [...], "products": [...]}.
    """
    companies: list[str] = []
    products: list[str] = []

    if HAS_SPACY and _nlp is not None:
        doc = _nlp(text[:10000])  # spaCy has a default token limit
        for ent in doc.ents:
            if ent.label_ == "ORG" and ent.text.lower() not in _NOISE_WORDS:
                companies.append(ent.text.strip())
            elif ent.label_ == "PRODUCT":
                products.append(ent.text.strip())
    else:
        # Heuristic fallback: capitalized noun phrases
        matches = _CAPITALIZED_RE.findall(text)
        for m in matches:
            word = m.strip()
            if len(word) > 3 and word.lower() not in _NOISE_WORDS:
                companies.append(word)

    # Deduplicate while preserving order
    def _dedup(lst: list[str]) -> list[str]:
        seen: set[str] = set()
        out: list[str] = []
        for item in lst:
            key = item.lower()
            if key not in seen:
                seen.add(key)
                out.append(item)
        return out

    return {
        "companies": _dedup(companies)[:15],
        "vendors": [],        # populated by extractor after fuzzy matching
        "products": _dedup(products)[:10],
    }


# ─── Tier 3: Gemini LLM ───────────────────────────────────────────────────────

def _call_gemini(prompt: str) -> dict[str, Any] | None:
    """
    Send a prompt to Gemini and return parsed JSON.
    Respects LLM_BUDGET.max_calls_per_day.
    """
    global LLM_CALL_COUNTER  # noqa: PLW0603

    if not GEMINI_API_KEY:
        logger.debug("No GEMINI_API_KEY — skipping LLM call")
        return None

    if LLM_CALL_COUNTER >= LLM_BUDGET["max_calls_per_day"]:
        logger.warning("LLM daily budget exhausted (%d calls)", LLM_CALL_COUNTER)
        return None

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
    )
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "maxOutputTokens": GEMINI_MAX_TOKENS,
        },
    }

    try:
        resp = http_requests.post(url, json=payload, timeout=20)
        resp.raise_for_status()
        LLM_CALL_COUNTER += 1
        data = resp.json()
        raw_text = (
            data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "")
        )
        return json.loads(raw_text)
    except Exception as exc:
        logger.warning("Gemini call failed: %s", exc)
        return None


def _gemini_classify(title: str, text_snippet: str) -> dict[str, Any] | None:
    """
    Ask Gemini to classify a single ambiguous article.
    Returns a dict with keys: industry, warehouse_zone, technology, signal_type, confidence.
    """
    tech_list = ", ".join(TECH_CATEGORIES)
    zone_list = ", ".join(WAREHOUSE_ZONES)

    prompt = f"""Classify this article about industrial technology.

Title: {title}
Excerpt: {text_snippet[:600]}

Return JSON with exactly these keys:
- industry: one of [logistics, manufacturing, energy, cybersecurity, defense, healthcare, border-tech, ai-ml, general]
- warehouse_zone: one of [{zone_list}] or null
- technology: one of [{tech_list}] or null
- signal_type: one of [case_study, product_launch, partnership, funding, research] or null
- confidence: float 0.0 to 1.0

Respond with JSON only."""

    return _call_gemini(prompt)


# ─── Main Classification Entry Point ─────────────────────────────────────────

def classify_item(raw_item: RawItem) -> ClassifiedItem | None:
    """
    Classify a single RawItem through the 3-tier pipeline.

    Returns a ClassifiedItem (not yet committed to DB) or None on error.
    """
    text = (raw_item.text or "")
    title = (raw_item.title or "")
    combined = f"{title} {text}"

    # ── Tier 1: Keyword scoring ────────────────────────────────────────────────
    zone_scores = _score_zones(combined)
    tech_scores = _score_technologies(combined)
    top_zone, zone_conf = _top_key(zone_scores)
    top_tech, tech_conf = _top_key(tech_scores)
    signal_type, signal_conf = classify_signal_type(combined)

    # Overall confidence from strongest signal
    tier1_conf = max(zone_conf, tech_conf, signal_conf)

    # ── Tier 2: Pattern matching already done inside classify_signal_type ──────
    # Deployment verb presence was already factored into signal_conf

    # ── Tier 3: Gemini for ambiguous items ────────────────────────────────────
    industry: str | None = None
    if tier1_conf < CONFIDENCE_THRESHOLDS["weak_mention"]:
        logger.debug("Low confidence (%.2f) for item %d — calling Gemini", tier1_conf, raw_item.id)
        gemini_result = _gemini_classify(title, text[:800])
        if gemini_result:
            industry = gemini_result.get("industry")
            top_zone = gemini_result.get("warehouse_zone") or top_zone
            top_tech = gemini_result.get("technology") or top_tech
            signal_type = gemini_result.get("signal_type") or signal_type
            tier1_conf = float(gemini_result.get("confidence", tier1_conf))
            logger.info(
                "Gemini classified item %d: %s conf=%.2f", raw_item.id, industry, tier1_conf
            )
        time.sleep(0.3)  # brief pause after LLM call

    return ClassifiedItem(
        raw_item_id=raw_item.id,
        industry=industry,
        warehouse_zone=top_zone,
        technology=top_tech,
        signal_type=signal_type,
        confidence=round(tier1_conf, 4),
        extracted_at=datetime.utcnow(),
    )


# ─── Batch Classification ─────────────────────────────────────────────────────

def classify_pending_items(batch_size: int = 50) -> int:
    """
    Classify all unprocessed RawItems in the DB.
    Marks each RawItem.processed = True after classification.

    Returns the number of items classified.
    """
    session = get_session()
    classified_count = 0

    try:
        pending = (
            session.query(RawItem)
            .filter(RawItem.processed == False)  # noqa: E712
            .limit(batch_size)
            .all()
        )
        logger.info("Classifying %d pending items", len(pending))

        for raw_item in pending:
            try:
                classified = classify_item(raw_item)
                if classified:
                    session.add(classified)
                raw_item.processed = True
                classified_count += 1
            except Exception as exc:
                logger.error("Error classifying item %d: %s", raw_item.id, exc)
                raw_item.processed = True  # mark processed to avoid retry loop

        session.commit()
        logger.info("Classified %d items", classified_count)

    except Exception as exc:
        session.rollback()
        logger.error("Batch classification error: %s", exc)
    finally:
        session.close()

    return classified_count


# ─── Entrypoint ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    from models import init_db
    init_db()
    classify_pending_items()
