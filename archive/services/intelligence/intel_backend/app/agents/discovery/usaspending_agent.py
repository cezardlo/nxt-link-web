"""USASpending agent — fetches federal contract awards."""

import httpx

from ..base import AgentResult, BaseAgent


class USASpendingAgent(BaseAgent):
    """Fetches government contract awards from the USASpending API.

    Identifies vendors receiving federal funding in technology-related sectors.
    """

    name = "usaspending"
    description = "Federal contract awards from USASpending.gov"
    group = "discovery"
    cadence_hours = 12

    API_URL = "https://api.usaspending.gov/api/v2/search/spending_by_award/"

    # NAICS codes relevant to technology intelligence
    TECH_NAICS = [
        "334",   # Computer & Electronic Product Manufacturing
        "541",   # Professional, Scientific, Technical Services
        "518",   # Computing Infrastructure Providers
        "517",   # Telecommunications
        "336",   # Transportation Equipment Manufacturing (defense)
        "928",   # National Security & International Affairs
    ]

    async def run(self) -> AgentResult:
        entities: list[dict[str, str | float | None]] = []
        signals: list[dict[str, str | float | None]] = []

        async with httpx.AsyncClient(timeout=30) as client:
            for naics in self.TECH_NAICS:
                payload = {
                    "filters": {
                        "award_type_codes": ["A", "B", "C", "D"],
                        "naics_codes": [{"identifier": naics, "require_match": True}],
                        "time_period": [
                            {"start_date": "2025-01-01", "end_date": "2026-12-31"}
                        ],
                    },
                    "fields": [
                        "Award ID",
                        "Recipient Name",
                        "Award Amount",
                        "Awarding Agency",
                        "Description",
                    ],
                    "limit": 25,
                    "page": 1,
                    "sort": "Award Amount",
                    "order": "desc",
                }

                try:
                    resp = await client.post(self.API_URL, json=payload)
                    if resp.status_code != 200:
                        self.logger.warning(
                            "USASpending NAICS %s returned %d", naics, resp.status_code
                        )
                        continue

                    data = resp.json()
                    for row in data.get("results", []):
                        vendor_name = row.get("Recipient Name", "").strip()
                        if not vendor_name:
                            continue
                        entities.append(
                            {
                                "name": vendor_name,
                                "source": "usaspending",
                                "award_amount": row.get("Award Amount"),
                                "agency": row.get("Awarding Agency", ""),
                                "naics": naics,
                            }
                        )
                        signals.append(
                            {
                                "type": "grant_award",
                                "title": f"{vendor_name} — ${row.get('Award Amount', 0):,.0f} award",
                                "description": row.get("Description", ""),
                                "vendor": vendor_name,
                                "confidence": 0.9,
                            }
                        )
                except httpx.HTTPError as exc:
                    self.logger.warning("USASpending NAICS %s error: %s", naics, exc)

        return AgentResult(
            success=True,
            entities_found=len(entities),
            signals_found=len(signals),
            data={"entities": entities, "signals": signals},
        )
