"""
NXT//LINK Industry Observer — Quality Control / Verifier Agent
Scores confidence, deduplicates deployments, detects conflicts,
and updates source quality scores based on extraction yield.
"""

import logging
from datetime import datetime
from typing import Any

from rapidfuzz import fuzz

from config import (
    CONFIDENCE_THRESHOLDS,
    DEDUP_SIMILARITY_THRESHOLD,
    SOURCE_SCORE_THRESHOLDS,
)
from models import (
    ClassifiedItem,
    Deployment,
    RawItem,
    Source,
    get_session,
)

logger = logging.getLogger(__name__)


# ─── Confidence Scoring ───────────────────────────────────────────────────────

def score_confidence(item: ClassifiedItem, source: Source) -> float:
    """
    Compute a final confidence score for a ClassifiedItem by combining:
    - The classifier's raw confidence
    - Source quality score (0–100 normalized to 0–1)
    - Signal type weight
    - Presence of key fields

    Returns a float in [0, 1].
    """
    base = item.confidence

    # Source quality adjustment (±0.10)
    source_adj = ((source.score or 50) - 50) / 500.0  # ±0.10

    # Signal type weights
    signal_weights: dict[str | None, float] = {
        "case_study": 0.10,
        "partnership": 0.05,
        "product_launch": 0.03,
        "funding": 0.02,
        "research": -0.02,
        None: -0.05,
    }
    signal_adj = signal_weights.get(item.signal_type, 0.0)

    # Field completeness adjustment
    completeness_adj = 0.0
    if item.industry:
        completeness_adj += 0.02
    if item.technology:
        completeness_adj += 0.02
    if item.warehouse_zone:
        completeness_adj += 0.01

    final = base + source_adj + signal_adj + completeness_adj
    return round(max(0.0, min(1.0, final)), 4)


# ─── Deduplication ────────────────────────────────────────────────────────────

def _deployments_are_similar(a: Deployment, b: Deployment) -> bool:
    """
    Return True if two Deployment records are likely duplicates.
    Uses token_sort_ratio on company+vendor+product text.
    """
    def _sig(d: Deployment) -> str:
        parts = [
            (d.company_name or ""),
            (d.vendor or ""),
            (d.product or ""),
        ]
        return " ".join(p.lower() for p in parts if p)

    sig_a = _sig(a)
    sig_b = _sig(b)

    if not sig_a or not sig_b:
        return False

    ratio = fuzz.token_sort_ratio(sig_a, sig_b) / 100.0
    return ratio >= DEDUP_SIMILARITY_THRESHOLD


def deduplicate(deployments: list[Deployment]) -> list[Deployment]:
    """
    Merge similar Deployment records into canonical representatives.
    When two records match, the one with higher confidence is kept;
    its result field is augmented with the other's result if different.

    Modifies the list in-place and returns the deduplicated result.
    """
    if len(deployments) < 2:
        return deployments

    merged: list[Deployment] = []
    skip_ids: set[int] = set()

    for i, dep_a in enumerate(deployments):
        if dep_a.id in skip_ids:
            continue
        for j in range(i + 1, len(deployments)):
            dep_b = deployments[j]
            if dep_b.id in skip_ids:
                continue
            if _deployments_are_similar(dep_a, dep_b):
                # Keep higher-confidence record, absorb the other's results
                if (dep_b.confidence or 0) > (dep_a.confidence or 0):
                    dep_a, dep_b = dep_b, dep_a  # swap so dep_a is winner
                if dep_b.results and dep_b.results not in (dep_a.results or ""):
                    dep_a.results = (
                        f"{dep_a.results}; {dep_b.results}"
                        if dep_a.results
                        else dep_b.results
                    )
                skip_ids.add(dep_b.id)
                logger.debug(
                    "Deduplicated deployment %s into %s", dep_b.id, dep_a.id
                )
        merged.append(dep_a)

    logger.info(
        "Deduplication: %d → %d deployments", len(deployments), len(merged)
    )
    return merged


# ─── Conflict Detection ───────────────────────────────────────────────────────

def detect_conflicts(deployments: list[Deployment]) -> list[dict[str, Any]]:
    """
    Flag deployments where two records describe the same company+vendor pair
    but with conflicting data (e.g. different warehouse_zone or technology).

    Returns a list of conflict report dicts for human review.
    """
    conflicts: list[dict[str, Any]] = []
    seen: dict[str, Deployment] = {}

    for dep in deployments:
        key = f"{(dep.company_name or '').lower()}|{(dep.vendor or '').lower()}"
        if not key.strip("|"):
            continue

        if key in seen:
            other = seen[key]
            conflict_fields: list[str] = []

            if (
                dep.warehouse_zone
                and other.warehouse_zone
                and dep.warehouse_zone != other.warehouse_zone
            ):
                conflict_fields.append("warehouse_zone")

            if (
                dep.technology
                and other.technology
                and dep.technology != other.technology
            ):
                conflict_fields.append("technology")

            if (
                dep.year
                and other.year
                and abs(dep.year - other.year) > 2
            ):
                conflict_fields.append("year")

            if conflict_fields:
                conflicts.append(
                    {
                        "conflict_fields": conflict_fields,
                        "deployment_a_id": other.id,
                        "deployment_b_id": dep.id,
                        "company": dep.company_name,
                        "vendor": dep.vendor,
                        "details_a": {
                            "warehouse_zone": other.warehouse_zone,
                            "technology": other.technology,
                            "year": other.year,
                            "source_url": other.source_url,
                        },
                        "details_b": {
                            "warehouse_zone": dep.warehouse_zone,
                            "technology": dep.technology,
                            "year": dep.year,
                            "source_url": dep.source_url,
                        },
                    }
                )
                logger.warning(
                    "Conflict detected for %s + %s: fields=%s",
                    dep.company_name,
                    dep.vendor,
                    conflict_fields,
                )
        else:
            seen[key] = dep

    return conflicts


# ─── Source Scoring ───────────────────────────────────────────────────────────

def update_source_scores() -> dict[str, int]:
    """
    Recalculate each Source.score based on its useful item yield ratio.

    Score formula (0–100):
        score = 50 + (yield_ratio - 0.3) * 100
    Clamped to [0, 100].

    Also promotes/demotes sources based on thresholds.
    Returns a dict with promote/demote counts.
    """
    session = get_session()
    promoted = 0
    demoted = 0

    try:
        sources = session.query(Source).filter(Source.status != "blocked").all()

        for source in sources:
            if source.items_count == 0:
                continue

            # Count ClassifiedItems with confidence above news_mention threshold
            # that came from this source's RawItems
            useful_count = (
                session.query(ClassifiedItem)
                .join(RawItem, RawItem.id == ClassifiedItem.raw_item_id)
                .filter(
                    RawItem.source_id == source.id,
                    ClassifiedItem.confidence
                    >= CONFIDENCE_THRESHOLDS["news_mention"],
                )
                .count()
            )
            source.useful_count = useful_count

            yield_ratio = useful_count / source.items_count
            new_score = 50 + (yield_ratio - 0.3) * 100
            source.score = round(max(0.0, min(100.0, new_score)), 1)

            # Status transitions
            if (
                source.status == "watchlist"
                and source.score >= SOURCE_SCORE_THRESHOLDS["promote_to_approved"]
            ):
                source.status = "approved"
                promoted += 1
                logger.info("Promoted %s to approved (score=%.0f)", source.domain, source.score)

            elif (
                source.status == "approved"
                and source.score < SOURCE_SCORE_THRESHOLDS["demote_to_watchlist"]
            ):
                source.status = "watchlist"
                demoted += 1
                logger.info(
                    "Demoted %s to watchlist (score=%.0f)", source.domain, source.score
                )

            elif (
                source.status == "watchlist"
                and source.score < SOURCE_SCORE_THRESHOLDS["block"]
            ):
                source.status = "blocked"
                demoted += 1
                logger.info("Blocked %s (score=%.0f)", source.domain, source.score)

        session.commit()
        logger.info(
            "Source scores updated. Promoted: %d, Demoted/Blocked: %d", promoted, demoted
        )

    except Exception as exc:
        session.rollback()
        logger.error("Error updating source scores: %s", exc)
    finally:
        session.close()

    return {"promoted": promoted, "demoted": demoted}


# ─── Full Verify Pass ─────────────────────────────────────────────────────────

def run_verification() -> dict[str, Any]:
    """
    Run the full verification pipeline on all current Deployments:
    1. Re-score confidence using source quality.
    2. Deduplicate.
    3. Detect conflicts.
    4. Update source scores.

    Returns a summary dict.
    """
    session = get_session()
    summary: dict[str, Any] = {}

    try:
        deployments = session.query(Deployment).all()
        logger.info("Verifying %d deployments", len(deployments))

        # Re-score each deployment's confidence
        for dep in deployments:
            classified = session.get(ClassifiedItem, dep.classified_item_id)
            if not classified:
                continue
            raw_item = session.get(RawItem, classified.raw_item_id)
            if not raw_item:
                continue
            source = session.get(Source, raw_item.source_id)
            if not source:
                continue
            dep.confidence = score_confidence(classified, source)

        session.commit()

        # Dedup (in-memory)
        deduplicated = deduplicate(list(deployments))
        summary["deployments_before"] = len(deployments)
        summary["deployments_after"] = len(deduplicated)

        # Conflict detection
        conflicts = detect_conflicts(deduplicated)
        summary["conflicts_found"] = len(conflicts)
        if conflicts:
            logger.warning(
                "%d deployment conflicts detected — review output/conflicts.json", len(conflicts)
            )

        # Source scoring
        score_result = update_source_scores()
        summary.update(score_result)
        summary["verified_at"] = datetime.utcnow().isoformat()

        logger.info("Verification complete: %s", summary)

    finally:
        session.close()

    return summary


# ─── Entrypoint ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    from models import init_db
    init_db()
    result = run_verification()
    print("Verification result:", result)
