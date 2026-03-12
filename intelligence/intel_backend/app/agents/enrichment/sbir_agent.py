"""SBIR/STTR Awards agent — fetches government small business innovation awards."""

import httpx

from ..base import AgentResult, BaseAgent


class SBIRAgent(BaseAgent):
    """Queries the SBIR.gov public API for recent SBIR/STTR awards.

    Searches across technology keywords relevant to defense, AI, border
    security, and advanced manufacturing to discover companies winning
    federal innovation grants.
    """

    name = "sbir_awards"
    description = "SBIR/STTR government innovation awards from sbir.gov"
    group = "enrichment"
    cadence_hours = 24

    API_URL = "https://api.sbir.gov/public/api/awards"

    TECH_KEYWORDS = [
        "artificial intelligence",
        "robotics",
        "cybersecurity",
        "manufacturing",
        "border security",
        "autonomous",
        "machine learning",
        "drone",
        "surveillance",
        "defense technology",
    ]

    async def run(self) -> AgentResult:
        entities: list[dict[str, str | int | float | None]] = []
        signals: list[dict[str, str | float | None]] = []

        async with httpx.AsyncClient(timeout=30) as client:
            for keyword in self.TECH_KEYWORDS:
                try:
                    params = {
                        "keyword": keyword,
                        "rows": 25,
                        "start": 0,
                    }

                    resp = await client.get(self.API_URL, params=params)
                    if resp.status_code != 200:
                        self.logger.warning(
                            "SBIR API keyword '%s' returned %d",
                            keyword,
                            resp.status_code,
                        )
                        continue

                    data = resp.json()
                    awards = data if isinstance(data, list) else data.get("results", [])

                    for award in awards:
                        company = award.get("company", "") or award.get("firm", "")
                        amount = award.get("award_amount", 0) or award.get("amount", 0)
                        agency = award.get("agency", "") or award.get("branch", "")
                        abstract = award.get("abstract", "") or ""
                        award_year = award.get("award_year", "") or award.get("year", "")
                        title = award.get("award_title", "") or award.get("title", "")

                        if not company:
                            continue

                        entities.append(
                            {
                                "name": company,
                                "source": "sbir.gov",
                                "keyword": keyword,
                                "award_amount": amount,
                                "agency": agency,
                                "award_year": award_year,
                            }
                        )

                        signals.append(
                            {
                                "type": "sbir_award",
                                "title": f"SBIR: {title[:80]}" if title else f"SBIR award to {company}",
                                "description": abstract[:300],
                                "vendor": company,
                                "amount": amount,
                                "agency": agency,
                                "confidence": 0.90,
                            }
                        )

                except httpx.HTTPError as exc:
                    self.logger.warning("SBIR API keyword '%s' error: %s", keyword, exc)

        # Deduplicate entities by company name
        seen: set[str] = set()
        unique_entities: list[dict[str, str | int | float | None]] = []
        for entity in entities:
            name = str(entity.get("name", "")).lower()
            if name not in seen:
                seen.add(name)
                unique_entities.append(entity)

        return AgentResult(
            success=True,
            entities_found=len(unique_entities),
            signals_found=len(signals),
            data={"entities": unique_entities, "signals": signals},
        )
