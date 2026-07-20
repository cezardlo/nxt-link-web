"""
NXT//LINK Industry Observer — Self-Improvement / Learner Agent
Runs nightly/weekly housekeeping:
  - Reranks sources based on useful yield
  - Grows the entity memory from newly extracted names
  - Promotes watchlist sources that earned it
  - Generates a plain-text weekly brief
"""

import json
import logging
from collections import Counter, defaultdict
from datetime import datetime, timedelta

from rapidfuzz import fuzz, process as fuzz_process

from config import ENTITY_FUZZY_THRESHOLD, SOURCE_SCORE_THRESHOLDS
from models import (
    ClassifiedItem,
    Deployment,
    EntityAlias,
    Milestone,
    Product,
    RawItem,
    Source,
    get_session,
)

logger = logging.getLogger(__name__)


# ─── Nightly Rerank ───────────────────────────────────────────────────────────

def nightly_rerank() -> dict[str, int]:
    """
    Recalculate Source.score from the last 7 days of item yield.
    More recent useful items carry higher weight.

    Returns {"updated": N} sources.
    """
    session = get_session()
    updated = 0
    cutoff = datetime.utcnow() - timedelta(days=7)

    try:
        sources = session.query(Source).filter(Source.status != "blocked").all()

        for source in sources:
            # Count all raw items fetched in the last 7 days
            recent_total = (
                session.query(RawItem)
                .filter(
                    RawItem.source_id == source.id,
                    RawItem.fetched_at >= cutoff,
                )
                .count()
            )

            if recent_total == 0:
                # Decay score slightly if source was inactive
                source.score = max(0.0, (source.score or 50.0) * 0.95)
                updated += 1
                continue

            # Count classified items from those raw items with meaningful signal
            recent_useful = (
                session.query(ClassifiedItem)
                .join(RawItem, RawItem.id == ClassifiedItem.raw_item_id)
                .filter(
                    RawItem.source_id == source.id,
                    RawItem.fetched_at >= cutoff,
                    ClassifiedItem.confidence >= 0.40,
                    ClassifiedItem.signal_type.isnot(None),
                )
                .count()
            )

            yield_ratio = recent_useful / recent_total
            # Exponential moving average: 70% existing + 30% new observation
            new_score = 50 + (yield_ratio - 0.30) * 100
            new_score = max(0.0, min(100.0, new_score))
            source.score = round(0.70 * (source.score or 50.0) + 0.30 * new_score, 1)
            updated += 1

        session.commit()
        logger.info("Nightly rerank: updated %d source scores", updated)

    except Exception as exc:
        session.rollback()
        logger.error("Nightly rerank error: %s", exc)
    finally:
        session.close()

    return {"updated": updated}


# ─── Entity Memory Growth ─────────────────────────────────────────────────────

def grow_entity_memory() -> dict[str, int]:
    """
    Scan recent Deployment records for company and vendor names not yet in
    EntityAlias. Add new entities; merge aliases when fuzzy similarity is high.

    Returns counts of {"added": N, "merged": N}.
    """
    session = get_session()
    added = 0
    merged = 0
    cutoff = datetime.utcnow() - timedelta(days=7)

    try:
        # Collect all existing canonical names per type
        existing_companies: list[str] = [
            r.canonical_name
            for r in session.query(EntityAlias)
            .filter(EntityAlias.entity_type == "company")
            .all()
        ]
        existing_vendors: list[str] = [
            r.canonical_name
            for r in session.query(EntityAlias)
            .filter(EntityAlias.entity_type == "vendor")
            .all()
        ]

        # Pull recent deployments
        recent_deps: list[Deployment] = (
            session.query(Deployment)
            .join(ClassifiedItem, ClassifiedItem.id == Deployment.classified_item_id)
            .filter(ClassifiedItem.extracted_at >= cutoff)
            .all()
        )

        new_companies: Counter = Counter()
        new_vendors: Counter = Counter()

        for dep in recent_deps:
            if dep.company_name:
                new_companies[dep.company_name] += 1
            if dep.vendor:
                new_vendors[dep.vendor] += 1

        def _process_names(
            names: Counter,
            existing: list[str],
            entity_type: str,
        ) -> tuple[int, int]:
            _added = 0
            _merged = 0
            for name, _ in names.most_common():
                if not name or len(name) < 3:
                    continue

                # Check if already exists (exact)
                exact = session.query(EntityAlias).filter(
                    EntityAlias.alias.ilike(name),
                    EntityAlias.entity_type == entity_type,
                ).first()
                if exact:
                    continue

                # Fuzzy match against canonicals
                match_result = fuzz_process.extractOne(
                    name,
                    existing,
                    scorer=fuzz.token_sort_ratio,
                ) if existing else None

                if match_result and match_result[1] >= ENTITY_FUZZY_THRESHOLD:
                    canonical = match_result[0]
                    # Add as alias of existing canonical
                    alias = EntityAlias(
                        canonical_name=canonical,
                        alias=name,
                        entity_type=entity_type,
                    )
                    session.add(alias)
                    _merged += 1
                    logger.debug("Merged alias '%s' → '%s'", name, canonical)
                else:
                    # Add as new canonical (also create self-alias)
                    alias = EntityAlias(
                        canonical_name=name,
                        alias=name,
                        entity_type=entity_type,
                    )
                    session.add(alias)
                    existing.append(name)
                    _added += 1
                    logger.debug("Added new %s entity: '%s'", entity_type, name)

            return _added, _merged

        a, m = _process_names(new_companies, existing_companies, "company")
        added += a
        merged += m

        a, m = _process_names(new_vendors, existing_vendors, "vendor")
        added += a
        merged += m

        session.commit()
        logger.info("Entity memory: added=%d merged=%d", added, merged)

    except Exception as exc:
        session.rollback()
        logger.error("Entity memory growth error: %s", exc)
    finally:
        session.close()

    return {"added": added, "merged": merged}


# ─── Source Promotion / Demotion ──────────────────────────────────────────────

def promote_sources() -> int:
    """
    Move watchlist sources to approved if score >= threshold.
    Returns the number of sources promoted.
    """
    session = get_session()
    count = 0
    try:
        watchlist = (
            session.query(Source)
            .filter(
                Source.status == "watchlist",
                Source.score >= SOURCE_SCORE_THRESHOLDS["promote_to_approved"],
            )
            .all()
        )
        for src in watchlist:
            src.status = "approved"
            count += 1
            logger.info("Promoted %s (score=%.0f)", src.domain, src.score)
        session.commit()
    except Exception as exc:
        session.rollback()
        logger.error("Promote sources error: %s", exc)
    finally:
        session.close()
    return count


def demote_sources() -> int:
    """
    Move approved sources to watchlist (or watchlist → blocked) if score is too low.
    Returns the number of sources demoted.
    """
    session = get_session()
    count = 0
    try:
        # Approved → Watchlist
        approved_low = (
            session.query(Source)
            .filter(
                Source.status == "approved",
                Source.score < SOURCE_SCORE_THRESHOLDS["demote_to_watchlist"],
            )
            .all()
        )
        for src in approved_low:
            src.status = "watchlist"
            count += 1
            logger.info("Demoted %s to watchlist (score=%.0f)", src.domain, src.score)

        # Watchlist → Blocked
        watchlist_low = (
            session.query(Source)
            .filter(
                Source.status == "watchlist",
                Source.score < SOURCE_SCORE_THRESHOLDS["block"],
            )
            .all()
        )
        for src in watchlist_low:
            src.status = "blocked"
            count += 1
            logger.info("Blocked %s (score=%.0f)", src.domain, src.score)

        session.commit()
    except Exception as exc:
        session.rollback()
        logger.error("Demote sources error: %s", exc)
    finally:
        session.close()
    return count


# ─── Weekly Brief ─────────────────────────────────────────────────────────────

def generate_weekly_brief() -> str:
    """
    Summarize what the observer discovered over the past 7 days.
    Returns a plain-text brief string and writes data/weekly_brief.json.
    """
    from config import DATA_DIR

    session = get_session()
    cutoff = datetime.utcnow() - timedelta(days=7)

    try:
        # Raw items collected
        new_raw = session.query(RawItem).filter(RawItem.fetched_at >= cutoff).count()

        # Classifications by industry
        industry_counts: dict[str, int] = defaultdict(int)
        classified_items = (
            session.query(ClassifiedItem)
            .filter(ClassifiedItem.extracted_at >= cutoff)
            .all()
        )
        signal_counts: dict[str, int] = defaultdict(int)
        for ci in classified_items:
            if ci.industry:
                industry_counts[ci.industry] += 1
            if ci.signal_type:
                signal_counts[ci.signal_type] += 1

        # Deployments extracted
        new_deployments = (
            session.query(Deployment)
            .join(ClassifiedItem, ClassifiedItem.id == Deployment.classified_item_id)
            .filter(ClassifiedItem.extracted_at >= cutoff)
            .count()
        )

        # Products
        new_products = (
            session.query(Product)
            .join(ClassifiedItem, ClassifiedItem.id == Product.classified_item_id)
            .filter(ClassifiedItem.extracted_at >= cutoff)
            .count()
        )

        # Milestones
        new_milestones = (
            session.query(Milestone)
            .join(ClassifiedItem, ClassifiedItem.id == Milestone.classified_item_id)
            .filter(ClassifiedItem.extracted_at >= cutoff)
            .count()
        )

        # Top vendors this week
        vendor_rows = (
            session.query(Deployment.vendor)
            .join(ClassifiedItem, ClassifiedItem.id == Deployment.classified_item_id)
            .filter(
                ClassifiedItem.extracted_at >= cutoff,
                Deployment.vendor.isnot(None),
            )
            .all()
        )
        vendor_counter: Counter = Counter(r[0] for r in vendor_rows)
        top_vendors = vendor_counter.most_common(10)

        # Source stats
        total_sources = session.query(Source).count()
        approved_sources = (
            session.query(Source).filter(Source.status == "approved").count()
        )
        watchlist_sources = (
            session.query(Source).filter(Source.status == "watchlist").count()
        )
        blocked_sources = (
            session.query(Source).filter(Source.status == "blocked").count()
        )

        # ── Build brief text ──────────────────────────────────────────────────
        week_start = cutoff.strftime("%Y-%m-%d")
        week_end = datetime.utcnow().strftime("%Y-%m-%d")

        lines = [
            f"NXT//LINK INDUSTRY OBSERVER — WEEKLY BRIEF",
            f"Period: {week_start} → {week_end}",
            f"Generated: {datetime.utcnow().isoformat()}",
            "",
            "── COLLECTION ──────────────────────────────────────────",
            f"  Raw items collected:   {new_raw:,}",
            f"  Items classified:      {len(classified_items):,}",
            f"  Deployments extracted: {new_deployments:,}",
            f"  Products extracted:    {new_products:,}",
            f"  Milestones extracted:  {new_milestones:,}",
            "",
            "── BY INDUSTRY ─────────────────────────────────────────",
        ]
        for industry, count in sorted(industry_counts.items(), key=lambda x: -x[1]):
            lines.append(f"  {industry:<30} {count:>5}")

        lines += [
            "",
            "── SIGNAL TYPES ────────────────────────────────────────",
        ]
        for sig, count in sorted(signal_counts.items(), key=lambda x: -x[1]):
            lines.append(f"  {sig:<30} {count:>5}")

        lines += [
            "",
            "── TOP VENDORS MENTIONED ───────────────────────────────",
        ]
        for vendor, count in top_vendors:
            lines.append(f"  {vendor:<40} {count:>3}x")

        lines += [
            "",
            "── SOURCE HEALTH ───────────────────────────────────────",
            f"  Total sources:   {total_sources:,}",
            f"  Approved:        {approved_sources:,}",
            f"  Watchlist:       {watchlist_sources:,}",
            f"  Blocked:         {blocked_sources:,}",
            "",
        ]

        brief_text = "\n".join(lines)

        # Write JSON version
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        json_data = {
            "generated_at": datetime.utcnow().isoformat(),
            "period_start": week_start,
            "period_end": week_end,
            "raw_items": new_raw,
            "classified_items": len(classified_items),
            "deployments": new_deployments,
            "products": new_products,
            "milestones": new_milestones,
            "by_industry": dict(industry_counts),
            "by_signal_type": dict(signal_counts),
            "top_vendors": [{"vendor": v, "count": c} for v, c in top_vendors],
            "source_health": {
                "total": total_sources,
                "approved": approved_sources,
                "watchlist": watchlist_sources,
                "blocked": blocked_sources,
            },
            "brief_text": brief_text,
        }

        brief_path = DATA_DIR / "weekly_brief.json"
        with open(brief_path, "w", encoding="utf-8") as f:
            json.dump(json_data, f, indent=2, default=str)

        logger.info("Weekly brief written to %s", brief_path)
        return brief_text

    finally:
        session.close()


# ─── Full Learning Cycle ──────────────────────────────────────────────────────

def run_learning_cycle() -> dict[str, object]:
    """Run all learner tasks in sequence. Returns a summary dict."""
    logger.info("Starting nightly learning cycle")

    rerank_result = nightly_rerank()
    entity_result = grow_entity_memory()
    promoted = promote_sources()
    demoted = demote_sources()
    brief = generate_weekly_brief()

    summary = {
        "rerank": rerank_result,
        "entity_memory": entity_result,
        "promoted_sources": promoted,
        "demoted_sources": demoted,
        "brief_generated": True,
    }
    logger.info("Learning cycle complete: %s", summary)
    return summary


# ─── Entrypoint ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    from models import init_db
    init_db()
    result = run_learning_cycle()
    print(result)
