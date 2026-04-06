"""Conference agent — discovers vendors from conference exhibitor lists.

This is a placeholder agent that returns mock data. In production, it would
scrape exhibitor lists from technology conferences (AUSA, DISA TechNet,
AFCEA, CES, RSA, etc.) to discover new vendors.
"""

from ..base import AgentResult, BaseAgent

# Mock conference data — represents the kind of data real scraping would produce
MOCK_CONFERENCES = [
    {
        "conference": "AUSA 2026 Annual Meeting",
        "location": "Washington, DC",
        "exhibitors": [
            "Raytheon Technologies",
            "L3Harris Technologies",
            "Northrop Grumman",
            "General Dynamics",
            "Lockheed Martin",
            "BAE Systems",
            "Leidos",
            "SAIC",
            "Booz Allen Hamilton",
            "Palantir Technologies",
        ],
    },
    {
        "conference": "DISA TechNet Cyber 2026",
        "location": "Baltimore, MD",
        "exhibitors": [
            "CrowdStrike",
            "Palo Alto Networks",
            "Fortinet",
            "Splunk",
            "Trellix",
            "Mandiant",
            "Tenable",
            "SentinelOne",
        ],
    },
    {
        "conference": "Border Security Expo 2026",
        "location": "San Antonio, TX",
        "exhibitors": [
            "Elbit Systems",
            "FLIR Systems",
            "Anduril Industries",
            "Axon Enterprise",
            "Motorola Solutions",
            "Leonardo DRS",
        ],
    },
]


class ConferenceAgent(BaseAgent):
    """Discovers vendors from conference exhibitor lists.

    Currently returns mock data. Future versions will scrape real
    conference websites for exhibitor lists.
    """

    name = "conferences"
    description = "Vendor discovery from conference exhibitor lists"
    group = "discovery"
    cadence_hours = 168  # weekly

    async def run(self) -> AgentResult:
        entities: list[dict[str, str]] = []
        signals: list[dict[str, str | float]] = []

        for conf in MOCK_CONFERENCES:
            for exhibitor in conf["exhibitors"]:
                entities.append(
                    {
                        "name": exhibitor,
                        "source": f"conference:{conf['conference']}",
                        "conference": conf["conference"],
                        "location": conf["location"],
                    }
                )
                signals.append(
                    {
                        "type": "expansion",
                        "title": f"{exhibitor} exhibiting at {conf['conference']}",
                        "confidence": 0.85,
                    }
                )

        return AgentResult(
            success=True,
            entities_found=len(entities),
            signals_found=len(signals),
            data={"entities": entities, "signals": signals},
        )
