"""SAM.gov agent — fetches registered business entities."""

import os

import httpx

from ..base import AgentResult, BaseAgent


class SAMAgent(BaseAgent):
    """Queries SAM.gov for registered businesses in technology NAICS codes.

    Requires SAM_API_KEY environment variable.
    """

    name = "sam_businesses"
    description = "Registered businesses from SAM.gov"
    group = "discovery"
    cadence_hours = 24

    API_URL = "https://api.sam.gov/entity-information/v3/entities"

    TECH_NAICS = [
        "334511",  # Search, Detection, Navigation, Guidance Systems
        "541512",  # Computer Systems Design Services
        "541511",  # Custom Computer Programming Services
        "541330",  # Engineering Services
        "541715",  # R&D in Physical, Engineering, Life Sciences
        "336414",  # Guided Missile & Space Vehicle Manufacturing
        "517110",  # Wired Telecommunications Carriers
        "518210",  # Computing Infrastructure Providers
    ]

    async def health_check(self) -> bool:
        return bool(os.environ.get("SAM_API_KEY"))

    async def run(self) -> AgentResult:
        api_key = os.environ.get("SAM_API_KEY", "")
        if not api_key:
            return AgentResult(
                success=False, errors=["SAM_API_KEY not set"]
            )

        entities: list[dict[str, str | bool | list[str] | None]] = []

        async with httpx.AsyncClient(timeout=30) as client:
            for naics in self.TECH_NAICS:
                try:
                    resp = await client.get(
                        self.API_URL,
                        params={
                            "api_key": api_key,
                            "naicsCode": naics,
                            "registrationStatus": "A",
                            "pageSize": "25",
                        },
                    )
                    if resp.status_code != 200:
                        self.logger.warning(
                            "SAM NAICS %s returned %d", naics, resp.status_code
                        )
                        continue

                    data = resp.json()
                    for entity in data.get("entityData", []):
                        core = entity.get("coreData", {})
                        reg = core.get("entityRegistration", {})
                        name = reg.get("legalBusinessName", "").strip()
                        if not name:
                            continue
                        entities.append(
                            {
                                "name": name,
                                "source": "sam.gov",
                                "uei": reg.get("ueiSAM", ""),
                                "cage_code": reg.get("cageCode", ""),
                                "naics": naics,
                                "is_small_business": reg.get(
                                    "businessTypes", {}
                                ).get("sbaBusinessTypeList") is not None,
                            }
                        )
                except httpx.HTTPError as exc:
                    self.logger.warning("SAM NAICS %s error: %s", naics, exc)

        return AgentResult(
            success=True,
            entities_found=len(entities),
            data={"entities": entities},
        )
