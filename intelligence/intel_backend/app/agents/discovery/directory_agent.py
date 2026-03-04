"""Business Directory agent — discovers tech companies from directory sources.

Uses mock data representing results from business directories (D&B, Hoovers,
ZoomInfo). Replace mock data with real API integrations when keys are available.
"""

from ..base import AgentResult, BaseAgent


class DirectoryAgent(BaseAgent):
    """Discovers technology companies from business directory sources.

    Simulates querying Dun & Bradstreet, Hoovers, and ZoomInfo for companies
    in El Paso and the broader Southwest region with defense, AI, and
    advanced technology profiles.
    """

    name = "business_directory"
    description = "Tech company discovery from business directories (D&B/Hoovers/ZoomInfo mock)"
    group = "discovery"
    cadence_hours = 168  # Weekly

    MOCK_COMPANIES: list[dict[str, str | int | float | None]] = [
        {
            "name": "Raytheon Missiles & Defense — El Paso",
            "duns": "001234567",
            "source": "dnb",
            "location": "El Paso, TX",
            "latitude": 31.7619,
            "longitude": -106.4850,
            "employee_count": 2500,
            "revenue_range": "$500M-$1B",
            "sector": "Defense/Missiles",
            "sic_code": "3769",
            "description": "Missile systems development, guided munitions, defense electronics",
        },
        {
            "name": "DELPHI Research (Fort Bliss)",
            "duns": "009876543",
            "source": "dnb",
            "location": "Fort Bliss, TX",
            "latitude": 31.8164,
            "longitude": -106.4223,
            "employee_count": 180,
            "revenue_range": "$10M-$50M",
            "sector": "Defense/Research",
            "sic_code": "8711",
            "description": "Army research lab support, test and evaluation, autonomous systems",
        },
        {
            "name": "Electrical District No. 1 (ED1)",
            "duns": "005551234",
            "source": "hoovers",
            "location": "El Paso, TX",
            "latitude": 31.7587,
            "longitude": -106.4869,
            "employee_count": 450,
            "revenue_range": "$100M-$250M",
            "sector": "Energy/Utilities",
            "sic_code": "4911",
            "description": "Electric utility serving El Paso county, grid modernization, smart meters",
        },
        {
            "name": "Fort Bliss Network Enterprise Center",
            "duns": "002223334",
            "source": "dnb",
            "location": "Fort Bliss, TX",
            "latitude": 31.8120,
            "longitude": -106.4300,
            "employee_count": 320,
            "revenue_range": "$50M-$100M",
            "sector": "IT/Cybersecurity",
            "sic_code": "7371",
            "description": "Army network operations, cybersecurity, C4ISR support",
        },
        {
            "name": "Verizon Defense Solutions — Southwest",
            "duns": "003334445",
            "source": "zoominfo",
            "location": "El Paso, TX",
            "latitude": 31.7700,
            "longitude": -106.4427,
            "employee_count": 85,
            "revenue_range": "$10M-$50M",
            "sector": "Telecom/Defense",
            "sic_code": "4899",
            "description": "Tactical communications, 5G defense networks, SATCOM solutions",
        },
        {
            "name": "Leidos — El Paso Operations",
            "duns": "004445556",
            "source": "zoominfo",
            "location": "El Paso, TX",
            "latitude": 31.7580,
            "longitude": -106.5000,
            "employee_count": 210,
            "revenue_range": "$50M-$100M",
            "sector": "IT/Defense Services",
            "sic_code": "7371",
            "description": "Defense IT modernization, border security systems, data analytics",
        },
        {
            "name": "General Dynamics IT — Fort Bliss",
            "duns": "006667778",
            "source": "hoovers",
            "location": "Fort Bliss, TX",
            "latitude": 31.8100,
            "longitude": -106.4150,
            "employee_count": 150,
            "revenue_range": "$25M-$75M",
            "sector": "IT/Defense",
            "sic_code": "7371",
            "description": "IT infrastructure, network management, training simulation systems",
        },
        {
            "name": "UTEP Center for Defense Systems Research",
            "duns": "007778889",
            "source": "dnb",
            "location": "El Paso, TX",
            "latitude": 31.7697,
            "longitude": -106.5050,
            "employee_count": 45,
            "revenue_range": "$5M-$10M",
            "sector": "Research/Academic",
            "sic_code": "8733",
            "description": "University research center, AI/ML defense applications, border sensing",
        },
        {
            "name": "Sierra Nevada Corporation — SW Ops",
            "duns": "008889990",
            "source": "zoominfo",
            "location": "Las Cruces, NM",
            "latitude": 32.3199,
            "longitude": -106.7637,
            "employee_count": 120,
            "revenue_range": "$25M-$75M",
            "sector": "Aerospace/Defense",
            "sic_code": "3761",
            "description": "Aircraft modification, ISR systems, space vehicle components",
        },
        {
            "name": "Jabil — Juarez Operations",
            "duns": "009990001",
            "source": "hoovers",
            "location": "Cd. Juarez, MX",
            "latitude": 31.6904,
            "longitude": -106.4245,
            "employee_count": 4500,
            "revenue_range": "$250M-$500M",
            "sector": "Manufacturing/Electronics",
            "sic_code": "3672",
            "description": "Contract electronics manufacturing, PCB assembly, defense subcontracting",
        },
        {
            "name": "Northrop Grumman — White Sands",
            "duns": "010001112",
            "source": "dnb",
            "location": "White Sands, NM",
            "latitude": 32.3829,
            "longitude": -106.4786,
            "employee_count": 600,
            "revenue_range": "$100M-$250M",
            "sector": "Defense/Test & Evaluation",
            "sic_code": "3812",
            "description": "Missile test support, range instrumentation, directed energy systems",
        },
        {
            "name": "Booz Allen Hamilton — Bliss",
            "duns": "011112223",
            "source": "zoominfo",
            "location": "Fort Bliss, TX",
            "latitude": 31.8090,
            "longitude": -106.4200,
            "employee_count": 95,
            "revenue_range": "$10M-$50M",
            "sector": "Consulting/Defense",
            "sic_code": "7371",
            "description": "Defense consulting, cyber operations, data analytics for Army",
        },
        {
            "name": "Parsons Corporation — Border Programs",
            "duns": "012223334",
            "source": "hoovers",
            "location": "El Paso, TX",
            "latitude": 31.7550,
            "longitude": -106.4400,
            "employee_count": 75,
            "revenue_range": "$10M-$50M",
            "sector": "Engineering/Border",
            "sic_code": "8711",
            "description": "Border wall engineering, surveillance tower design, infrastructure",
        },
        {
            "name": "Impulse Advanced Manufacturing",
            "duns": "013334445",
            "source": "dnb",
            "location": "El Paso, TX",
            "latitude": 31.7800,
            "longitude": -106.4100,
            "employee_count": 35,
            "revenue_range": "$1M-$5M",
            "sector": "Manufacturing",
            "sic_code": "3599",
            "description": "Additive manufacturing, rapid prototyping, defense component fabrication",
        },
        {
            "name": "StratoStar Systems",
            "duns": "014445556",
            "source": "zoominfo",
            "location": "El Paso, TX",
            "latitude": 31.7450,
            "longitude": -106.4800,
            "employee_count": 22,
            "revenue_range": "$1M-$5M",
            "sector": "Aerospace/Surveillance",
            "sic_code": "3812",
            "description": "High-altitude balloon platforms, persistent ISR, border monitoring",
        },
    ]

    async def run(self) -> AgentResult:
        entities: list[dict[str, str | int | float | None]] = []
        signals: list[dict[str, str | float | None]] = []

        for company in self.MOCK_COMPANIES:
            name = str(company["name"])
            source = str(company["source"])
            sector = str(company["sector"])
            employee_count = company["employee_count"]
            revenue_range = str(company["revenue_range"])
            location = str(company["location"])

            entities.append(
                {
                    "name": name,
                    "source": source,
                    "location": location,
                    "latitude": company.get("latitude"),
                    "longitude": company.get("longitude"),
                    "employee_count": employee_count,
                    "revenue_range": revenue_range,
                    "sector": sector,
                    "sic_code": company.get("sic_code"),
                    "description": company.get("description"),
                }
            )

            signals.append(
                {
                    "type": "directory_listing",
                    "title": f"Directory: {name}",
                    "description": f"{name} ({sector}) in {location} — {employee_count} employees, revenue {revenue_range}",
                    "vendor": name,
                    "source_directory": source,
                    "confidence": 0.80,
                }
            )

        self.logger.info(
            "Directory discovery: %d companies from mock D&B/Hoovers/ZoomInfo data",
            len(entities),
        )

        return AgentResult(
            success=True,
            entities_found=len(entities),
            signals_found=len(signals),
            data={"entities": entities, "signals": signals, "source": "mock"},
        )
