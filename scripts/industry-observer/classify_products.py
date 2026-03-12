#!/usr/bin/env python3
"""
NXT LINK Industry Observer — Product Classification
Takes ingested articles, classifies extracted facts into industry areas.
Optional Gemini API enrichment for low-confidence classifications.
Outputs classified_products.json
"""

import json
import os
import time
from pathlib import Path
from datetime import datetime

INPUT_PATH = Path(__file__).parent / "output" / "ingested_articles.json"
OUTPUT_DIR = Path(__file__).parent / "output"

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")

# ─── Industry area keywords ───────────────────────────────────────────────────

AREA_KEYWORDS: dict[str, list[str]] = {
    "Route Optimization":         ["route", "dispatch", "fleet", "delivery", "routing", "miles", "logistics"],
    "Supply Chain Visibility":    ["visibility", "tracking", "traceability", "shipment", "logistics", "supply chain"],
    "AI Analytics":               ["analytics", "ai", "machine learning", "forecast", "intelligence", "prediction"],
    "Workflow Automation":        ["automation", "workflow", "manual", "orchestration", "process", "rpa"],
    "Predictive Maintenance":     ["maintenance", "downtime", "repair", "asset", "predictive", "condition"],
    "Energy Management":          ["energy", "electricity", "power", "grid", "demand", "solar", "battery"],
    "Water Management":           ["water", "leak", "filtration", "wastewater", "gallons"],
    "Cybersecurity":              ["security", "cyber", "threat", "vulnerability", "identity", "zero trust"],
    "Defense Systems":            ["defense", "military", "army", "missile", "radar", "surveillance"],
    "Border Technology":          ["border", "customs", "cbp", "biometric", "scanning", "cargo"],
    "Manufacturing Tech":         ["manufacturing", "factory", "cnc", "3d printing", "cobot", "assembly"],
    "Healthcare Tech":            ["health", "telemedicine", "ehr", "medical", "patient", "clinical"],
    "Warehouse Automation":       ["warehouse", "picking", "asrs", "conveyor", "goods-to-person", "fulfillment"],
    "Fleet Management":           ["fleet", "telematics", "gps", "eld", "vehicle", "truck"],
}

CONFIDENCE_THRESHOLD = 0.4  # below this → send to Gemini


def classify_article(article: dict) -> dict:
    """Classify an article's facts into industry areas using keywords."""
    facts = article.get("extracted_facts", {})
    text_blob = " ".join([
        article.get("title", ""),
        article.get("summary", ""),
        " ".join(facts.get("product_mentions", [])),
        " ".join(facts.get("problems_addressed", [])),
    ]).lower()

    # Score each area
    area_scores: dict[str, float] = {}
    for area, keywords in AREA_KEYWORDS.items():
        hits = sum(1 for kw in keywords if kw in text_blob)
        if hits > 0:
            area_scores[area] = min(1.0, hits / len(keywords) * 2)

    # Pick top areas
    sorted_areas = sorted(area_scores.items(), key=lambda x: x[1], reverse=True)
    top_areas = [(area, score) for area, score in sorted_areas if score >= 0.15][:3]

    confidence = max((s for _, s in top_areas), default=0)

    return {
        "url": article.get("url", ""),
        "title": article.get("title", ""),
        "domain": article.get("domain", ""),
        "companies": facts.get("companies", []),
        "product_mentions": facts.get("product_mentions", []),
        "problems_addressed": facts.get("problems_addressed", []),
        "classified_areas": [{"area": a, "score": round(s, 2)} for a, s in top_areas],
        "confidence": round(confidence, 2),
        "needs_gemini": confidence < CONFIDENCE_THRESHOLD,
        "publish_date": article.get("publish_date"),
    }


def enrich_with_gemini(items: list[dict]) -> list[dict]:
    """Send low-confidence items to Gemini for better classification."""
    if not GEMINI_API_KEY:
        print("  [!] No GEMINI_API_KEY set — skipping LLM enrichment")
        return items

    import requests as req

    # Batch in groups of 10
    batch_size = 10
    enriched = []

    for i in range(0, len(items), batch_size):
        batch = items[i:i + batch_size]
        headlines = "\n".join(
            f"{j+1}. {item['title']} — Companies: {', '.join(item['companies'][:3])}"
            for j, item in enumerate(batch)
        )

        prompt = f"""Classify these articles into industry areas. For each, return:
- area: the primary industry area (one of: {', '.join(AREA_KEYWORDS.keys())})
- confidence: 0.0 to 1.0

Return JSON array: [{{"index": 1, "area": "...", "confidence": 0.8}}]

Articles:
{headlines}"""

        try:
            resp = req.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}",
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"responseMimeType": "application/json"},
                },
                timeout=15,
            )
            if resp.status_code == 200:
                data = resp.json()
                text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                results = json.loads(text)
                for r in results:
                    idx = r.get("index", 0) - 1
                    if 0 <= idx < len(batch):
                        batch[idx]["classified_areas"] = [{"area": r["area"], "score": r.get("confidence", 0.6)}]
                        batch[idx]["confidence"] = r.get("confidence", 0.6)
                        batch[idx]["needs_gemini"] = False
                        batch[idx]["enriched_by"] = "gemini"
        except Exception as e:
            print(f"  [!] Gemini error: {e}")

        enriched.extend(batch)
        time.sleep(1)

    return enriched


def run_classification():
    """Main classification loop."""
    if not INPUT_PATH.exists():
        print(f"[!] No ingested articles at {INPUT_PATH}")
        print("    Run ingest_articles.py first.")
        return

    with open(INPUT_PATH) as f:
        data = json.load(f)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    all_classified: dict[str, list[dict]] = {}
    needs_gemini_count = 0

    for slug, articles in data.get("industries", {}).items():
        print(f"\n  Classifying {slug}: {len(articles)} articles")

        classified = [classify_article(a) for a in articles]

        # Separate high and low confidence
        low_conf = [c for c in classified if c["needs_gemini"]]
        high_conf = [c for c in classified if not c["needs_gemini"]]

        print(f"    High confidence: {len(high_conf)}, needs Gemini: {len(low_conf)}")
        needs_gemini_count += len(low_conf)

        # Enrich low-confidence with Gemini
        if low_conf:
            low_conf = enrich_with_gemini(low_conf)

        all_classified[slug] = high_conf + low_conf

    # Write output
    output_path = OUTPUT_DIR / "classified_products.json"
    with open(output_path, "w") as f:
        json.dump({
            "classified_at": datetime.utcnow().isoformat(),
            "total_classified": sum(len(c) for c in all_classified.values()),
            "gemini_enriched": needs_gemini_count,
            "industries": all_classified,
        }, f, indent=2)

    total = sum(len(c) for c in all_classified.values())
    print(f"\nDone! {total} articles classified → {output_path}")


if __name__ == "__main__":
    run_classification()
