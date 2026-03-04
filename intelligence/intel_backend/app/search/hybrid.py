from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

import numpy as np
from sentence_transformers import SentenceTransformer
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings

_embedder: SentenceTransformer | None = None


def _get_embedder() -> SentenceTransformer:
    global _embedder
    if _embedder is None:
        _embedder = SentenceTransformer(settings.embedding_model_name)
    return _embedder


def embed_query(query: str) -> list[float]:
    vector = _get_embedder().encode([query], normalize_embeddings=True)[0]
    return np.asarray(vector, dtype=float).tolist()


def hybrid_search(db: Session, user_id: str, query: str, limit: int = 20) -> dict[str, Any]:
    query_embedding = embed_query(query)
    session_id = str(uuid4())

    db.execute(
        text(
            """
            INSERT INTO search_sessions (session_id, user_id, query_text, query_embedding, filters_json, created_at)
            VALUES (:session_id, :user_id, :query_text, :query_embedding, '{}'::jsonb, NOW());
            """
        ),
        {
            "session_id": session_id,
            "user_id": user_id,
            "query_text": query,
            "query_embedding": query_embedding,
        },
    )

    rows = db.execute(
        text(
            """
            WITH ranked AS (
              SELECT
                t.truth_card_id,
                t.vendor_name,
                t.card_text,
                ts_rank_cd(t.card_text_tsv, plainto_tsquery('english', :query)) AS bm25_score,
                (1 - (t.card_embedding <=> :query_embedding)) AS vector_score,
                t.confidence AS evidence_strength_score,
                EXTRACT(EPOCH FROM (NOW() - t.updated_at)) / 86400.0 AS age_days,
                s.reliability_score AS source_reliability_score
              FROM vendor_truth_cards t
              JOIN sources s ON s.source_id = t.source_id
              WHERE t.review_status IN ('auto_accepted', 'reviewed')
              ORDER BY (ts_rank_cd(t.card_text_tsv, plainto_tsquery('english', :query)) * 0.55
                    + (1 - (t.card_embedding <=> :query_embedding)) * 0.45) DESC
              LIMIT 300
            )
            SELECT
              truth_card_id,
              vendor_name,
              card_text,
              bm25_score,
              vector_score,
              evidence_strength_score,
              source_reliability_score,
              GREATEST(0, 1 - (age_days / 180.0)) AS freshness_score,
              (
                bm25_score * 0.35
                + vector_score * 0.32
                + evidence_strength_score * 0.12
                + source_reliability_score * 0.11
                + GREATEST(0, 1 - (age_days / 180.0)) * 0.10
              ) AS final_score
            FROM ranked
            ORDER BY final_score DESC
            LIMIT :limit;
            """
        ),
        {"query": query, "query_embedding": query_embedding, "limit": limit},
    ).mappings().all()

    results = []
    for idx, row in enumerate(rows):
        search_result_id = str(uuid4())
        db.execute(
            text(
                """
                INSERT INTO search_results (
                  search_result_id, session_id, truth_card_id, rank_position,
                  bm25_score, vector_score, ontology_match_score, evidence_strength_score,
                  freshness_score, source_reliability_score, feedback_boost_score,
                  final_score, ranker_version, created_at
                ) VALUES (
                  :search_result_id, :session_id, :truth_card_id, :rank_position,
                  :bm25_score, :vector_score, :ontology_match_score, :evidence_strength_score,
                  :freshness_score, :source_reliability_score, 0,
                  :final_score, :ranker_version, :created_at
                );
                """
            ),
            {
                "search_result_id": search_result_id,
                "session_id": session_id,
                "truth_card_id": row["truth_card_id"],
                "rank_position": idx + 1,
                "bm25_score": float(row["bm25_score"] or 0),
                "vector_score": float(row["vector_score"] or 0),
                "ontology_match_score": 0.0,
                "evidence_strength_score": float(row["evidence_strength_score"] or 0),
                "freshness_score": float(row["freshness_score"] or 0),
                "source_reliability_score": float(row["source_reliability_score"] or 0),
                "final_score": float(row["final_score"] or 0),
                "ranker_version": "hybrid-baseline-v1",
                "created_at": datetime.now(timezone.utc),
            },
        )
        results.append(
            {
                "search_result_id": search_result_id,
                "truth_card_id": row["truth_card_id"],
                "vendor_name": row["vendor_name"],
                "summary": (row["card_text"] or "")[:260],
                "bm25_score": float(row["bm25_score"] or 0),
                "vector_score": float(row["vector_score"] or 0),
                "final_score": float(row["final_score"] or 0),
            }
        )

    return {"session_id": session_id, "results": results}

