"""SEC EDGAR agent — fetches public company filings mentioning defense/tech keywords."""

import httpx

from ..base import AgentResult, BaseAgent


class SECEdgarAgent(BaseAgent):
    """Searches SEC EDGAR full-text search for filings mentioning
    autonomous systems, robotics, defense technology, and related terms.

    Discovers publicly traded companies with exposure to sectors
    relevant to NXT//LINK acquisition intelligence.
    """

    name = "sec_edgar"
    description = "SEC EDGAR filings (10-K, 10-Q) mentioning defense/tech keywords"
    group = "enrichment"
    cadence_hours = 12

    SEARCH_URL = "https://efts.sec.gov/LATEST/search-index"
    FULL_TEXT_URL = "https://efts.sec.gov/LATEST/search-index"

    # SEC requires a User-Agent with contact info
    HEADERS = {
        "User-Agent": "NXT-LINK-Intel research@nxtlink.io",
        "Accept": "application/json",
    }

    SEARCH_QUERIES = [
        "autonomous systems defense",
        "robotics manufacturing",
        "cybersecurity government contract",
        "border security technology",
        "artificial intelligence defense",
        "drone surveillance",
        "machine learning military",
    ]

    FILING_TYPES = ["10-K", "10-Q", "8-K"]

    async def run(self) -> AgentResult:
        entities: list[dict[str, str | None]] = []
        signals: list[dict[str, str | float | None]] = []

        async with httpx.AsyncClient(timeout=30, headers=self.HEADERS) as client:
            for query in self.SEARCH_QUERIES:
                for filing_type in self.FILING_TYPES:
                    try:
                        params = {
                            "q": f'"{query}"',
                            "dateRange": "custom",
                            "startdt": "2025-01-01",
                            "enddt": "2026-12-31",
                            "forms": filing_type,
                        }

                        resp = await client.get(
                            "https://efts.sec.gov/LATEST/search-index",
                            params=params,
                        )

                        if resp.status_code != 200:
                            self.logger.warning(
                                "EDGAR query '%s' form %s returned %d",
                                query,
                                filing_type,
                                resp.status_code,
                            )
                            continue

                        data = resp.json()
                        hits = data.get("hits", {}).get("hits", [])

                        for hit in hits[:15]:
                            source = hit.get("_source", {})
                            company = source.get("display_names", [""])[0] if source.get("display_names") else ""
                            filing_date = source.get("file_date", "")
                            form_type = source.get("form_type", filing_type)
                            file_num = source.get("file_num", "")

                            if not company:
                                company = source.get("entity_name", "Unknown")

                            entities.append(
                                {
                                    "name": company,
                                    "source": "sec_edgar",
                                    "filing_type": form_type,
                                    "filing_date": filing_date,
                                    "query_match": query,
                                }
                            )

                            signals.append(
                                {
                                    "type": "sec_filing",
                                    "title": f"{form_type}: {company} — {query}",
                                    "description": f"SEC {form_type} filing by {company} dated {filing_date} matches keyword '{query}'",
                                    "vendor": company,
                                    "filing_type": form_type,
                                    "file_num": file_num,
                                    "confidence": 0.85,
                                }
                            )

                    except httpx.HTTPError as exc:
                        self.logger.warning(
                            "EDGAR query '%s' form %s error: %s",
                            query,
                            filing_type,
                            exc,
                        )

        # Deduplicate entities by company + filing type
        seen: set[str] = set()
        unique_entities: list[dict[str, str | None]] = []
        for entity in entities:
            key = f"{entity.get('name', '').lower()}:{entity.get('filing_type', '')}"
            if key not in seen:
                seen.add(key)
                unique_entities.append(entity)

        return AgentResult(
            success=True,
            entities_found=len(unique_entities),
            signals_found=len(signals),
            data={"entities": unique_entities, "signals": signals},
        )
