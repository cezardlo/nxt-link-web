"""Swarm event bus client — Python agents broadcast/send events here.

Writes to the `agent_events` Supabase table via REST API (no supabase-py dependency).
Falls back to an in-process list when SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are absent.

Table columns (from full-schema.sql):
  event_type, source_agent, target_agent, payload (jsonb), processed (bool), created_at
"""

import os
import logging
from typing import Any

import httpx

logger = logging.getLogger("swarm.bus")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# In-process fallback store (used when Supabase is not configured)
_local_events: list[dict[str, Any]] = []


def _headers() -> dict[str, str]:
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }


def _is_configured() -> bool:
    return bool(SUPABASE_URL and SUPABASE_KEY)


async def _post_event(event: dict[str, Any]) -> None:
    """POST a single event to agent_events; appends to local store on failure."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{SUPABASE_URL}/rest/v1/agent_events",
            headers=_headers(),
            json=event,
            timeout=10,
        )
        resp.raise_for_status()


async def broadcast(
    event_type: str,
    source_agent: str,
    payload: dict[str, Any] | None = None,
    tags: list[str] | None = None,
    priority: int = 5,
) -> None:
    """Broadcast an event to all agents (no specific target).

    The tags and priority values are embedded inside the payload so any
    subscribing agent can filter without an extra column.

    Args:
        event_type:   Short event identifier (e.g. "feed_ready", "risk_detected").
        source_agent: Name of the broadcasting agent.
        payload:      Arbitrary extra data to attach.
        tags:         Optional string tags for downstream filtering.
        priority:     Integer 1–10; higher = more urgent (default 5).
    """
    event: dict[str, Any] = {
        "event_type": event_type,
        "source_agent": source_agent,
        "target_agent": None,
        "payload": {**(payload or {}), "tags": tags or [], "priority": priority},
        "processed": False,
    }

    if not _is_configured():
        _local_events.append(event)
        logger.info(
            "[SwarmBus] Local broadcast: %s from %s (priority=%d)",
            event_type, source_agent, priority,
        )
        return

    try:
        await _post_event(event)
        logger.info(
            "[SwarmBus] Broadcast: %s from %s (priority=%d)",
            event_type, source_agent, priority,
        )
    except Exception as exc:
        logger.warning("[SwarmBus] Broadcast failed (%s) — using local fallback", exc)
        _local_events.append(event)


async def send(
    event_type: str,
    source_agent: str,
    target_agent: str,
    payload: dict[str, Any] | None = None,
) -> None:
    """Send a directed event to a specific agent.

    Unlike broadcast(), this sets target_agent so only the named agent should
    act on the event. The target agent is responsible for marking it processed.

    Args:
        event_type:   Short event identifier.
        source_agent: Name of the sending agent.
        target_agent: Name of the intended recipient agent.
        payload:      Arbitrary extra data to attach.
    """
    event: dict[str, Any] = {
        "event_type": event_type,
        "source_agent": source_agent,
        "target_agent": target_agent,
        "payload": payload or {},
        "processed": False,
    }

    if not _is_configured():
        _local_events.append(event)
        logger.info(
            "[SwarmBus] Local send: %s → %s (type=%s)",
            source_agent, target_agent, event_type,
        )
        return

    try:
        await _post_event(event)
        logger.info(
            "[SwarmBus] Sent: %s → %s (type=%s)",
            source_agent, target_agent, event_type,
        )
    except Exception as exc:
        logger.warning("[SwarmBus] Send failed (%s) — using local fallback", exc)
        _local_events.append(event)


async def mark_processed(event_id: str) -> None:
    """Mark an agent_events row as processed by this agent.

    Args:
        event_id: UUID of the agent_events row to mark.
    """
    if not _is_configured():
        logger.debug("[SwarmBus] mark_processed skipped (local mode): %s", event_id)
        return

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.patch(
                f"{SUPABASE_URL}/rest/v1/agent_events",
                headers={**_headers(), "Prefer": "return=minimal"},
                params={"id": f"eq.{event_id}"},
                json={"processed": True},
                timeout=10,
            )
            resp.raise_for_status()
    except Exception as exc:
        logger.warning("[SwarmBus] mark_processed failed: %s", exc)


async def poll_unprocessed(
    target_agent: str,
    limit: int = 10,
) -> list[dict[str, Any]]:
    """Fetch unprocessed events addressed to this agent (or broadcast events).

    Returns rows ordered oldest-first so agents process in arrival order.

    Args:
        target_agent: The calling agent's name.
        limit:        Max rows to return.
    """
    if not _is_configured():
        return [
            e for e in _local_events
            if not e.get("processed")
            and (e.get("target_agent") is None or e.get("target_agent") == target_agent)
        ][:limit]

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/agent_events",
                headers=_headers(),
                params={
                    "processed": "eq.false",
                    "or": f"(target_agent.is.null,target_agent.eq.{target_agent})",
                    "order": "created_at.asc",
                    "limit": str(limit),
                },
                timeout=10,
            )
            resp.raise_for_status()
            return resp.json()
    except Exception as exc:
        logger.warning("[SwarmBus] poll_unprocessed failed: %s", exc)
        return []
