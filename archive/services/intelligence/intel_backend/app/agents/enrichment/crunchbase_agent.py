"""Crunchbase agent — startup funding intelligence (mock/placeholder).

The Crunchbase API requires an enterprise license. This agent provides
realistic mock data for development and demonstration. Replace the mock
data with real API calls when a Crunchbase API key is available.
"""

from datetime import datetime, timedelta, timezone

from ..base import AgentResult, BaseAgent


class CrunchbaseAgent(BaseAgent):
    """Placeholder agent that returns mock startup funding round data.

    Simulates querying Crunchbase for recent funding rounds in defense,
    AI, cybersecurity, and border technology sectors relevant to El Paso
    acquisition intelligence.
    """

    name = "crunchbase_funding"
    description = "Startup funding rounds (mock — Crunchbase API placeholder)"
    group = "enrichment"
    cadence_hours = 24

    # Mock data representing recent funding rounds
    MOCK_FUNDING_ROUNDS: list[dict[str, str | int | float | list[str]]] = [
        {"company": "Anduril Industries", "amount": 1_500_000_000, "round": "Series F", "sector": "Defense", "investors": ["Founders Fund", "a16z", "General Catalyst"], "hq": "Costa Mesa, CA"},
        {"company": "Shield AI", "amount": 500_000_000, "round": "Series F", "sector": "Defense/AI", "investors": ["Riot Ventures", "Point72"], "hq": "San Diego, CA"},
        {"company": "Rebellion Defense", "amount": 150_000_000, "round": "Series B", "sector": "Defense", "investors": ["NEA", "Lux Capital"], "hq": "Washington, DC"},
        {"company": "Skydio", "amount": 230_000_000, "round": "Series E", "sector": "Robotics/Drones", "investors": ["Andreessen Horowitz", "Next47"], "hq": "San Mateo, CA"},
        {"company": "Vectra AI", "amount": 100_000_000, "round": "Series F", "sector": "Cybersecurity", "investors": ["Blackstone"], "hq": "San Jose, CA"},
        {"company": "Abnormal Security", "amount": 250_000_000, "round": "Series D", "sector": "Cybersecurity", "investors": ["Wellington", "Insight Partners"], "hq": "San Francisco, CA"},
        {"company": "Sarcos Technology", "amount": 75_000_000, "round": "Series C", "sector": "Robotics", "investors": ["Caterpillar Ventures"], "hq": "Salt Lake City, UT"},
        {"company": "Hadrian", "amount": 117_000_000, "round": "Series B", "sector": "Manufacturing", "investors": ["Lux Capital", "a16z"], "hq": "Torrance, CA"},
        {"company": "Machina Labs", "amount": 65_000_000, "round": "Series B", "sector": "Manufacturing", "investors": ["Innovation Endeavors"], "hq": "Chatsworth, CA"},
        {"company": "Vannevar Labs", "amount": 75_000_000, "round": "Series B", "sector": "Defense/AI", "investors": ["DFJ Growth"], "hq": "San Francisco, CA"},
        {"company": "Epirus", "amount": 200_000_000, "round": "Series C", "sector": "Defense", "investors": ["8VC", "L3Harris"], "hq": "Torrance, CA"},
        {"company": "Fortinet", "amount": 80_000_000, "round": "Growth", "sector": "Cybersecurity", "investors": ["Strategic investors"], "hq": "Sunnyvale, CA"},
        {"company": "Hermeus", "amount": 100_000_000, "round": "Series B", "sector": "Aerospace/Defense", "investors": ["Sam Altman", "Founders Fund"], "hq": "Atlanta, GA"},
        {"company": "Gecko Robotics", "amount": 173_000_000, "round": "Series C", "sector": "Robotics/Infrastructure", "investors": ["XN", "Mark Cuban"], "hq": "Pittsburgh, PA"},
        {"company": "Applied Intuition", "amount": 250_000_000, "round": "Series E", "sector": "Autonomous Systems", "investors": ["Lux Capital", "a16z"], "hq": "Mountain View, CA"},
        {"company": "Filigran", "amount": 35_000_000, "round": "Series B", "sector": "Cybersecurity", "investors": ["Insight Partners"], "hq": "Paris, France"},
        {"company": "Second Front Systems", "amount": 50_000_000, "round": "Series B", "sector": "Defense", "investors": ["Bedrock Capital"], "hq": "Washington, DC"},
    ]

    async def run(self) -> AgentResult:
        entities: list[dict[str, str | int | float | list[str] | None]] = []
        signals: list[dict[str, str | float | None]] = []

        now = datetime.now(timezone.utc)

        for idx, round_data in enumerate(self.MOCK_FUNDING_ROUNDS):
            company = str(round_data["company"])
            amount = int(round_data["amount"])
            round_type = str(round_data["round"])
            sector = str(round_data["sector"])
            investors = round_data["investors"]
            hq = str(round_data["hq"])

            # Simulate staggered dates over the past 90 days
            mock_date = (now - timedelta(days=idx * 5 + 1)).strftime("%Y-%m-%d")

            entities.append(
                {
                    "name": company,
                    "source": "crunchbase_mock",
                    "funding_round": round_type,
                    "amount": amount,
                    "sector": sector,
                    "investors": investors,
                    "hq": hq,
                    "date": mock_date,
                }
            )

            amount_m = amount / 1_000_000
            investor_str = ", ".join(investors) if isinstance(investors, list) else str(investors)

            signals.append(
                {
                    "type": "funding_round",
                    "title": f"{round_type}: {company} raises ${amount_m:.0f}M",
                    "description": f"{company} ({sector}) closed a ${amount_m:.0f}M {round_type} led by {investor_str}. HQ: {hq}",
                    "vendor": company,
                    "amount": float(amount),
                    "confidence": 0.70,  # Lower confidence for mock data
                }
            )

        self.logger.info(
            "Crunchbase mock: %d funding rounds loaded (replace with real API when key available)",
            len(entities),
        )

        return AgentResult(
            success=True,
            entities_found=len(entities),
            signals_found=len(signals),
            data={"entities": entities, "signals": signals, "source": "mock"},
        )
