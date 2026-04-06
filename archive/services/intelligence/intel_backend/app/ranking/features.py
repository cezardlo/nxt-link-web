from __future__ import annotations

import pandas as pd
from sqlalchemy import text
from sqlalchemy.orm import Session


LABEL_MAP = {
    "impression": 0,
    "click": 1,
    "save": 2,
    "edit": 3,
    "reject": 0,
}


def build_training_frame(db: Session, lookback_days: int = 30) -> pd.DataFrame:
    rows = db.execute(
        text(
            """
            SELECT
              sr.search_result_id,
              sr.session_id,
              sr.truth_card_id,
              sr.bm25_score,
              sr.vector_score,
              sr.ontology_match_score,
              sr.evidence_strength_score,
              sr.freshness_score,
              sr.source_reliability_score,
              sr.final_score,
              COALESCE(u.action::text, 'impression') AS action
            FROM search_results sr
            LEFT JOIN user_feedback_events u ON u.search_result_id = sr.search_result_id
            WHERE sr.created_at >= NOW() - (:lookback_days || ' days')::interval;
            """
        ),
        {"lookback_days": lookback_days},
    ).mappings().all()

    if not rows:
        return pd.DataFrame()

    df = pd.DataFrame(rows)
    df["label"] = df["action"].map(LABEL_MAP).fillna(0).astype(int)
    df["group_id"] = df["session_id"]
    return df

