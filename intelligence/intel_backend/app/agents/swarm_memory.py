"""Swarm shared memory client — Python agents write/read findings here.

Writes to the `swarm_memory` Supabase table via REST API (no supabase-py dependency).
Falls back to an in-process list when SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are absent.
"""

import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from dataclasses import dataclass, field
from typing import Any

import httpx

logger = logging.getLogger("swarm.memory")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# Valid entry_type values (must match the DB CHECK constraint)
ENTRY_TYPES = frozenset(
    {"finding", "entity", "signal", "risk", "trend", "recommendation"}
)


@dataclass
class SwarmMemoryEntry:
    id: str
    agent_name: str
    entry_type: str  # finding | entity | signal | risk | trend | recommendation
    topic: str
    content: dict[str, Any]
    confidence: float = 0.5
    tags: list[str] = field(default_factory=list)
    created_at: str = ""
    expires_at: str = ""
    read_by: list[str] = field(default_factory=list)


# In-process fallback store (used when Supabase is not configured)
_local_store: list[SwarmMemoryEntry] = []


def _headers() -> dict[str, str]:
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def _is_configured() -> bool:
    return bool(SUPABASE_URL and SUPABASE_KEY)


def _local_fallback(
    agent_name: str,
    entry_type: str,
    topic: str,
    content: dict[str, Any],
    confidence: float,
    tags: list[str],
) -> str:
    """Append to the in-process store and return a local ID."""
    entry_id = f"local-{uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc)
    _local_store.append(
        SwarmMemoryEntry(
            id=entry_id,
            agent_name=agent_name,
            entry_type=entry_type,
            topic=topic,
            content=content,
            confidence=confidence,
            tags=tags,
            created_at=now.isoformat(),
            expires_at=(now + timedelta(days=7)).isoformat(),
        )
    )
    return entry_id


async def write(
    agent_name: str,
    entry_type: str,
    topic: str,
    content: dict[str, Any],
    confidence: float = 0.5,
    tags: list[str] | None = None,
) -> str:
    """Write a finding to swarm memory.

    Returns the UUID of the created row (or a local-xxxx fallback ID).

    Args:
        agent_name:  Name of the writing agent (e.g. "IKERAgent").
        entry_type:  One of ENTRY_TYPES.
        topic:       Short topic label for indexing / filtering.
        content:     Arbitrary JSON payload.
        confidence:  0.0–1.0 confidence score for this finding.
        tags:        Optional list of string tags.
    """
    if entry_type not in ENTRY_TYPES:
        logger.warning(
            "[SwarmMemory] Invalid entry_type '%s', defaulting to 'finding'", entry_type
        )
        entry_type = "finding"

    resolved_tags = tags or []

    if not _is_configured():
        entry_id = _local_fallback(
            agent_name, entry_type, topic, content, confidence, resolved_tags
        )
        logger.info("[SwarmMemory] Local write: %s/%s (id=%s)", agent_name, topic, entry_id)
        return entry_id

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{SUPABASE_URL}/rest/v1/swarm_memory",
                headers=_headers(),
                json={
                    "agent_name": agent_name,
                    "entry_type": entry_type,
                    "topic": topic,
                    "content": content,
                    "confidence": confidence,
                    "tags": resolved_tags,
                },
                timeout=10,
            )
            resp.raise_for_status()
            data = resp.json()
            entry_id: str = data[0]["id"] if data else f"unknown-{uuid.uuid4().hex[:8]}"
            logger.info(
                "[SwarmMemory] Wrote %s/%s (id=%s, confidence=%.2f)",
                agent_name, topic, entry_id, confidence,
            )
            return entry_id
    except Exception as exc:
        logger.warning("[SwarmMemory] Write failed (%s) — using local fallback", exc)
        return _local_fallback(
            agent_name, entry_type, topic, content, confidence, resolved_tags
        )


async def read_recent(
    limit: int = 20,
    entry_type: str | None = None,
    topic: str | None = None,
    min_confidence: float | None = None,
) -> list[SwarmMemoryEntry]:
    """Read the most recent swarm memory entries.

    Args:
        limit:           Max rows to return.
        entry_type:      Optional filter by entry_type.
        topic:           Optional filter by exact topic string.
        min_confidence:  Optional minimum confidence threshold.
    """
    if not _is_configured():
        entries = sorted(_local_store, key=lambda e: e.created_at, reverse=True)
        if entry_type:
            entries = [e for e in entries if e.entry_type == entry_type]
        if topic:
            entries = [e for e in entries if e.topic == topic]
        if min_confidence is not None:
            entries = [e for e in entries if e.confidence >= min_confidence]
        return entries[:limit]

    params: dict[str, str] = {
        "order": "created_at.desc",
        "limit": str(limit),
    }
    if entry_type:
        params["entry_type"] = f"eq.{entry_type}"
    if topic:
        params["topic"] = f"eq.{topic}"
    if min_confidence is not None:
        params["confidence"] = f"gte.{min_confidence}"

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/swarm_memory",
                headers=_headers(),
                params=params,
                timeout=10,
            )
            resp.raise_for_status()
            return [SwarmMemoryEntry(**row) for row in resp.json()]
    except Exception as exc:
        logger.warning("[SwarmMemory] Read failed: %s", exc)
        return []


async def mark_read(entry_id: str, reader: str) -> None:
    """Mark a swarm memory entry as read by this agent (calls DB function)."""
    if not _is_configured():
        for entry in _local_store:
            if entry.id == entry_id and reader not in entry.read_by:
                entry.read_by.append(reader)
        return

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{SUPABASE_URL}/rest/v1/rpc/swarm_memory_mark_read",
                headers=_headers(),
                json={"entry_id": entry_id, "reader": reader},
                timeout=10,
            )
            resp.raise_for_status()
    except Exception as exc:
        logger.warning("[SwarmMemory] mark_read failed: %s", exc)
