from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from uuid import uuid4

import numpy as np
import pandas as pd
from bertopic import BERTopic
from sentence_transformers import SentenceTransformer
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings


@dataclass
class TrendWindow:
    days: int


WINDOWS = [TrendWindow(30), TrendWindow(90), TrendWindow(180)]


def _hhi(values: list[float]) -> float:
    total = sum(values)
    if total <= 0:
        return 0.0
    shares = [(v / total) ** 2 for v in values]
    return float(sum(shares))


def ingest_signal(
    db: Session,
    signal_type: str,
    region_key: str,
    category_key: str,
    count_value: int,
    payload: dict,
    observed_date: date | None = None,
) -> None:
    db.execute(
        text(
            """
            INSERT INTO trend_signals (
              signal_id, signal_type, observed_date, region_key, category_key, count_value, payload_json, created_at
            ) VALUES (
              :signal_id, :signal_type, :observed_date, :region_key, :category_key, :count_value, :payload::jsonb, NOW()
            );
            """
        ),
        {
            "signal_id": str(uuid4()),
            "signal_type": signal_type,
            "observed_date": observed_date or date.today(),
            "region_key": region_key,
            "category_key": category_key,
            "count_value": int(count_value),
            "payload": pd.Series(payload).to_json() if payload else "{}",
        },
    )


def compute_trend_metrics(db: Session) -> dict:
    rows = db.execute(
        text(
            """
            SELECT signal_type, observed_date, region_key, category_key, count_value, payload_json
            FROM trend_signals
            WHERE observed_date >= CURRENT_DATE - interval '210 day';
            """
        )
    ).mappings().all()
    if not rows:
        return {"computed": False, "reason": "no_signals"}

    df = pd.DataFrame(rows)
    df["observed_date"] = pd.to_datetime(df["observed_date"]).dt.date
    now = datetime.now(timezone.utc).date()

    text_payloads = []
    for _, row in df.iterrows():
        text_payloads.append(
            f"{row['signal_type']} {row['category_key']} {row['region_key']} {row['payload_json']}"
        )

    embeddings = SentenceTransformer(settings.embedding_model_name).encode(text_payloads)
    topic_model = BERTopic(min_topic_size=8, verbose=False)
    topics, _ = topic_model.fit_transform(text_payloads, embeddings=embeddings)
    df["topic"] = topics

    written = 0
    for (category_key, region_key), group in df.groupby(["category_key", "region_key"]):
        region_distribution = (
            df[df["category_key"] == category_key].groupby("region_key")["count_value"].sum().to_list()
        )
        geo_concentration = _hhi(region_distribution)

        for window in WINDOWS:
            cutoff_current = now - timedelta(days=window.days)
            cutoff_previous = now - timedelta(days=window.days * 2)

            current_value = group[group["observed_date"] >= cutoff_current]["count_value"].sum()
            previous_value = group[
                (group["observed_date"] >= cutoff_previous) & (group["observed_date"] < cutoff_current)
            ]["count_value"].sum()

            growth = (current_value - previous_value) / max(previous_value, 1)
            saturation = np.tanh(current_value / 300.0)
            momentum = float(
                np.clip(0.50 + growth * 0.30 + saturation * 0.25 + (1 - geo_concentration) * 0.20, 0, 1)
            )

            db.execute(
                text(
                    """
                    INSERT INTO trend_metrics (
                      trend_metric_id, category_key, region_key, window_days, growth_rate,
                      saturation, geographic_concentration, momentum_score, cluster_label, model_version, measured_at
                    ) VALUES (
                      :trend_metric_id, :category_key, :region_key, :window_days, :growth_rate,
                      :saturation, :geographic_concentration, :momentum_score, :cluster_label, :model_version, NOW()
                    );
                    """
                ),
                {
                    "trend_metric_id": str(uuid4()),
                    "category_key": category_key,
                    "region_key": region_key,
                    "window_days": window.days,
                    "growth_rate": float(growth),
                    "saturation": float(saturation),
                    "geographic_concentration": float(geo_concentration),
                    "momentum_score": momentum,
                    "cluster_label": f"topic-{int(group['topic'].mode().iloc[0])}" if not group.empty else None,
                    "model_version": datetime.now(timezone.utc).strftime("trend-v%Y%m%d"),
                },
            )
            written += 1

    return {"computed": True, "rows_written": written}

