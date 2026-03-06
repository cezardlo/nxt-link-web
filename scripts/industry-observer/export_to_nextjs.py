"""
NXT//LINK Industry Observer — Next.js Export Agent
Reads structured records from the observer DB and writes JSON files
that the Next.js app can consume via static file imports or API routes.

Output directory: scripts/industry-observer/data/
"""

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any

from config import DATA_DIR
from models import (
    ClassifiedItem,
    Deployment,
    Milestone,
    Product,
    RawItem,
    Source,
    get_session,
)

logger = logging.getLogger(__name__)


# ─── Serialisation Helpers ────────────────────────────────────────────────────

def _deployment_to_dict(dep: Deployment) -> dict[str, Any]:
    return {
        "id": dep.id,
        "company_name": dep.company_name,
        "vendor": dep.vendor,
        "product": dep.product,
        "technology": dep.technology,
        "warehouse_zone": dep.warehouse_zone,
        "use_case": dep.use_case,
        "location": dep.location,
        "year": dep.year,
        "results": dep.results,
        "source_url": dep.source_url,
        "confidence": dep.confidence,
    }


def _product_to_dict(prod: Product) -> dict[str, Any]:
    return {
        "id": prod.id,
        "name": prod.name,
        "vendor": prod.vendor,
        "category": prod.category,
        "warehouse_zones": prod.warehouse_zones,
        "use_cases": prod.use_cases,
        "integrations": prod.integrations,
        "proof_links": prod.proof_links,
        "maturity_score": prod.maturity_score,
        "price_band": prod.price_band,
    }


def _milestone_to_dict(ms: Milestone) -> dict[str, Any]:
    return {
        "id": ms.id,
        "tech_timeline": ms.tech_timeline,
        "date": ms.date,
        "title": ms.title,
        "summary": ms.summary,
        "evidence_urls": ms.evidence_urls,
    }


def _write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, default=str)
    logger.info("Wrote %s (%d bytes)", path, path.stat().st_size)


# ─── Per-Industry Exports ─────────────────────────────────────────────────────

def export_deployments(industry: str) -> Path:
    """
    Export all Deployment records for *industry* to
    data/deployments_{industry}.json.

    Returns the output path.
    """
    session = get_session()
    try:
        deps = (
            session.query(Deployment)
            .join(ClassifiedItem, ClassifiedItem.id == Deployment.classified_item_id)
            .filter(ClassifiedItem.industry == industry)
            .order_by(Deployment.confidence.desc())
            .all()
        )

        payload = {
            "exported_at": datetime.utcnow().isoformat(),
            "industry": industry,
            "count": len(deps),
            "deployments": [_deployment_to_dict(d) for d in deps],
        }

        safe_slug = industry.replace("/", "-").replace(" ", "_").lower()
        out_path = DATA_DIR / f"deployments_{safe_slug}.json"
        _write_json(out_path, payload)
        logger.info("Exported %d deployments for '%s'", len(deps), industry)
        return out_path
    finally:
        session.close()


def export_products(industry: str) -> Path:
    """
    Export all Product records associated with *industry* to
    data/products_{industry}.json.

    Returns the output path.
    """
    session = get_session()
    try:
        prods = (
            session.query(Product)
            .join(ClassifiedItem, ClassifiedItem.id == Product.classified_item_id)
            .filter(ClassifiedItem.industry == industry)
            .order_by(Product.maturity_score.desc())
            .all()
        )

        payload = {
            "exported_at": datetime.utcnow().isoformat(),
            "industry": industry,
            "count": len(prods),
            "products": [_product_to_dict(p) for p in prods],
        }

        safe_slug = industry.replace("/", "-").replace(" ", "_").lower()
        out_path = DATA_DIR / f"products_{safe_slug}.json"
        _write_json(out_path, payload)
        logger.info("Exported %d products for '%s'", len(prods), industry)
        return out_path
    finally:
        session.close()


def export_milestones(tech: str) -> Path:
    """
    Export all Milestone records for *tech* timeline to
    data/milestones_{tech}.json.

    Returns the output path.
    """
    session = get_session()
    try:
        milestones = (
            session.query(Milestone)
            .filter(Milestone.tech_timeline == tech)
            .order_by(Milestone.date.desc())
            .all()
        )

        payload = {
            "exported_at": datetime.utcnow().isoformat(),
            "tech_timeline": tech,
            "count": len(milestones),
            "milestones": [_milestone_to_dict(m) for m in milestones],
        }

        safe_slug = tech.replace("/", "-").replace(" ", "_").lower()
        out_path = DATA_DIR / f"milestones_{safe_slug}.json"
        _write_json(out_path, payload)
        logger.info("Exported %d milestones for '%s'", len(milestones), tech)
        return out_path
    finally:
        session.close()


def export_weekly_brief() -> Path:
    """
    Write (or refresh) data/weekly_brief.json.
    Delegates to learner.generate_weekly_brief() which already writes the file.

    Returns the output path.
    """
    from learner import generate_weekly_brief

    generate_weekly_brief()
    out_path = DATA_DIR / "weekly_brief.json"
    logger.info("Weekly brief refreshed at %s", out_path)
    return out_path


# ─── Source Leaderboard Export ────────────────────────────────────────────────

def export_source_leaderboard() -> Path:
    """
    Export a ranked list of sources with their scores and stats.
    Written to data/sources.json.
    """
    session = get_session()
    try:
        sources = (
            session.query(Source)
            .order_by(Source.score.desc())
            .all()
        )

        rows = [
            {
                "domain": s.domain,
                "industry": s.industry,
                "status": s.status,
                "score": s.score,
                "items_count": s.items_count,
                "useful_count": s.useful_count,
                "yield_ratio": round(s.yield_ratio, 3),
                "last_crawled": s.last_crawled.isoformat() if s.last_crawled else None,
            }
            for s in sources
        ]

        payload = {
            "exported_at": datetime.utcnow().isoformat(),
            "total": len(rows),
            "sources": rows,
        }

        out_path = DATA_DIR / "sources.json"
        _write_json(out_path, payload)
        return out_path
    finally:
        session.close()


# ─── Full Export ──────────────────────────────────────────────────────────────

def run_full_export() -> list[Path]:
    """
    Export all industries and all tech timelines.
    Also exports the weekly brief and source leaderboard.

    Returns a list of all output paths written.
    """
    from config import SEED_SOURCES, TECH_CATEGORIES

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    written: list[Path] = []

    # Discover which industries actually have data in the DB
    session = get_session()
    try:
        industries = [
            row[0]
            for row in session.query(ClassifiedItem.industry)
            .filter(ClassifiedItem.industry.isnot(None))
            .distinct()
            .all()
        ]
        tech_timelines = [
            row[0]
            for row in session.query(Milestone.tech_timeline)
            .filter(Milestone.tech_timeline.isnot(None))
            .distinct()
            .all()
        ]
    finally:
        session.close()

    # If DB is empty, fall back to seed industry slugs
    if not industries:
        industries = list(SEED_SOURCES.keys())
    if not tech_timelines:
        tech_timelines = TECH_CATEGORIES

    for industry in industries:
        try:
            written.append(export_deployments(industry))
        except Exception as exc:
            logger.warning("Failed to export deployments for %s: %s", industry, exc)
        try:
            written.append(export_products(industry))
        except Exception as exc:
            logger.warning("Failed to export products for %s: %s", industry, exc)

    for tech in tech_timelines:
        try:
            written.append(export_milestones(tech))
        except Exception as exc:
            logger.warning("Failed to export milestones for %s: %s", tech, exc)

    try:
        written.append(export_weekly_brief())
    except Exception as exc:
        logger.warning("Failed to export weekly brief: %s", exc)

    try:
        written.append(export_source_leaderboard())
    except Exception as exc:
        logger.warning("Failed to export source leaderboard: %s", exc)

    # Write an index file so Next.js knows what's available
    index_payload = {
        "exported_at": datetime.utcnow().isoformat(),
        "industries": industries,
        "tech_timelines": tech_timelines,
        "files": [str(p.name) for p in written if p.exists()],
    }
    index_path = DATA_DIR / "index.json"
    _write_json(index_path, index_payload)
    written.append(index_path)

    logger.info("Full export complete. %d files written to %s", len(written), DATA_DIR)
    return written


# ─── Entrypoint ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    from models import init_db
    init_db()
    paths = run_full_export()
    for p in paths:
        print(f"  {p}")
