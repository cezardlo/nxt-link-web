"""
NXT//LINK Industry Observer — Extraction Agent
Converts classified items into structured Deployment, Product, and Milestone records.

Pattern-first approach; optional Gemini call for complex paragraphs.
"""

import json
import logging
import os
import re
import time
from datetime import datetime
from typing import Any

import requests as http_requests
from rapidfuzz import fuzz, process as fuzz_process

from config import (
    CONFIDENCE_THRESHOLDS,
    DEPLOYMENT_VERBS,
    ENTITY_FUZZY_THRESHOLD,
    GEMINI_MAX_TOKENS,
    GEMINI_MODEL,
    LLM_BUDGET,
    TECH_CATEGORIES,
    WAREHOUSE_ZONES,
)
from models import (
    ClassifiedItem,
    Deployment,
    EntityAlias,
    Milestone,
    Product,
    RawItem,
    get_session,
)

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
LLM_CALL_COUNTER: int = 0

# ─── Known Entities (in-memory; grown by learner.py) ─────────────────────────

KNOWN_VENDORS: list[str] = [
    "Manhattan Associates", "Blue Yonder", "Körber", "Infor", "Oracle WMS",
    "SAP EWM", "Tecsys", "SnapFulfil", "Deposco", "Softeon",
    "Locus Robotics", "6 River Systems", "Geek+", "Berkshire Grey", "Symbotic",
    "AutoStore", "Swisslog", "Dematic", "Vanderlande", "Knapp",
    "Zebra Technologies", "Honeywell Intelligrated", "Datalogic", "SATO",
    "CrowdStrike", "Palo Alto Networks", "Fortinet", "SentinelOne", "Darktrace",
    "Palantir", "Anduril", "L3Harris", "Raytheon", "Leidos", "SAIC",
    "GE Vernova", "Eaton", "Schneider Electric", "Itron", "Landis+Gyr",
    "Epic Systems", "Cerner", "Allscripts", "athenahealth", "Veradigm",
]

KNOWN_COMPANIES: list[str] = [
    "Amazon", "Walmart", "FedEx", "UPS", "DHL", "XPO Logistics",
    "Target", "Home Depot", "Costco", "Kroger", "Albertsons",
    "Ford", "GM", "Tesla", "Boeing", "Lockheed Martin", "Northrop Grumman",
    "Chevron", "ExxonMobil", "BP", "Shell", "NextEra Energy",
    "HCA Healthcare", "Tenet Health", "CommonSpirit", "Ascension",
]

# ─── Regex Patterns ───────────────────────────────────────────────────────────

# "Company deploys / selects / implements VendorProduct for UseCase"
_DEPLOYMENT_RE = re.compile(
    r"([A-Z][A-Za-z\s&,\.]{2,60}?)\s+"
    r"(?:deploys?|implements?|selects?|adopts?|rolls? out|integrates?|"
    r"partners? with|contracts?|chooses?|purchases?|awards?)\s+"
    r"([A-Z][A-Za-z\s&\.]{2,60}?)(?:\s+for\s+(.{10,120}))?[\.;,]",
    re.IGNORECASE,
)

_YEAR_RE = re.compile(r"\b(20[12]\d)\b")

_RESULT_PHRASES = re.compile(
    r"(?:redu[cing|ed]+|improv[ing|ed]+|increas[ing|ed]+|sav[ing|ed]+|achiev[ing|ed]+|"
    r"decreas[ing|ed]+|boost[ing|ed]+|cut[ting]?|eliminat[ing|ed]+)\s"
    r"[^.]{0,120}[%\d]",
    re.IGNORECASE,
)

_PRICE_BAND_RE = re.compile(
    r"\$(\d[\d,\.]*[MBK]?)\b",
    re.IGNORECASE,
)


# ─── Fuzzy Name Matching ──────────────────────────────────────────────────────

def _fuzzy_match_entity(
    name: str, candidates: list[str], threshold: float = ENTITY_FUZZY_THRESHOLD
) -> str | None:
    """
    Return the best fuzzy match for *name* in *candidates* if above threshold.
    Uses RapidFuzz token_sort_ratio for partial matching.
    """
    if not candidates or not name:
        return None
    result = fuzz_process.extractOne(
        name, candidates, scorer=fuzz.token_sort_ratio
    )
    if result and result[1] >= threshold:
        return result[0]
    return None


def _resolve_vendor(name: str, session: Any) -> str:
    """
    Resolve a raw vendor name to its canonical form using EntityAlias table
    and in-memory KNOWN_VENDORS list.
    """
    # Check DB aliases first
    alias_row = (
        session.query(EntityAlias)
        .filter(
            EntityAlias.alias.ilike(f"%{name}%"),
            EntityAlias.entity_type == "vendor",
        )
        .first()
    )
    if alias_row:
        return alias_row.canonical_name

    # Fuzzy match against known vendors
    matched = _fuzzy_match_entity(name, KNOWN_VENDORS)
    return matched if matched else name


def _resolve_company(name: str, session: Any) -> str:
    """Resolve a raw company name to canonical form."""
    alias_row = (
        session.query(EntityAlias)
        .filter(
            EntityAlias.alias.ilike(f"%{name}%"),
            EntityAlias.entity_type == "company",
        )
        .first()
    )
    if alias_row:
        return alias_row.canonical_name

    matched = _fuzzy_match_entity(name, KNOWN_COMPANIES)
    return matched if matched else name


# ─── Gemini Helper ────────────────────────────────────────────────────────────

def _call_gemini_extract(text_snippet: str, schema_hint: str) -> dict[str, Any] | None:
    """
    Send a complex paragraph to Gemini for structured extraction.
    schema_hint describes the JSON shape expected.
    """
    global LLM_CALL_COUNTER  # noqa: PLW0603

    if not GEMINI_API_KEY or LLM_CALL_COUNTER >= LLM_BUDGET["max_calls_per_day"]:
        return None

    prompt = f"""Extract structured information from this text.

Text:
{text_snippet[:800]}

Return JSON matching this schema:
{schema_hint}

Respond with JSON only. Use null for unknown fields."""

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
    )
    try:
        resp = http_requests.post(
            url,
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "responseMimeType": "application/json",
                    "maxOutputTokens": GEMINI_MAX_TOKENS,
                },
            },
            timeout=20,
        )
        resp.raise_for_status()
        LLM_CALL_COUNTER += 1
        raw = (
            resp.json()
            .get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "")
        )
        return json.loads(raw)
    except Exception as exc:
        logger.warning("Gemini extraction call failed: %s", exc)
        return None


# ─── Deployment Extraction ────────────────────────────────────────────────────

def extract_deployment(classified_item: ClassifiedItem) -> Deployment | None:
    """
    Build a Deployment record from a ClassifiedItem.

    Uses regex first; falls back to Gemini for high-confidence items
    that the regex could not fully parse.
    """
    session = get_session()
    try:
        raw_item: RawItem | None = session.get(RawItem, classified_item.raw_item_id)
        if not raw_item:
            return None

        text = (raw_item.text or "") + " " + (raw_item.title or "")

        # ── Regex extraction ───────────────────────────────────────────────────
        match = _DEPLOYMENT_RE.search(text)
        company_raw: str | None = None
        vendor_raw: str | None = None
        use_case: str | None = None

        if match:
            company_raw = match.group(1).strip()
            vendor_raw = match.group(2).strip()
            use_case = match.group(3).strip() if match.group(3) else None

        # Year
        year_match = _YEAR_RE.search(text)
        year = int(year_match.group(1)) if year_match else None

        # Results
        results_match = _RESULT_PHRASES.search(text)
        results = results_match.group(0).strip() if results_match else None

        # ── Resolve canonical names ────────────────────────────────────────────
        company = _resolve_company(company_raw, session) if company_raw else None
        vendor = _resolve_vendor(vendor_raw, session) if vendor_raw else None

        # ── Gemini fallback for complex paragraphs ─────────────────────────────
        if (
            not company
            and classified_item.confidence >= CONFIDENCE_THRESHOLDS["news_mention"]
        ):
            schema = json.dumps(
                {
                    "company_name": "string or null",
                    "vendor": "string or null",
                    "product": "string or null",
                    "use_case": "string or null",
                    "location": "string or null",
                    "year": "integer or null",
                    "results": "string or null",
                }
            )
            gemini_data = _call_gemini_extract(text[:800], schema)
            if gemini_data:
                company = gemini_data.get("company_name") or company
                vendor = gemini_data.get("vendor") or vendor
                use_case = gemini_data.get("use_case") or use_case
                year = gemini_data.get("year") or year
                results = gemini_data.get("results") or results
            time.sleep(0.3)

        if not company and not vendor:
            return None

        return Deployment(
            classified_item_id=classified_item.id,
            company_name=company,
            vendor=vendor,
            product=None,  # extractor refines in a second pass if needed
            technology=classified_item.technology,
            warehouse_zone=classified_item.warehouse_zone,
            use_case=use_case,
            location=None,
            year=year,
            results=results,
            source_url=raw_item.url,
            confidence=classified_item.confidence,
        )
    finally:
        session.close()


# ─── Product Extraction ───────────────────────────────────────────────────────

def extract_product(classified_item: ClassifiedItem) -> Product | None:
    """
    Build a Product record from a ClassifiedItem (usually a product_launch signal).
    """
    session = get_session()
    try:
        raw_item: RawItem | None = session.get(RawItem, classified_item.raw_item_id)
        if not raw_item:
            return None

        text = (raw_item.text or "") + " " + (raw_item.title or "")
        title = raw_item.title or ""

        # Try Gemini for product launches
        product_name: str | None = None
        vendor: str | None = None
        use_cases: list[str] = []
        warehouse_zones: list[str] = []

        if classified_item.confidence >= CONFIDENCE_THRESHOLDS["partner_page"]:
            schema = json.dumps(
                {
                    "product_name": "string or null",
                    "vendor": "string or null",
                    "use_cases": ["string"],
                    "warehouse_zones": [f"one of {WAREHOUSE_ZONES} or null"],
                    "price_band": "one of [budget, mid-market, enterprise] or null",
                    "maturity": "one of [emerging, growing, mature, legacy] or null",
                }
            )
            gemini_data = _call_gemini_extract(text[:800], schema)
            if gemini_data:
                product_name = gemini_data.get("product_name")
                vendor = gemini_data.get("vendor")
                use_cases = gemini_data.get("use_cases", [])
                wz_raw = gemini_data.get("warehouse_zones", [])
                warehouse_zones = [
                    z for z in (wz_raw if isinstance(wz_raw, list) else [wz_raw])
                    if z and z in WAREHOUSE_ZONES
                ]
            time.sleep(0.3)

        # Fallback to title as product name
        if not product_name:
            product_name = title[:200] or "Unknown Product"

        p = Product(
            classified_item_id=classified_item.id,
            name=product_name,
            vendor=vendor,
            category=classified_item.technology,
            maturity_score=classified_item.confidence,
        )
        p.use_cases = use_cases
        p.warehouse_zones = warehouse_zones
        p.proof_links = [raw_item.url] if raw_item.url else []
        p.integrations = []
        return p
    finally:
        session.close()


# ─── Milestone Extraction ─────────────────────────────────────────────────────

def extract_milestone(classified_item: ClassifiedItem) -> Milestone | None:
    """
    Build a Milestone record from a ClassifiedItem (usually research or funding signals).
    """
    session = get_session()
    try:
        raw_item: RawItem | None = session.get(RawItem, classified_item.raw_item_id)
        if not raw_item:
            return None

        text = (raw_item.text or "")
        title = raw_item.title or "Unknown milestone"

        year_match = _YEAR_RE.search(text)
        date_str: str | None = (
            raw_item.published_at.strftime("%Y-%m-%d")
            if raw_item.published_at
            else (year_match.group(1) if year_match else None)
        )

        milestone = Milestone(
            classified_item_id=classified_item.id,
            tech_timeline=classified_item.technology,
            date=date_str,
            title=title[:500],
            summary=text[:500] if text else None,
        )
        milestone.evidence_urls = [raw_item.url] if raw_item.url else []
        return milestone
    finally:
        session.close()


# ─── Batch Extraction ─────────────────────────────────────────────────────────

def extract_all_pending(batch_size: int = 50) -> dict[str, int]:
    """
    Run extraction on all ClassifiedItems that have no associated Deployment,
    Product, or Milestone yet.

    Returns counts: {"deployments": N, "products": N, "milestones": N}.
    """
    session = get_session()
    counts: dict[str, int] = {"deployments": 0, "products": 0, "milestones": 0}

    try:
        items = (
            session.query(ClassifiedItem)
            .filter(ClassifiedItem.confidence > CONFIDENCE_THRESHOLDS["weak_mention"])
            .limit(batch_size)
            .all()
        )
        logger.info("Extracting from %d classified items", len(items))

        for item in items:
            signal = item.signal_type

            if signal in ("case_study", "partnership") or signal is None:
                dep = extract_deployment(item)
                if dep:
                    session.add(dep)
                    counts["deployments"] += 1

            if signal == "product_launch":
                prod = extract_product(item)
                if prod:
                    session.add(prod)
                    counts["products"] += 1

            if signal in ("research", "funding"):
                ms = extract_milestone(item)
                if ms:
                    session.add(ms)
                    counts["milestones"] += 1

        session.commit()
        logger.info("Extraction complete: %s", counts)

    except Exception as exc:
        session.rollback()
        logger.error("Batch extraction error: %s", exc)
    finally:
        session.close()

    return counts


# ─── Entrypoint ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    from models import init_db
    init_db()
    result = extract_all_pending()
    print("Extraction result:", result)
