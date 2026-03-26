"""Agent 4: Connection — connect signals by company, region, topic, time, similarity."""

import logging
import uuid
from datetime import datetime, timedelta, timezone
from collections import defaultdict

import numpy as np
import networkx as nx

from pipeline.utils.db import get_db
from pipeline.utils.embeddings import embed_texts, cosine_similarity_matrix

logger = logging.getLogger("pipeline.connection")


class ConnectionAgent:
    name = "connection"

    async def run(self) -> dict:
        db = get_db()

        # Load recent non-noise signals
        cutoff = (datetime.now(timezone.utc) - timedelta(days=14)).isoformat()
        signals = db.select("intel_signals", {
            "select": "id,title,industry,signal_type,company,discovered_at,importance_score",
            "is_noise": "eq.false",
            "discovered_at": f"gte.{cutoff}",
            "importance_score": "gte.0.2",
            "order": "importance_score.desc",
            "limit": "500",
        })

        if len(signals) < 3:
            logger.info("Not enough signals to connect")
            return {"chains": 0, "connections": 0}

        # Build graph
        G = nx.Graph()
        for s in signals:
            G.add_node(s["id"], **s)

        # Index for fast lookup
        by_company = defaultdict(list)
        by_industry_type = defaultdict(list)
        for s in signals:
            if s.get("company"):
                by_company[s["company"]].append(s)
            key = (s.get("industry", ""), s.get("signal_type", ""))
            by_industry_type[key].append(s)

        connections = []

        # ── Company edges ──
        for company, sigs in by_company.items():
            for i in range(len(sigs)):
                for j in range(i + 1, len(sigs)):
                    G.add_edge(sigs[i]["id"], sigs[j]["id"], weight=1.0, reason="company")
                    connections.append((sigs[i]["id"], sigs[j]["id"], 1.0, "company"))

        # ── Topic edges (same industry + signal_type within 14 days) ──
        for key, sigs in by_industry_type.items():
            for i in range(len(sigs)):
                for j in range(i + 1, min(i + 10, len(sigs))):  # limit fan-out
                    if _days_apart(sigs[i], sigs[j]) <= 14:
                        G.add_edge(sigs[i]["id"], sigs[j]["id"], weight=0.5, reason="topic")
                        connections.append((sigs[i]["id"], sigs[j]["id"], 0.5, "topic"))

        # ── Time edges (within 48 hours) ──
        sorted_sigs = sorted(signals, key=lambda s: s.get("discovered_at", ""))
        for i in range(len(sorted_sigs)):
            for j in range(i + 1, min(i + 5, len(sorted_sigs))):
                if _days_apart(sorted_sigs[i], sorted_sigs[j]) <= 2:
                    if not G.has_edge(sorted_sigs[i]["id"], sorted_sigs[j]["id"]):
                        G.add_edge(sorted_sigs[i]["id"], sorted_sigs[j]["id"], weight=0.3, reason="time")
                        connections.append((sorted_sigs[i]["id"], sorted_sigs[j]["id"], 0.3, "time"))

        # ── Semantic edges (cosine > 0.75) ──
        titles = [s["title"] for s in signals]
        ids = [s["id"] for s in signals]
        try:
            embeddings = embed_texts(titles)
            if len(embeddings) > 0:
                sim_matrix = cosine_similarity_matrix(embeddings)
                for i in range(len(ids)):
                    for j in range(i + 1, len(ids)):
                        score = float(sim_matrix[i, j])
                        if score > 0.75 and not G.has_edge(ids[i], ids[j]):
                            G.add_edge(ids[i], ids[j], weight=score, reason="semantic")
                            connections.append((ids[i], ids[j], score, "semantic"))
        except Exception as e:
            logger.warning(f"Embedding failed: {e}")

        # ── Find event chains (connected components with 3+ signals) ──
        chains = []
        for component in nx.connected_components(G):
            if len(component) < 3:
                continue

            chain_signals = sorted(
                [G.nodes[n] for n in component],
                key=lambda s: s.get("discovered_at", ""),
            )

            # Best title = highest importance signal
            best = max(chain_signals, key=lambda s: float(s.get("importance_score", 0)))
            industries = list({s.get("industry", "") for s in chain_signals if s.get("industry")})
            companies = list({s.get("company", "") for s in chain_signals if s.get("company")})

            chain_id = str(uuid.uuid4())
            chains.append({
                "id": chain_id,
                "title": best["title"],
                "summary": f"{len(chain_signals)} connected signals across {', '.join(industries[:3])}",
                "current_node_index": len(chain_signals) - 1,
                "total_nodes": len(chain_signals),
                "progression": round(1.0, 2),
                "confidence": round(min(len(chain_signals) / 10.0, 1.0), 2),
                "industries": industries[:5],
                "regions": [],
                "status": "active",
                "signal_ids": [s["id"] for s in chain_signals],
            })

        # Write chains
        chains_written = 0
        for chain in chains[:20]:  # cap at 20 chains
            signal_ids = chain.pop("signal_ids")
            try:
                db.insert("causal_chains", chain)
                chains_written += 1

                # Write chain-signal links
                links = []
                for idx, sid in enumerate(signal_ids):
                    links.append({
                        "id": str(uuid.uuid4()),
                        "chain_id": chain["id"],
                        "signal_id": sid,
                        "node_index": idx,
                        "node_label": f"event_{idx}",
                        "relevance": 80,
                    })
                if links:
                    db.insert("causal_chain_signals", links)
            except Exception as e:
                logger.warning(f"Chain insert failed: {e}")

        # Write pairwise connections (for map)
        conns_written = 0
        for src, dst, weight, reason in connections[:500]:  # cap
            try:
                db.insert("signal_connections", {
                    "id": str(uuid.uuid4()),
                    "source_signal_id": src,
                    "target_signal_id": dst,
                    "connection_type": reason,
                    "strength": round(weight, 2),
                })
                conns_written += 1
            except Exception as e:
                # likely unique constraint, skip
                pass

        logger.info(f"Connection: {chains_written} chains, {conns_written} edges")
        return {"chains": chains_written, "connections": conns_written}


def _days_apart(a: dict, b: dict) -> float:
    """Days between two signals."""
    try:
        ta = datetime.fromisoformat(a["discovered_at"].replace("Z", "+00:00"))
        tb = datetime.fromisoformat(b["discovered_at"].replace("Z", "+00:00"))
        return abs((ta - tb).total_seconds()) / 86400
    except Exception:
        return 999
