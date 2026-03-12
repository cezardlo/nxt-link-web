from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

import lightgbm as lgb
import numpy as np
from sklearn.model_selection import GroupShuffleSplit
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.ranking.features import build_training_frame


FEATURE_COLUMNS = [
    "bm25_score",
    "vector_score",
    "ontology_match_score",
    "evidence_strength_score",
    "freshness_score",
    "source_reliability_score",
]


def ndcg_at_k(y_true: np.ndarray, y_score: np.ndarray, k: int = 10) -> float:
    order = np.argsort(-y_score)[:k]
    gains = (2**y_true[order] - 1) / np.log2(np.arange(2, len(order) + 2))
    dcg = gains.sum()
    ideal_order = np.argsort(-y_true)[:k]
    ideal = ((2**y_true[ideal_order] - 1) / np.log2(np.arange(2, len(ideal_order) + 2))).sum()
    return float(dcg / ideal) if ideal > 0 else 0.0


def train_ranker(db: Session) -> dict:
    df = build_training_frame(db)
    if df.empty or len(df) < 100:
        return {"trained": False, "reason": "insufficient_data"}

    gss = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
    train_idx, valid_idx = next(gss.split(df, groups=df["group_id"]))
    train_df = df.iloc[train_idx].copy()
    valid_df = df.iloc[valid_idx].copy()

    train_group = train_df.groupby("group_id").size().to_list()
    valid_group = valid_df.groupby("group_id").size().to_list()

    ranker = lgb.LGBMRanker(
        objective="lambdarank",
        n_estimators=200,
        learning_rate=0.05,
        num_leaves=31,
        min_data_in_leaf=20,
    )
    ranker.fit(
        train_df[FEATURE_COLUMNS],
        train_df["label"],
        group=train_group,
        eval_set=[(valid_df[FEATURE_COLUMNS], valid_df["label"])],
        eval_group=[valid_group],
        eval_at=[10],
    )

    valid_pred = ranker.predict(valid_df[FEATURE_COLUMNS])
    metric = ndcg_at_k(valid_df["label"].to_numpy(), np.asarray(valid_pred), k=10)

    version = datetime.now(timezone.utc).strftime("ranker-v%Y%m%d-%H%M%S")
    out_dir = Path(settings.ranker_model_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    model_path = out_dir / f"{version}.txt"
    ranker.booster_.save_model(model_path.as_posix())

    db.execute(
        text(
            """
            INSERT INTO ml_model_registry (
              model_id, model_family, model_version, stage, artifact_uri,
              metrics_json, trained_from, trained_to, created_at
            ) VALUES (
              :model_id, 'ranker', :model_version, :stage, :artifact_uri,
              :metrics_json::jsonb, NOW() - interval '30 day', NOW(), NOW()
            );
            """
        ),
        {
            "model_id": str(uuid4()),
            "model_version": version,
            "stage": "staging" if metric >= 0.35 else "candidate",
            "artifact_uri": model_path.as_posix(),
            "metrics_json": json.dumps({"ndcg@10": round(metric, 4), "samples": int(len(df))}),
        },
    )

    if metric >= 0.35:
        db.execute(
            text(
                """
                UPDATE ml_model_registry
                SET stage = CASE
                  WHEN model_family = 'ranker' AND model_version = :model_version THEN 'production'
                  WHEN model_family = 'ranker' AND stage = 'production' THEN 'archived'
                  ELSE stage
                END
                WHERE model_family = 'ranker';
                """
            ),
            {"model_version": version},
        )

    return {"trained": True, "model_version": version, "ndcg@10": metric}

