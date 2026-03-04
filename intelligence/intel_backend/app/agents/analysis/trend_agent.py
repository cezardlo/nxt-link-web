"""Trend Analysis agent — detects technology trends and momentum signals.

Analyzes signals from other agents to calculate momentum scores,
acceleration, and sector heat. Uses mock data for initial implementation;
will consume real agent outputs when the signal pipeline is connected.
"""

from datetime import datetime, timezone

from ..base import AgentResult, BaseAgent


class TrendAgent(BaseAgent):
    """Analyzes cross-agent signals to detect technology sector trends.

    Calculates momentum scores (0-100), acceleration (positive/negative),
    and sector heat maps for the NXT//LINK platform dashboard.
    """

    name = "trend_analysis"
    description = "Technology trend detection — momentum scores, acceleration, sector heat"
    group = "analysis"
    cadence_hours = 6

    # Mock trend data representing current sector analysis
    SECTOR_TRENDS: list[dict[str, str | int | float | list[str]]] = [
        {
            "sector": "Artificial Intelligence",
            "momentum_score": 92,
            "acceleration": 8.5,
            "direction": "accelerating",
            "heat": "critical",
            "signal_count": 347,
            "top_keywords": ["LLM", "generative AI", "autonomous agents", "computer vision"],
            "top_companies": ["Anduril", "Shield AI", "Palantir", "Scale AI"],
            "narrative": "AI/ML defense applications surging. DoD budget allocation up 40% YoY. LLM integration into C4ISR systems accelerating across all branches.",
        },
        {
            "sector": "Robotics & Autonomous Systems",
            "momentum_score": 85,
            "acceleration": 12.3,
            "direction": "accelerating",
            "heat": "high",
            "signal_count": 218,
            "top_keywords": ["UAS", "autonomous vehicles", "drone swarms", "robotic process"],
            "top_companies": ["Skydio", "Sarcos", "Ghost Robotics", "Boston Dynamics"],
            "narrative": "Autonomous systems procurement wave driven by NDAA mandates. Border patrol drone programs expanding. Army Futures Command investing heavily.",
        },
        {
            "sector": "Cybersecurity",
            "momentum_score": 88,
            "acceleration": 3.2,
            "direction": "steady",
            "heat": "high",
            "signal_count": 289,
            "top_keywords": ["zero trust", "CMMC", "SOC", "threat intelligence"],
            "top_companies": ["CrowdStrike", "Palo Alto Networks", "Vectra AI", "Fortinet"],
            "narrative": "CMMC 2.0 compliance deadline driving massive DIB cybersecurity spend. Zero trust mandates across all federal agencies creating sustained demand.",
        },
        {
            "sector": "Border Security Technology",
            "momentum_score": 76,
            "acceleration": 15.8,
            "direction": "accelerating",
            "heat": "high",
            "signal_count": 142,
            "top_keywords": ["surveillance", "biometrics", "sensor tower", "CBP technology"],
            "top_companies": ["Elbit Systems", "Anduril", "Parsons", "General Dynamics"],
            "narrative": "CBP technology modernization accelerating sharply. El Paso sector seeing highest tech deployment growth. Integrated surveillance tower contracts expanding.",
        },
        {
            "sector": "Advanced Manufacturing",
            "momentum_score": 71,
            "acceleration": 6.7,
            "direction": "rising",
            "heat": "medium",
            "signal_count": 156,
            "top_keywords": ["additive manufacturing", "reshoring", "supply chain", "CHIPS Act"],
            "top_companies": ["Hadrian", "Machina Labs", "Jabil", "Flex"],
            "narrative": "CHIPS Act and defense reshoring initiatives driving manufacturing tech investment. Additive manufacturing adoption in defense supply chains growing 25% annually.",
        },
        {
            "sector": "Space & Satellite",
            "momentum_score": 68,
            "acceleration": -2.1,
            "direction": "decelerating",
            "heat": "medium",
            "signal_count": 98,
            "top_keywords": ["LEO", "SATCOM", "space domain awareness", "launch"],
            "top_companies": ["SpaceX", "L3Harris", "Northrop Grumman", "Rocket Lab"],
            "narrative": "After rapid growth, space sector showing slight deceleration as LEO constellation deployments reach maturity. SATCOM modernization remains steady.",
        },
        {
            "sector": "Energy & Grid Security",
            "momentum_score": 63,
            "acceleration": 4.4,
            "direction": "rising",
            "heat": "medium",
            "signal_count": 87,
            "top_keywords": ["grid resilience", "renewable defense", "microgrid", "battery storage"],
            "top_companies": ["Schweitzer Engineering", "Honeywell", "ED1", "Bloom Energy"],
            "narrative": "Military base energy resilience mandates creating demand for microgrids and battery storage. El Paso solar capacity expansion supporting defense installations.",
        },
        {
            "sector": "Quantum Computing",
            "momentum_score": 45,
            "acceleration": 1.8,
            "direction": "emerging",
            "heat": "low",
            "signal_count": 34,
            "top_keywords": ["quantum cryptography", "post-quantum", "qubit", "quantum sensing"],
            "top_companies": ["IBM Quantum", "IonQ", "Rigetti", "PsiQuantum"],
            "narrative": "Still early stage but post-quantum cryptography adoption accelerating as NIST standards finalize. DoD quantum sensing programs in R&D phase.",
        },
    ]

    async def run(self) -> AgentResult:
        entities: list[dict[str, str | int | float | list[str] | None]] = []
        signals: list[dict[str, str | float | None]] = []

        now = datetime.now(timezone.utc).isoformat()

        for trend in self.SECTOR_TRENDS:
            sector = str(trend["sector"])
            momentum = int(trend["momentum_score"])
            acceleration = float(trend["acceleration"])
            direction = str(trend["direction"])
            heat = str(trend["heat"])
            signal_count = int(trend["signal_count"])
            narrative = str(trend["narrative"])

            entities.append(
                {
                    "name": sector,
                    "source": "trend_analysis",
                    "type": "sector_trend",
                    "momentum_score": momentum,
                    "acceleration": acceleration,
                    "direction": direction,
                    "heat_level": heat,
                    "signal_count": signal_count,
                    "top_keywords": trend["top_keywords"],
                    "top_companies": trend["top_companies"],
                    "narrative": narrative,
                    "timestamp": now,
                }
            )

            # Generate signal for high-heat or accelerating sectors
            if heat in ("critical", "high") or acceleration > 10:
                signal_type = "trend_alert" if heat == "critical" else "trend_signal"
                signals.append(
                    {
                        "type": signal_type,
                        "title": f"TREND: {sector} — momentum {momentum}/100 ({direction})",
                        "description": narrative[:200],
                        "sector": sector,
                        "momentum_score": float(momentum),
                        "acceleration": acceleration,
                        "confidence": min(0.95, momentum / 100),
                    }
                )

        # Compute aggregate heat map
        heat_map = {
            str(t["sector"]): {
                "momentum": int(t["momentum_score"]),
                "heat": str(t["heat"]),
                "acceleration": float(t["acceleration"]),
            }
            for t in self.SECTOR_TRENDS
        }

        self.logger.info(
            "Trend analysis complete: %d sectors analyzed, %d high-heat signals",
            len(self.SECTOR_TRENDS),
            len(signals),
        )

        return AgentResult(
            success=True,
            entities_found=len(entities),
            signals_found=len(signals),
            data={
                "trends": entities,
                "signals": signals,
                "heat_map": heat_map,
                "analysis_timestamp": now,
            },
        )
