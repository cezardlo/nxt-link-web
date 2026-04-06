"""Patent agent — fetches recent patent filings from USPTO PatentsView API."""

import httpx

from ..base import AgentResult, BaseAgent


class PatentAgent(BaseAgent):
    """Searches USPTO PatentsView for recent technology patent filings.

    Identifies companies filing patents in defense, AI, cybersecurity,
    border tech, and related sectors.
    """

    name = "patents"
    description = "Recent patent filings from USPTO PatentsView"
    group = "discovery"
    cadence_hours = 24

    API_URL = "https://api.patentsview.org/patents/query"

    TECH_CPC_GROUPS = [
        "G06N",   # Computing arrangements based on specific computational models (AI/ML)
        "G06F",   # Electric digital data processing
        "H04L",   # Transmission of digital information (networking/cyber)
        "F41",    # Weapons (defense)
        "G01S",   # Radio direction-finding, navigation (radar, guidance)
        "B64",    # Aircraft, aviation (drones, UAV)
        "G08G",   # Traffic control systems (border/logistics)
    ]

    async def run(self) -> AgentResult:
        entities: list[dict[str, str | None]] = []
        signals: list[dict[str, str | float | None]] = []

        async with httpx.AsyncClient(timeout=30) as client:
            for cpc in self.TECH_CPC_GROUPS:
                try:
                    payload = {
                        "q": {
                            "_and": [
                                {"_gte": {"patent_date": "2025-01-01"}},
                                {"_begins": {"cpc_group_id": cpc}},
                            ]
                        },
                        "f": [
                            "patent_id",
                            "patent_title",
                            "patent_abstract",
                            "patent_date",
                            "patent_number",
                            "assignee_organization",
                        ],
                        "o": {"per_page": 25},
                        "s": [{"patent_date": "desc"}],
                    }

                    resp = await client.post(self.API_URL, json=payload)
                    if resp.status_code != 200:
                        self.logger.warning(
                            "PatentsView CPC %s returned %d", cpc, resp.status_code
                        )
                        continue

                    data = resp.json()
                    for patent in data.get("patents", []):
                        assignee = (patent.get("assignee_organization") or [""])[0]
                        title = patent.get("patent_title", "")
                        if not title:
                            continue

                        if assignee:
                            entities.append(
                                {
                                    "name": assignee,
                                    "source": "uspto",
                                    "cpc_group": cpc,
                                    "patent_title": title,
                                }
                            )

                        signals.append(
                            {
                                "type": "patent_filing",
                                "title": f"Patent: {title[:80]}",
                                "description": patent.get("patent_abstract", "")[:300],
                                "vendor": assignee or "Unknown",
                                "patent_number": patent.get("patent_number"),
                                "confidence": 0.95,
                            }
                        )
                except httpx.HTTPError as exc:
                    self.logger.warning("PatentsView CPC %s error: %s", cpc, exc)

        return AgentResult(
            success=True,
            entities_found=len(entities),
            signals_found=len(signals),
            data={"entities": entities, "signals": signals},
        )
