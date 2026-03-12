from __future__ import annotations

from fastapi import Depends, FastAPI, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.crawler.registry import create_source, enqueue_due_sources
from app.db import SessionLocal, get_db
from app.logging import configure_logging
from app.narrative.generator import NarrativeInput, generate_executive_brief
from app.ranking.train import train_ranker
from app.schemas import FeedbackEventIn, SearchRequest, SourceCreate
from app.search.hybrid import hybrid_search
from app.state.engine import StateInput, infer_state
from app.trends.engine import compute_trend_metrics

configure_logging()
app = FastAPI(title="NXT Link Intelligence Backend", version="0.1.0")


class ExecutiveBriefRequest(BaseModel):
    mission: str = Field(min_length=5, max_length=240)
    current_movement: str = Field(min_length=3, max_length=320)
    risk: str = Field(min_length=3, max_length=320)
    opportunity_gap: str = Field(min_length=3, max_length=320)
    deployment_readiness: str = Field(min_length=3, max_length=320)
    growth_rate: float
    saturation: float = Field(ge=0, le=1)
    geographic_density: float = Field(ge=0, le=1)
    maturity_shift: float = Field(ge=-1, le=1)
    momentum_score: float = Field(ge=0, le=1)
    confidence_level: float = Field(ge=0, le=1)


class MissionAnalyzeRequest(BaseModel):
    mission: str = Field(min_length=4, max_length=240)
    mode: str = Field(default="executive")
    timeRange: int = Field(default=90, ge=30, le=180)
    layers: list[str] = Field(default_factory=lambda: ["vendors", "momentum", "risk"])


class FeedbackLiteRequest(BaseModel):
    truth_card_id: str
    action: str = Field(pattern="^(impression|click|save|reject|edit)$")
    user_id: str = "command-ui"
    dwell_ms: int | None = Field(default=None, ge=0)


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _geo_for_region(region: str | None) -> tuple[float, float]:
    mapping = {
        "united states": (37.0902, -95.7129),
        "mexico": (23.6345, -102.5528),
        "germany": (51.1657, 10.4515),
        "japan": (36.2048, 138.2529),
        "india": (20.5937, 78.9629),
        "singapore": (1.3521, 103.8198),
        "spain": (40.4637, -3.7492),
        "united kingdom": (55.3781, -3.4360),
        "canada": (56.1304, -106.3468),
        "france": (46.2276, 2.2137),
    }
    if not region:
        return (39.8283, -98.5795)
    normalized = region.strip().lower()
    return mapping.get(normalized, (39.8283, -98.5795))


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.post("/sources")
def register_source(payload: SourceCreate, db: Session = Depends(get_db)) -> dict:
    source = create_source(db, payload)
    db.commit()
    return {"source_id": source.source_id, "name": source.name}


@app.post("/scheduler/tick")
def scheduler_tick(db: Session = Depends(get_db)) -> dict:
    queued = enqueue_due_sources(db)
    db.commit()
    return {"queued": queued}


@app.post("/search")
def search(payload: SearchRequest, db: Session = Depends(get_db)) -> dict:
    result = hybrid_search(db, user_id=payload.user_id, query=payload.query, limit=payload.limit)
    db.commit()
    return result


@app.post("/feedback")
def feedback(payload: FeedbackEventIn, db: Session = Depends(get_db)) -> dict:
    exists = db.scalar(
        text("SELECT 1 FROM search_results WHERE search_result_id = :id LIMIT 1"),
        {"id": str(payload.search_result_id)},
    )
    if not exists:
        raise HTTPException(status_code=404, detail="search_result_id not found")

    db.execute(
        text(
            """
            INSERT INTO user_feedback_events (
              event_id, search_result_id, truth_card_id, user_id, action, dwell_ms, edited_labels_json, created_at
            ) VALUES (
              gen_random_uuid(), :search_result_id, :truth_card_id, :user_id, :action, :dwell_ms, :edited_labels_json::jsonb, NOW()
            );
            """
        ),
        {
            "search_result_id": str(payload.search_result_id),
            "truth_card_id": str(payload.truth_card_id),
            "user_id": payload.user_id,
            "action": payload.action,
            "dwell_ms": payload.dwell_ms,
            "edited_labels_json": payload.edited_labels if payload.edited_labels is not None else "{}",
        },
    )
    db.commit()
    return {"ok": True}


@app.post("/ml/train-ranker")
def train_ranker_endpoint() -> dict:
    with SessionLocal() as db:
        result = train_ranker(db)
        db.commit()
        return result


@app.post("/trends/compute")
def compute_trends_endpoint() -> dict:
    with SessionLocal() as db:
        result = compute_trend_metrics(db)
        db.commit()
        return result


@app.post("/briefings/executive")
def generate_executive_briefing(payload: ExecutiveBriefRequest) -> dict:
    state = infer_state(
        StateInput(
            growth_rate=payload.growth_rate,
            saturation=payload.saturation,
            geographic_density=payload.geographic_density,
            maturity_shift=payload.maturity_shift,
            momentum_score=payload.momentum_score,
            confidence=payload.confidence_level,
        )
    )
    briefing = generate_executive_brief(
        NarrativeInput(
            mission=payload.mission,
            current_movement=payload.current_movement,
            risk=payload.risk,
            opportunity_gap=payload.opportunity_gap,
            deployment_readiness=payload.deployment_readiness,
            confidence_level=payload.confidence_level,
        ),
        state=state,
    )
    return {"state": state.state, "state_rationale": state.rationale, "briefing": briefing}


@app.post("/api/mission/analyze")
def mission_analyze(payload: MissionAnalyzeRequest, db: Session = Depends(get_db)) -> dict:
    window_days = payload.timeRange if payload.timeRange in (30, 90, 180) else 90
    search_output = hybrid_search(db, user_id="command-mission", query=payload.mission, limit=8)

    trend_rows = db.execute(
        text(
            """
            SELECT category_key, growth_rate, saturation, geographic_concentration, momentum_score
            FROM trend_metrics
            WHERE window_days = :window_days
            ORDER BY measured_at DESC, momentum_score DESC
            LIMIT 8;
            """
        ),
        {"window_days": window_days},
    ).mappings().all()

    if trend_rows:
        lead = trend_rows[0]
        growth_rate = float(lead["growth_rate"] or 0)
        saturation = float(lead["saturation"] or 0)
        geo_density = float(1 - float(lead["geographic_concentration"] or 0))
        momentum = float(lead["momentum_score"] or 0)
        movement = [
            {
                "category": row["category_key"],
                "growth_rate": float(row["growth_rate"] or 0),
                "saturation": float(row["saturation"] or 0),
                "geo_density": float(1 - float(row["geographic_concentration"] or 0)),
                "momentum": float(row["momentum_score"] or 0),
            }
            for row in trend_rows
        ]
    else:
        growth_rate, saturation, geo_density, momentum = 0.08, 0.4, 0.35, 0.55
        movement = [
            {
                "category": "Industrial AI",
                "growth_rate": growth_rate,
                "saturation": saturation,
                "geo_density": geo_density,
                "momentum": momentum,
            }
        ]

    ranked_results = search_output.get("results", [])
    avg_confidence = (
        sum(float(result.get("final_score", 0)) for result in ranked_results) / max(1, len(ranked_results))
    )
    confidence = _clamp(avg_confidence * 0.72 + momentum * 0.28, 0.2, 0.96)

    state = infer_state(
        StateInput(
            growth_rate=growth_rate,
            saturation=saturation,
            geographic_density=geo_density,
            maturity_shift=momentum - 0.5,
            momentum_score=momentum,
            confidence=confidence,
        )
    )

    current_movement = f"{movement[0]['category']} momentum at {round(movement[0]['momentum'] * 100)}%"
    risk = (
        "Low evidence density in ranked search results."
        if len(ranked_results) < 3
        else "Signal quality is acceptable; watch low-confidence classifications."
    )
    opportunity = (
        f"{movement[0]['category']} is leading current momentum profile."
        if movement
        else "No trend movement detected in current window."
    )
    readiness = (
        f"{len(ranked_results)} ranked vendors available for pilot shortlist."
        if ranked_results
        else "No ranked vendors yet; ingest additional sources first."
    )

    briefing = generate_executive_brief(
        NarrativeInput(
            mission=payload.mission,
            current_movement=current_movement,
            risk=risk,
            opportunity_gap=opportunity,
            deployment_readiness=readiness,
            confidence_level=confidence,
        ),
        state=state,
    )

    return {
        "mode": payload.mode,
        "mission": payload.mission,
        "time_range_days": window_days,
        "state": state.state,
        "state_rationale": state.rationale,
        "briefing": briefing,
        "confidence": round(confidence, 4),
        "top_vendors": ranked_results[:5],
        "movement": movement[:6],
    }


@app.get("/api/map/layers")
def map_layers(
    timeRange: int = Query(default=90),
    _mode: str = Query(default="executive"),
    db: Session = Depends(get_db),
) -> dict:
    window_days = timeRange if timeRange in (30, 90, 180) else 90

    truth_rows = db.execute(
        text(
            """
            SELECT truth_card_id, vendor_name, industries_mentioned, source_id, source_reliability_score, confidence,
                   geographic_signals, created_at
            FROM (
              SELECT t.truth_card_id, t.vendor_name, t.industries_mentioned, t.source_id, t.confidence,
                     t.geographic_signals, t.created_at, s.reliability_score as source_reliability_score
              FROM vendor_truth_cards t
              JOIN sources s ON s.source_id = t.source_id
              WHERE t.created_at >= NOW() - (:window_days || ' day')::interval
            ) scoped
            ORDER BY created_at DESC
            LIMIT 250;
            """
        ),
        {"window_days": window_days},
    ).mappings().all()

    signal_rows = db.execute(
        text(
            """
            SELECT signal_id, signal_type, region_key, category_key, count_value, observed_date
            FROM trend_signals
            WHERE observed_date >= CURRENT_DATE - (:window_days || ' day')::interval
            ORDER BY observed_date DESC
            LIMIT 400;
            """
        ),
        {"window_days": window_days},
    ).mappings().all()

    vendor_points = []
    risk_points = []
    for row in truth_rows:
        geo_region = (row["geographic_signals"] or ["United States"])[0]
        lat, lon = _geo_for_region(geo_region)
        confidence = float(row["confidence"] or 0.5)
        vendor_points.append(
            {
                "id": row["truth_card_id"],
                "lat": lat,
                "lon": lon,
                "weight": round(confidence * 100),
                "confidence": confidence,
                "label": row["vendor_name"],
                "category": (row["industries_mentioned"] or ["General"])[0],
                "source_type": "vendors",
                "entity_id": row["truth_card_id"],
            }
        )
        if confidence < 0.78:
            risk_points.append(
                {
                    "id": f"risk-{row['truth_card_id']}",
                    "lat": lat,
                    "lon": lon,
                    "weight": round((1 - confidence) * 100),
                    "confidence": 1 - confidence,
                    "label": f"{row['vendor_name']} risk",
                    "category": "classification-risk",
                    "source_type": "risk",
                    "entity_id": row["truth_card_id"],
                }
            )

    signal_layers = {
        "momentum": [],
        "patents": [],
        "hiring": [],
        "conferences": [],
        "funding": [],
        "pilots": [],
    }
    for row in signal_rows:
        lat, lon = _geo_for_region(row["region_key"])
        record = {
            "id": row["signal_id"],
            "lat": lat,
            "lon": lon,
            "weight": int(row["count_value"] or 0),
            "confidence": 0.82,
            "label": row["category_key"],
            "category": row["region_key"],
            "source_type": row["signal_type"],
        }
        signal_layers["momentum"].append(record)
        if row["signal_type"] == "patents":
            signal_layers["patents"].append(record)
        elif row["signal_type"] == "jobs":
            signal_layers["hiring"].append(record)
        elif row["signal_type"] == "exhibitors":
            signal_layers["conferences"].append(record)
        elif row["signal_type"] == "launches":
            signal_layers["funding"].append(record)
        elif row["signal_type"] == "github":
            signal_layers["pilots"].append(record)

    return {
        "as_of": datetime.now(timezone.utc).isoformat(),
        "time_range_days": window_days,
        "available_layers": [
            {"id": "vendors", "group": "Vendors", "label": "Vendors"},
            {"id": "momentum", "group": "Momentum", "label": "Momentum"},
            {"id": "patents", "group": "Patents", "label": "Patents"},
            {"id": "hiring", "group": "Hiring", "label": "Hiring"},
            {"id": "conferences", "group": "Conferences", "label": "Conferences"},
            {"id": "funding", "group": "Funding", "label": "Funding"},
            {"id": "pilots", "group": "Pilots", "label": "Pilots"},
            {"id": "risk", "group": "Risk", "label": "Risk"},
        ],
        "layers": {
            "vendors": vendor_points,
            "momentum": signal_layers["momentum"],
            "patents": signal_layers["patents"],
            "hiring": signal_layers["hiring"],
            "conferences": signal_layers["conferences"],
            "funding": signal_layers["funding"],
            "pilots": signal_layers["pilots"],
            "risk": risk_points,
        },
    }


@app.get("/api/vendors/search")
def vendors_search(
    q: str = Query(min_length=1),
    user_id: str = Query(default="command-ui"),
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
) -> dict:
    result = hybrid_search(db, user_id=user_id, query=q, limit=limit)
    db.commit()
    return {"query": q, "total": len(result.get("results", [])), "results": result.get("results", [])}


@app.get("/api/vendors/{truth_card_id}")
def vendor_detail(truth_card_id: str, db: Session = Depends(get_db)) -> dict:
    row = db.execute(
        text(
            """
            SELECT t.truth_card_id, t.vendor_name, t.product_names, t.capabilities, t.industries_mentioned,
                   t.integrations_mentioned, t.deployment_type, t.geographic_signals, t.confidence, t.source_id,
                   s.reliability_score
            FROM vendor_truth_cards t
            JOIN sources s ON s.source_id = t.source_id
            WHERE t.truth_card_id = :truth_card_id
            LIMIT 1;
            """
        ),
        {"truth_card_id": truth_card_id},
    ).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Vendor not found")

    snippets = db.execute(
        text(
            """
            SELECT quote_text, url
            FROM evidence_snippets
            WHERE capture_id = (
              SELECT capture_id FROM vendor_truth_cards WHERE truth_card_id = :truth_card_id LIMIT 1
            )
            ORDER BY created_at DESC
            LIMIT 8;
            """
        ),
        {"truth_card_id": truth_card_id},
    ).mappings().all()

    return {
        "id": row["truth_card_id"],
        "vendor_name": row["vendor_name"],
        "product_names": row["product_names"] or [],
        "capabilities": row["capabilities"] or [],
        "industries": row["industries_mentioned"] or [],
        "integrations": row["integrations_mentioned"] or [],
        "deployment_type": row["deployment_type"],
        "geo_signals": row["geographic_signals"] or [],
        "confidence": float(row["confidence"] or 0),
        "source_reliability": float(row["reliability_score"] or 0),
        "evidence_snippets": [
            {"quote": snippet["quote_text"], "url": snippet["url"]} for snippet in snippets
        ],
    }


@app.post("/api/feedback")
def feedback_lite(payload: FeedbackLiteRequest, db: Session = Depends(get_db)) -> dict:
    result_id = db.scalar(
        text(
            """
            SELECT search_result_id
            FROM search_results
            WHERE truth_card_id = :truth_card_id
            ORDER BY created_at DESC
            LIMIT 1;
            """
        ),
        {"truth_card_id": payload.truth_card_id},
    )

    if result_id:
        db.execute(
            text(
                """
                INSERT INTO user_feedback_events (
                  event_id, search_result_id, truth_card_id, user_id, action, dwell_ms, edited_labels_json, created_at
                ) VALUES (
                  gen_random_uuid(), :search_result_id, :truth_card_id, :user_id, :action::feedback_action, :dwell_ms, '{}'::jsonb, NOW()
                );
                """
            ),
            {
                "search_result_id": str(result_id),
                "truth_card_id": payload.truth_card_id,
                "user_id": payload.user_id,
                "action": payload.action,
                "dwell_ms": payload.dwell_ms,
            },
        )
    else:
        db.execute(
            text(
                """
                INSERT INTO audit_log (audit_id, actor, action, entity_type, entity_id, trace_id, created_at)
                VALUES (gen_random_uuid(), :actor, :action, 'truth_card', :entity_id, 'feedback-lite', NOW());
                """
            ),
            {
                "actor": payload.user_id,
                "action": f"feedback:{payload.action}",
                "entity_id": payload.truth_card_id,
            },
        )
    db.commit()
    return {"ok": True}
