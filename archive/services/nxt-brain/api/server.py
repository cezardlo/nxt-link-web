import os
from collections import Counter
from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from data.supabase import get_db

app = FastAPI(title="NXT Brain API", version="1.0.0")

allowed_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "*").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if allowed_origins else ["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _to_num(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except Exception:
        return default


def _signal_importance(row: Dict[str, Any]) -> float:
    return _to_num(row.get("importance_score", row.get("confidence", 0.0)), 0.0)


def _signal_type(row: Dict[str, Any]) -> str:
    return str(row.get("signal_type") or row.get("type") or "general")


def _industry(row: Dict[str, Any]) -> str:
    return str(row.get("industry") or row.get("category") or "General")


def _company(row: Dict[str, Any]) -> str | None:
    value = row.get("company") or row.get("vendor_name") or row.get("vendor")
    return str(value) if value else None


def _discovered_at(row: Dict[str, Any]) -> str:
    return str(
        row.get("detected_at")
        or row.get("published_at")
        or row.get("created_at")
        or _now_iso()
    )


def _to_brain_signal(row: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "title": str(row.get("title") or "Untitled signal"),
        "signal_type": _signal_type(row),
        "industry": _industry(row),
        "company": _company(row),
        "importance": round(_signal_importance(row), 4),
        "discovered_at": _discovered_at(row),
        "url": row.get("url"),
    }


def _decision_from_signal(signal: Dict[str, Any]) -> Dict[str, Any]:
    signal_type = str(signal.get("signal_type") or "general")
    importance = _to_num(signal.get("importance"), 0.0)
    title = str(signal.get("title") or "Signal update")
    industry = str(signal.get("industry") or "General")

    if signal_type == "regulatory_action":
        return {
            "type": "ACT_BEFORE_DATE",
            "headline": "A regulation is changing, move within 90 days",
            "detail": title[:140],
            "timeline": "90 days",
        }
    if importance >= 0.85:
        return {
            "type": "WATCH_THIS",
            "headline": f"Watch {industry}, urgency is rising",
            "detail": title[:140],
            "timeline": "72 hours",
        }
    return {
        "type": "KEEP_WATCHING",
        "headline": f"Track {industry} this week",
        "detail": title[:140],
        "trigger": "Contract award or funding round > $50M",
    }


def _safe_select(table: str, params: Dict[str, str] | None = None) -> List[Dict[str, Any]]:
    client = get_db()
    if client is None:
        return []
    try:
        return client.select(table, params=params)
    except Exception:
        return []


def _map_dots(signals: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    dots: List[Dict[str, Any]] = []
    for index, signal in enumerate(signals):
        title = str(signal.get("title") or "")
        total = sum(ord(ch) for ch in title) + index * 97
        x = abs(total % 100)
        y = abs((total * 7) % 100)
        importance = _to_num(signal.get("importance"), 0.0)
        tier = "P0" if importance >= 0.85 else "P1" if importance >= 0.65 else "P2"
        dots.append({"id": f"dot-{index}", "x": x, "y": y, "tier": tier})
    return dots


@app.get("/")
def read_root() -> Dict[str, str]:
    return {"message": "NXT Brain online"}


@app.get("/health")
def health() -> Dict[str, str]:
    return {"ok": "true", "time": _now_iso()}


@app.get("/api/morning")
def api_morning() -> Dict[str, Any]:
    rows = _safe_select(
        "intel_signals",
        params={"select": "*", "order": "detected_at.desc", "limit": "20"},
    )
    top_signals = [_to_brain_signal(r) for r in rows[:10]]
    companies = {s["company"] for s in top_signals if s.get("company")}

    sectors = Counter([str(s["industry"]) for s in top_signals])
    sector_snapshots = [
        {
            "sector": sector,
            "momentum": "accelerating" if count >= 3 else "steady",
            "signal_count": count,
        }
        for sector, count in sectors.most_common(6)
    ]

    runs = _safe_select(
        "agent_runs",
        params={
            "select": "id,agent_id,status,started_at,finished_at,items_processed,error_message,metadata",
            "order": "started_at.desc",
            "limit": "5",
        },
    )

    risk_signal = next((s for s in top_signals if _to_num(s.get("importance"), 0.0) >= 0.9), None)
    decision = _decision_from_signal(top_signals[0]) if top_signals else {
        "type": "KEEP_WATCHING",
        "headline": "Intelligence pipeline warming up",
        "detail": "Signals are loading from the latest scan. Refresh in a moment.",
        "trigger": "New high-priority signal appears",
    }

    return {
        "one_thing": decision,
        "top_signals": top_signals,
        "industry_movement": sector_snapshots,
        "morning_brief": {
            "sector_snapshots": sector_snapshots,
            "risk_alert": {
                "active": bool(risk_signal),
                "message": (risk_signal or {}).get("title", ""),
            },
        },
        "changed": {
            "new_companies": len(companies),
            "new_signals": len(top_signals),
            "new_connections": 0,
            "needs_attention": [risk_signal["title"]] if risk_signal else [],
        },
        "agent_runs": runs,
    }


@app.get("/api/signals")
def api_signals() -> Dict[str, Any]:
    rows = _safe_select(
        "intel_signals",
        params={"select": "*", "order": "detected_at.desc", "limit": "80"},
    )
    signals = [_to_brain_signal(r) for r in rows]
    return {
        "signals": signals,
        "trends": [],
        "forecasts": [],
        "opportunities": [],
        "connections": [],
        "enriched_signals": [],
    }


@app.get("/api/map/world")
def api_map_world() -> Dict[str, Any]:
    rows = _safe_select(
        "intel_signals",
        params={"select": "*", "order": "detected_at.desc", "limit": "100"},
    )
    signals = [_to_brain_signal(r) for r in rows]
    return {"signals": signals, "dots": _map_dots(signals)}


@app.get("/api/world/{topic}")
def api_world(topic: str) -> Dict[str, Any]:
    rows = _safe_select(
        "intel_signals",
        params={"select": "*", "order": "detected_at.desc", "limit": "40"},
    )
    normalized = topic.strip().lower()
    signals = [_to_brain_signal(r) for r in rows]
    matched = [
        s
        for s in signals
        if normalized in str(s["industry"]).lower() or normalized in str(s["title"]).lower()
    ][:6]
    sample = matched[0]["title"] if matched else f"No immediate signal for {topic}"
    return {
        "topic": topic,
        "global": f"Global movement is visible around {topic}.",
        "heading": sample,
        "el_paso": f"Use this signal to evaluate El Paso opportunities for {topic}.",
        "signals": [
            {
                "title": m["title"],
                "category": m["industry"],
                "source": m.get("company") or "intelligence feed",
                "published": m["discovered_at"],
                "url": m.get("url") or "",
            }
            for m in matched
        ],
    }


@app.get("/api/industry/{industry}")
def api_industry(industry: str) -> Dict[str, Any]:
    rows = _safe_select(
        "intel_signals",
        params={"select": "*", "order": "detected_at.desc", "limit": "120"},
    )
    target = industry.strip().lower()
    signals = [_to_brain_signal(r) for r in rows]
    filtered = [s for s in signals if target in str(s["industry"]).lower()] if target != "all" else signals
    sectors = Counter([str(s["industry"]) for s in filtered])
    trending = [
        {"name": sector, "momentum": "accelerating" if count >= 4 else "steady", "signal_count": count}
        for sector, count in sectors.most_common(8)
    ]
    return {
        "industry": industry,
        "trending_sectors": trending,
        "resources": {
            "technologies": [],
            "products": [],
            "vendors": [],
            "conferences": [],
            "intel_signals": filtered[:24],
        },
    }


@app.get("/api/resources/{topic}")
def api_resources(topic: str) -> Dict[str, Any]:
    rows = _safe_select(
        "intel_signals",
        params={"select": "*", "order": "detected_at.desc", "limit": "80"},
    )
    q = topic.strip().lower()
    signals = [_to_brain_signal(r) for r in rows]
    results = [
        s
        for s in signals
        if q in str(s["title"]).lower() or q in str(s["industry"]).lower() or q in str(s.get("company") or "").lower()
    ][:20]

    decision = (
        _decision_from_signal(results[0])
        if results
        else {
            "type": "KEEP_WATCHING",
            "headline": "No strong signal yet",
            "detail": "Data is still loading for this topic.",
            "trigger": "A new signal crosses threshold",
        }
    )
    return {"topic": topic, "decision": decision, "results": results}


class DecideRequest(BaseModel):
    question: str


@app.post("/api/decide")
def api_decide(payload: DecideRequest) -> Dict[str, Any]:
    question = payload.question.strip()
    decision = {
        "type": "WATCH_THIS",
        "headline": "Prioritize evidence-backed vendor conversations",
        "detail": f"Question received: {question[:140]}",
        "trigger": "New P0 signal or contract alert",
    }
    return {"decision": decision, "response": {"question": question, "generated_at": _now_iso()}}
