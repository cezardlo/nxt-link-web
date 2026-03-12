from __future__ import annotations

from datetime import date, datetime, timezone
from uuid import uuid4

from sqlalchemy import text

from app.db import SessionLocal


SOURCES = [
    {
        "source_id": "10000000-0000-0000-0000-000000000001",
        "name": "MIT News AI + Industry",
        "base_url": "https://news.mit.edu/topic/artificial-intelligence2",
        "category": "news",
        "crawl_method": "rss",
        "freq": 15,
        "rate": 20,
        "render_js": False,
        "reliability": 0.94,
    },
    {
        "source_id": "10000000-0000-0000-0000-000000000002",
        "name": "USPTO Bulk Patent Feed",
        "base_url": "https://developer.uspto.gov/",
        "category": "patents",
        "crawl_method": "api",
        "freq": 60,
        "rate": 15,
        "render_js": False,
        "reliability": 0.91,
    },
    {
        "source_id": "10000000-0000-0000-0000-000000000003",
        "name": "LinkedIn Jobs Industry Signals",
        "base_url": "https://www.linkedin.com/jobs/",
        "category": "jobs",
        "crawl_method": "search-page",
        "freq": 30,
        "rate": 25,
        "render_js": True,
        "reliability": 0.83,
    },
    {
        "source_id": "10000000-0000-0000-0000-000000000004",
        "name": "GitHub Industrial AI Pulse",
        "base_url": "https://github.com/trending",
        "category": "github",
        "crawl_method": "api",
        "freq": 30,
        "rate": 30,
        "render_js": False,
        "reliability": 0.88,
    },
    {
        "source_id": "10000000-0000-0000-0000-000000000005",
        "name": "Hannover Messe Exhibitor Directory",
        "base_url": "https://www.hannovermesse.de/en/",
        "category": "exhibitor",
        "crawl_method": "html",
        "freq": 120,
        "rate": 10,
        "render_js": True,
        "reliability": 0.79,
    },
]


TRUTH_CARDS = [
    {
        "truth_card_id": "20000000-0000-0000-0000-000000000001",
        "source_id": SOURCES[0]["source_id"],
        "vendor_name": "OptiRoute Dynamics",
        "industry": "Logistics",
        "problem": "Manual paperwork",
        "solution": "Workflow automation",
        "capabilities": ["Dynamic route optimization", "Dispatch automation", "ETA prediction"],
        "geo": ["United States", "Mexico"],
        "published_at": datetime(2026, 2, 18, 15, 10, tzinfo=timezone.utc),
        "confidence": 0.86,
    },
    {
        "truth_card_id": "20000000-0000-0000-0000-000000000002",
        "source_id": SOURCES[1]["source_id"],
        "vendor_name": "GridPulse Labs",
        "industry": "Energy",
        "problem": "High energy cost",
        "solution": "Analytics",
        "capabilities": ["Energy balancing", "Demand forecasting", "Plant utility control"],
        "geo": ["Germany", "United States"],
        "published_at": datetime(2026, 2, 7, 11, 0, tzinfo=timezone.utc),
        "confidence": 0.88,
    },
    {
        "truth_card_id": "20000000-0000-0000-0000-000000000003",
        "source_id": SOURCES[4]["source_id"],
        "vendor_name": "VisionForge AI",
        "industry": "Manufacturing",
        "problem": "Quality defects",
        "solution": "Vision systems",
        "capabilities": ["Defect detection", "Line vision", "Quality drift alerts"],
        "geo": ["Japan", "United States"],
        "published_at": datetime(2026, 1, 30, 8, 15, tzinfo=timezone.utc),
        "confidence": 0.91,
    },
    {
        "truth_card_id": "20000000-0000-0000-0000-000000000004",
        "source_id": SOURCES[2]["source_id"],
        "vendor_name": "FarmSense Robotics",
        "industry": "Agriculture",
        "problem": "Labor shortage",
        "solution": "Robotics",
        "capabilities": ["Crop scan automation", "Irrigation anomaly alerts", "Field dashboard"],
        "geo": ["Mexico", "United States"],
        "published_at": datetime(2026, 1, 22, 13, 33, tzinfo=timezone.utc),
        "confidence": 0.76,
    },
    {
        "truth_card_id": "20000000-0000-0000-0000-000000000005",
        "source_id": SOURCES[0]["source_id"],
        "vendor_name": "HarborOps Systems",
        "industry": "Logistics",
        "problem": "Low automation",
        "solution": "AI software",
        "capabilities": ["Port simulation", "Yard planning", "Risk-aware scheduling"],
        "geo": ["Singapore"],
        "published_at": datetime(2026, 1, 11, 10, 2, tzinfo=timezone.utc),
        "confidence": 0.81,
    },
    {
        "truth_card_id": "20000000-0000-0000-0000-000000000006",
        "source_id": SOURCES[4]["source_id"],
        "vendor_name": "BuildSafe Vision",
        "industry": "Construction",
        "problem": "Safety risk",
        "solution": "Vision systems",
        "capabilities": ["Hazard detection", "PPE compliance checks", "Incident prediction"],
        "geo": ["United States", "Canada"],
        "published_at": datetime(2025, 12, 19, 16, 45, tzinfo=timezone.utc),
        "confidence": 0.87,
    },
    {
        "truth_card_id": "20000000-0000-0000-0000-000000000007",
        "source_id": SOURCES[0]["source_id"],
        "vendor_name": "MedChain Intelligence",
        "industry": "Healthcare",
        "problem": "Inventory inaccuracy",
        "solution": "Analytics",
        "capabilities": ["Cold-chain alerts", "Inventory drift detection", "Replenishment planning"],
        "geo": ["United Kingdom", "United States"],
        "published_at": datetime(2025, 12, 1, 14, 20, tzinfo=timezone.utc),
        "confidence": 0.79,
    },
    {
        "truth_card_id": "20000000-0000-0000-0000-000000000008",
        "source_id": SOURCES[3]["source_id"],
        "vendor_name": "UrbanMesh IoT",
        "industry": "Smart Cities",
        "problem": "Equipment downtime",
        "solution": "IoT sensors",
        "capabilities": ["Telemetry ingestion", "Cross-utility alerts", "Infrastructure monitoring"],
        "geo": ["Spain", "France"],
        "published_at": datetime(2025, 11, 16, 9, 30, tzinfo=timezone.utc),
        "confidence": 0.84,
    },
    {
        "truth_card_id": "20000000-0000-0000-0000-000000000009",
        "source_id": SOURCES[2]["source_id"],
        "vendor_name": "LinePilot Automation",
        "industry": "Manufacturing",
        "problem": "Equipment downtime",
        "solution": "Workflow automation",
        "capabilities": ["Work order dispatch", "Downtime logging", "Shift handoff automation"],
        "geo": ["India", "United States"],
        "published_at": datetime(2025, 10, 27, 12, 0, tzinfo=timezone.utc),
        "confidence": 0.82,
    },
    {
        "truth_card_id": "20000000-0000-0000-0000-000000000010",
        "source_id": SOURCES[2]["source_id"],
        "vendor_name": "CargoNerve Systems",
        "industry": "Logistics",
        "problem": "Manual paperwork",
        "solution": "AI software",
        "capabilities": ["Cross-border ETA", "Customs anomaly flags", "Delay risk forecasting"],
        "geo": ["United States", "Mexico", "Canada"],
        "published_at": datetime(2025, 9, 18, 18, 0, tzinfo=timezone.utc),
        "confidence": 0.74,
    },
]


TREND_SIGNALS = [
    ("jobs", "US Southwest", "AI Logistics", 28, date(2026, 2, 24)),
    ("patents", "Germany", "Energy Optimization", 19, date(2026, 2, 14)),
    ("exhibitors", "Japan", "Vision QA", 16, date(2026, 1, 31)),
    ("launches", "United Kingdom", "Health Supply AI", 11, date(2025, 12, 2)),
    ("github", "Spain", "Smart Infrastructure IoT", 22, date(2025, 11, 18)),
    ("launches", "India", "Factory Workflow Automation", 14, date(2025, 10, 29)),
    ("jobs", "US South", "Border Logistics AI", 24, date(2025, 9, 19)),
]


def upsert_sources() -> None:
    with SessionLocal() as db:
        for source in SOURCES:
            db.execute(
                text(
                    """
                    INSERT INTO sources (
                      source_id, name, base_url, category, crawl_method, crawl_frequency_minutes,
                      rate_limit_per_minute, render_js, reliability_score, active, created_at, updated_at
                    ) VALUES (
                      :source_id, :name, :base_url, :category::source_category, :crawl_method::crawl_method, :freq,
                      :rate, :render_js, :reliability, TRUE, NOW(), NOW()
                    ) ON CONFLICT (source_id) DO UPDATE SET
                      name = EXCLUDED.name,
                      reliability_score = EXCLUDED.reliability_score,
                      updated_at = NOW();
                    """
                ),
                source,
            )
        db.commit()


def insert_truth_cards() -> None:
    with SessionLocal() as db:
        for row in TRUTH_CARDS:
            capture_id = str(uuid4())
            db.execute(
                text(
                    """
                    INSERT INTO captures (
                      capture_id, source_id, url, normalized_url, domain, http_status, status,
                      content_hash, content_type, parser_version, extraction_version, captured_at
                    ) VALUES (
                      :capture_id, :source_id, :url, :url, :domain, 200, 'success'::capture_status,
                      :content_hash, 'text/html', 'seed-v1', 'seed-v1', :captured_at
                    ) ON CONFLICT DO NOTHING;
                    """
                ),
                {
                    "capture_id": capture_id,
                    "source_id": row["source_id"],
                    "url": f"https://demo.nxtlink/{row['vendor_name'].lower().replace(' ', '-')}",
                    "domain": "demo.nxtlink",
                    "content_hash": str(uuid4()).replace("-", ""),
                    "captured_at": row["published_at"],
                },
            )

            evidence_id = str(uuid4())
            db.execute(
                text(
                    """
                    INSERT INTO evidence_snippets (
                      evidence_id, capture_id, source_id, url, quote_text, created_at
                    ) VALUES (
                      :evidence_id, :capture_id, :source_id, :url, :quote_text, :created_at
                    ) ON CONFLICT DO NOTHING;
                    """
                ),
                {
                    "evidence_id": evidence_id,
                    "capture_id": capture_id,
                    "source_id": row["source_id"],
                    "url": f"https://demo.nxtlink/{row['vendor_name'].lower().replace(' ', '-')}",
                    "quote_text": row["capabilities"][0],
                    "created_at": row["published_at"],
                },
            )

            card_text = " | ".join(
                [
                    row["vendor_name"],
                    " ".join(row["capabilities"]),
                    row["industry"],
                    row["problem"],
                    row["solution"],
                    " ".join(row["geo"]),
                ]
            )
            db.execute(
                text(
                    """
                    INSERT INTO vendor_truth_cards (
                      truth_card_id, source_id, capture_id, canonical_vendor_id, vendor_name, product_names,
                      capabilities, industries_mentioned, integrations_mentioned, deployment_type, geographic_signals,
                      card_text, evidence_ids, confidence, review_status, created_at, updated_at
                    ) VALUES (
                      :truth_card_id, :source_id, :capture_id, :canonical_vendor_id, :vendor_name, :product_names,
                      :capabilities, :industries_mentioned, ARRAY['SAP']::text[], 'cloud', :geographic_signals,
                      :card_text, :evidence_ids::uuid[], :confidence, :review_status::review_status, :published_at, NOW()
                    ) ON CONFLICT (truth_card_id) DO UPDATE SET
                      confidence = EXCLUDED.confidence,
                      card_text = EXCLUDED.card_text,
                      updated_at = NOW();
                    """
                ),
                {
                    "truth_card_id": row["truth_card_id"],
                    "source_id": row["source_id"],
                    "capture_id": capture_id,
                    "canonical_vendor_id": row["vendor_name"].lower().replace(" ", "-"),
                    "vendor_name": row["vendor_name"],
                    "product_names": [f"{row['vendor_name']} Platform"],
                    "capabilities": row["capabilities"],
                    "industries_mentioned": [row["industry"]],
                    "geographic_signals": row["geo"],
                    "card_text": card_text,
                    "evidence_ids": [evidence_id],
                    "confidence": row["confidence"],
                    "review_status": "auto_accepted" if row["confidence"] >= 0.72 else "needs_review",
                    "published_at": row["published_at"],
                },
            )

            db.execute(
                text(
                    """
                    INSERT INTO truth_card_classifications (
                      classification_id, truth_card_id, industry_label_key, problem_category_key,
                      solution_type_key, capability_tags, confidence, unknown_candidate_labels, evidence_ids, classifier_version, created_at
                    ) VALUES (
                      gen_random_uuid(), :truth_card_id, :industry, :problem, :solution,
                      ARRAY[]::text[], :confidence, ARRAY[]::text[], :evidence_ids::uuid[], 'seed-classifier-v1', :created_at
                    ) ON CONFLICT DO NOTHING;
                    """
                ),
                {
                    "truth_card_id": row["truth_card_id"],
                    "industry": row["industry"],
                    "problem": row["problem"],
                    "solution": row["solution"],
                    "confidence": row["confidence"],
                    "evidence_ids": [evidence_id],
                    "created_at": row["published_at"],
                },
            )
        db.commit()


def insert_trend_signals() -> None:
    with SessionLocal() as db:
        for signal_type, region_key, category_key, count_value, observed_date in TREND_SIGNALS:
            db.execute(
                text(
                    """
                    INSERT INTO trend_signals (
                      signal_id, signal_type, source_id, observed_date, region_key, category_key, count_value, payload_json, created_at
                    ) VALUES (
                      gen_random_uuid(), :signal_type, NULL, :observed_date, :region_key, :category_key, :count_value, '{}'::jsonb, NOW()
                    );
                    """
                ),
                {
                    "signal_type": signal_type,
                    "observed_date": observed_date,
                    "region_key": region_key,
                    "category_key": category_key,
                    "count_value": count_value,
                },
            )
        db.commit()


def main() -> None:
    upsert_sources()
    insert_truth_cards()
    insert_trend_signals()
    print("Seeded: 5 sources, 10 truth cards, trend signals.")


if __name__ == "__main__":
    main()
