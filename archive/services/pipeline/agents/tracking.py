"""Agent 3: Tracking — daily counts, rolling averages, velocity, acceleration per cluster."""

import logging
import uuid
from datetime import datetime, timedelta, timezone

import pandas as pd
import numpy as np

from pipeline.utils.db import get_db

logger = logging.getLogger("pipeline.tracking")

TODAY = datetime.now(timezone.utc).strftime("%Y-%m-%d")


class TrackingAgent:
    name = "tracking"

    async def run(self) -> dict:
        db = get_db()

        # Load recent signals (last 30 days, non-noise)
        cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
        signals = db.select("intel_signals", {
            "select": "id,industry,signal_type,discovered_at,importance_score,amount_usd",
            "is_noise": "eq.false",
            "discovered_at": f"gte.{cutoff}",
            "order": "discovered_at.desc",
            "limit": "5000",
        })

        if not signals:
            logger.info("No recent signals to track")
            return {"clusters_updated": 0}

        df = pd.DataFrame(signals)
        df["date"] = pd.to_datetime(df["discovered_at"], format="ISO8601").dt.strftime("%Y-%m-%d")
        df["amount_usd"] = pd.to_numeric(df["amount_usd"], errors="coerce").fillna(0)

        # Group by (industry, signal_type) = cluster
        clusters = df.groupby(["industry", "signal_type"])

        metrics_rows = []
        cluster_rows = []

        for (industry, signal_type), group in clusters:
            if len(group) < 3:
                continue

            cluster_id = f"cluster_{industry}_{signal_type}".replace(" ", "_").lower()
            label = f"{signal_type.replace('_', ' ').title()} in {industry.title()}"

            # Daily counts
            daily = group.groupby("date").size().reset_index(name="signal_count")
            daily = daily.sort_values("date")

            # Fill missing days
            all_dates = pd.date_range(
                start=(datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d"),
                end=TODAY,
                freq="D",
            ).strftime("%Y-%m-%d")
            daily = daily.set_index("date").reindex(all_dates, fill_value=0).reset_index()
            daily.columns = ["date", "signal_count"]

            # Rolling average (7-day)
            daily["rolling_avg"] = daily["signal_count"].rolling(7, min_periods=1).mean()

            # Velocity = change in rolling avg
            daily["velocity"] = daily["rolling_avg"].diff().fillna(0)

            # Acceleration = change in velocity
            daily["acceleration"] = daily["velocity"].diff().fillna(0)

            # Trend score
            daily["trend_score"] = (0.6 * daily["velocity"]) + (0.4 * daily["acceleration"])

            # Label the latest day
            latest = daily.iloc[-1]
            ts = float(latest["trend_score"])
            if ts > 2.0:
                trend_label = "spiking"
            elif ts > 0.5:
                trend_label = "growing"
            elif ts < -0.5:
                trend_label = "declining"
            else:
                trend_label = "stable"

            # Write daily metrics for last 14 days
            for _, row in daily.tail(14).iterrows():
                row_ts = float(row["trend_score"])
                if row_ts > 2.0:
                    row_label = "spiking"
                elif row_ts > 0.5:
                    row_label = "growing"
                elif row_ts < -0.5:
                    row_label = "declining"
                else:
                    row_label = "stable"

                metrics_rows.append({
                    "id": str(uuid.uuid4()),
                    "cluster_id": cluster_id,
                    "date": row["date"],
                    "signal_count": int(row["signal_count"]),
                    "rolling_avg": round(float(row["rolling_avg"]), 2),
                    "velocity": round(float(row["velocity"]), 2),
                    "acceleration": round(float(row["acceleration"]), 2),
                    "trend_score": round(float(row["trend_score"]), 2),
                    "trend_label": row_label,
                })

            # Cluster summary
            total_signals = len(group)
            total_usd = float(group["amount_usd"].sum())
            avg_importance = float(group["importance_score"].astype(float).mean())
            max_importance = float(group["importance_score"].astype(float).max())

            # Composite scores
            density = min(total_signals / 20.0, 1.0) * 100
            money = min(total_usd / 1e9, 1.0) * 100 if total_usd > 0 else 0
            momentum = min(max(ts + 3, 0) / 6.0, 1.0) * 100
            strategic = avg_importance * 100

            # Time window from signals
            dates = group["date"].sort_values()
            tw_start = dates.iloc[0]
            tw_end = dates.iloc[-1]

            cluster_rows.append({
                "id": cluster_id,
                "cluster_type": "industry_topic",
                "label": label,
                "industry": industry,
                "signal_type": signal_type,
                "time_window_start": tw_start,
                "time_window_end": tw_end,
                "signal_count": total_signals,
                "total_usd": total_usd,
                "avg_importance": round(avg_importance, 2),
                "max_importance": round(max_importance, 2),
                "density_score": round(density, 1),
                "money_score": round(money, 1),
                "momentum_score": round(momentum, 1),
                "strategic_score": round(strategic, 1),
                "composite_rank": round(density + money + momentum + strategic, 1),
                "status": "active",
            })

        # Write to Supabase
        metrics_written = 0
        if metrics_rows:
            for row in metrics_rows:
                try:
                    db.upsert("cluster_metrics", row, on_conflict="id")
                    metrics_written += 1
                except Exception as e:
                    logger.warning(f"Metrics upsert failed: {e}")

        clusters_written = 0
        if cluster_rows:
            for row in cluster_rows:
                try:
                    db.upsert("signal_clusters", row, on_conflict="id")
                    clusters_written += 1
                except Exception as e:
                    logger.warning(f"Cluster upsert failed: {e}")

        logger.info(
            f"Tracking: {clusters_written} clusters, {metrics_written} metric rows"
        )
        return {
            "clusters_updated": clusters_written,
            "metrics_rows": metrics_written,
        }
