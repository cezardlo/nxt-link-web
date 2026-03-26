"""Agent 5: Insight — generate what/why/where for top clusters → top_insights + region_intelligence."""

import logging
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from pipeline.utils.db import get_db

logger = logging.getLogger("pipeline.insight")


class InsightAgent:
    name = "insight"

    async def run(self) -> dict:
        db = get_db()

        # Load top clusters ranked by composite_rank
        clusters = db.select("signal_clusters", {
            "select": "*",
            "status": "eq.active",
            "order": "composite_rank.desc",
            "limit": "10",
        })

        if not clusters:
            logger.info("No active clusters")
            return {"insights": 0, "regions": 0}

        cutoff = (datetime.now(timezone.utc) - timedelta(days=14)).isoformat()

        insights = []
        all_region_signals = defaultdict(lambda: {"count": 0, "industries": set(), "max_importance": 0})

        for rank, cluster in enumerate(clusters[:3], 1):
            industry = cluster.get("industry", "unknown")
            signal_type = cluster.get("signal_type", "unknown")

            # Load cluster's recent signals
            signals = db.select("intel_signals", {
                "select": "id,title,company,importance_score,amount_usd,quality_flags,discovered_at",
                "industry": f"eq.{industry}",
                "signal_type": f"eq.{signal_type}",
                "is_noise": "eq.false",
                "discovered_at": f"gte.{cutoff}",
                "order": "importance_score.desc",
                "limit": "20",
            })

            # Load latest metrics for this cluster
            metrics = db.select("cluster_metrics", {
                "select": "velocity,acceleration,trend_score,trend_label,signal_count",
                "cluster_id": f"eq.{cluster['id']}",
                "order": "date.desc",
                "limit": "1",
            })

            latest = metrics[0] if metrics else {}
            trend_label = latest.get("trend_label", "stable")
            velocity = float(latest.get("velocity", 0))
            signal_count = int(cluster.get("signal_count", 0))

            # Extract context
            top_titles = [s["title"] for s in signals[:3]]
            companies = list({s["company"] for s in signals if s.get("company")})[:5]
            total_usd = sum(float(s.get("amount_usd") or 0) for s in signals)

            # Gather region data from quality_flags
            for s in signals:
                flags = s.get("quality_flags") or []
                for flag in flags:
                    if flag in _REGIONS:
                        all_region_signals[flag]["count"] += 1
                        all_region_signals[flag]["industries"].add(industry)
                        imp = float(s.get("importance_score", 0))
                        if imp > all_region_signals[flag]["max_importance"]:
                            all_region_signals[flag]["max_importance"] = imp

            # ── Generate insight text ──
            what = _what_is_happening(signal_count, industry, signal_type, top_titles)
            why = _why_it_matters(trend_label, velocity, companies, total_usd, signal_count)
            where = _where_its_going(trend_label, velocity, companies, industry)

            related_ids = [s["id"] for s in signals[:10]]

            insights.append({
                "id": f"insight-{rank}",
                "rank": rank,
                "title": _make_title(industry, signal_type, trend_label),
                "what_is_happening": what,
                "why_it_matters": why,
                "where_its_going": where,
                "signal_count": signal_count,
                "avg_score": round(float(cluster.get("avg_importance", 0)), 2),
                "industry": industry,
                "signal_type": signal_type.replace("_", " "),
                "related_signal_ids": related_ids,
            })

        # ── Write top_insights ──
        # Delete existing rows for ranks we're about to write, then insert
        insights_written = 0
        # Clear all existing insights first
        try:
            db.client.delete(
                db._url("top_insights") + "?id=neq.placeholder",
                headers=db.headers,
            )
        except Exception:
            pass

        for insight in insights:
            try:
                db.insert("top_insights", insight)
                insights_written += 1
            except Exception as e:
                logger.warning(f"Insight write failed (rank {insight['rank']}): {e}")

        # ── Build region_intelligence ──
        # Also aggregate from ALL recent non-noise signals
        all_signals = db.select("intel_signals", {
            "select": "industry,quality_flags,importance_score",
            "is_noise": "eq.false",
            "discovered_at": f"gte.{cutoff}",
            "limit": "3000",
        })

        for s in all_signals:
            flags = s.get("quality_flags") or []
            ind = s.get("industry", "unknown")
            for flag in flags:
                if flag in _REGIONS:
                    all_region_signals[flag]["count"] += 1
                    all_region_signals[flag]["industries"].add(ind)

        regions_written = 0
        for region_name, data in all_region_signals.items():
            count = data["count"]
            if count < 2:
                continue
            risk = "high" if data["max_importance"] > 0.7 else "medium" if data["max_importance"] > 0.4 else "low"
            opp = min(data["max_importance"] + 0.1, 1.0)
            industries = list(data["industries"])[:5]

            for ind in industries:
                row = {
                    "region": region_name,
                    "industry": ind,
                    "signal_count": count,
                    "risk_level": risk,
                    "opportunity_score": round(opp, 2),
                }
                try:
                    db.upsert("region_intelligence", row, on_conflict="region,industry")
                    regions_written += 1
                except Exception as e:
                    # If upsert fails due to no unique constraint, try insert
                    try:
                        db.insert("region_intelligence", row)
                        regions_written += 1
                    except Exception:
                        pass

        logger.info(f"Insight: {insights_written} insights, {regions_written} region rows")
        return {"insights": insights_written, "regions": regions_written}


# ─── Region set (matches config.py REGION_KEYWORDS keys) ─────────────────────
_REGIONS = {
    "North America", "East Asia", "Southeast Asia", "Europe",
    "South Asia", "Middle East", "Latin America", "Africa",
}


# ─── Template functions ───────────────────────────────────────────────────────

def _make_title(industry: str, signal_type: str, trend_label: str) -> str:
    verb = {
        "spiking": "Surging",
        "growing": "Rising",
        "declining": "Declining",
        "stable": "Steady",
    }.get(trend_label, "Active")
    return f"{verb} {signal_type.replace('_', ' ').title()} Activity in {industry.title()}"


def _what_is_happening(count: int, industry: str, signal_type: str, titles: list[str]) -> str:
    headline = titles[0] if titles else "Multiple developments detected"
    second = f" {titles[1]}." if len(titles) > 1 else ""
    return (
        f"{count} signals in {industry} {signal_type.replace('_', ' ')} "
        f"over the last 14 days. {headline}.{second}"
    )


def _why_it_matters(
    trend_label: str, velocity: float, companies: list[str], total_usd: float, count: int
) -> str:
    company_text = f"Companies involved: {', '.join(companies[:3])}." if companies else ""
    money_text = f" ${total_usd / 1e6:.0f}M in disclosed deals." if total_usd > 1e6 else ""

    if trend_label == "spiking":
        return (
            f"This cluster is spiking with velocity {velocity:+.1f}. "
            f"{money_text} {company_text}"
        ).strip()
    elif trend_label == "growing":
        return (
            f"Steady growth suggests a sustained industry shift. "
            f"{count} signals indicate broadening activity. {company_text}"
        ).strip()
    elif trend_label == "declining":
        return "Activity is declining — potential resolution or market correction."
    else:
        return f"Holding steady at {count} signals. {company_text}".strip()


def _where_its_going(trend_label: str, velocity: float, companies: list[str], industry: str) -> str:
    if trend_label in ("spiking", "growing") and velocity > 0:
        return (
            f"Expect continued momentum in {industry}. "
            f"Watch for consolidation moves and new entrants."
        )
    elif trend_label == "declining":
        return "Growth is slowing. Watch for consolidation or pivot signals."
    else:
        return f"Holding steady. Next catalyst likely from adjacent sectors or policy changes."
