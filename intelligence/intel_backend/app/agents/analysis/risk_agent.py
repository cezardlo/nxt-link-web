"""Risk Signal Detection agent — identifies risk events affecting tracked companies.

Monitors for layoffs, lawsuits, contract cancellations, security breaches,
and other negative signals. Uses mock data for initial implementation;
will integrate with real news feeds and SEC filings when pipeline is connected.
"""

from datetime import datetime, timedelta, timezone

from ..base import AgentResult, BaseAgent


class RiskAgent(BaseAgent):
    """Detects risk signals: layoffs, lawsuits, contract cancellations,
    security breaches, and financial distress across tracked entities.

    Returns risk_level (critical/high/medium/low), affected_company,
    and detailed descriptions for the NXT//LINK threat dashboard.
    """

    name = "risk_detection"
    description = "Risk signal detection — layoffs, lawsuits, breaches, contract cancellations"
    group = "analysis"
    cadence_hours = 4

    MOCK_RISK_EVENTS: list[dict[str, str | int | float]] = [
        {
            "affected_company": "Raytheon Technologies",
            "risk_level": "high",
            "risk_type": "layoffs",
            "title": "Raytheon announces 4,000 workforce reduction",
            "description": "Raytheon Technologies plans to cut approximately 4,000 positions across its defense and intelligence divisions as part of a restructuring following the L3Harris merger completion. El Paso missile division may be impacted.",
            "severity_score": 82,
            "source": "Reuters",
            "days_ago": 2,
        },
        {
            "affected_company": "Leidos",
            "risk_level": "medium",
            "risk_type": "contract_loss",
            "title": "Leidos loses $450M Army IT contract bid",
            "description": "Leidos failed to win the re-compete for the $450M Fort Bliss enterprise IT services contract. Award went to Perspecta (now Peraton). Potential staffing impact at El Paso operations.",
            "severity_score": 65,
            "source": "Defense News",
            "days_ago": 5,
        },
        {
            "affected_company": "CrowdStrike",
            "risk_level": "critical",
            "risk_type": "security_incident",
            "title": "CrowdStrike sensor update causes global IT outages",
            "description": "Faulty CrowdStrike Falcon sensor update triggered blue screen crashes on millions of Windows systems globally. Federal agencies and defense contractors affected. Incident raises questions about single-vendor dependency.",
            "severity_score": 95,
            "source": "WSJ",
            "days_ago": 1,
        },
        {
            "affected_company": "General Dynamics IT",
            "risk_level": "medium",
            "risk_type": "lawsuit",
            "title": "GDIT faces whistleblower lawsuit over billing practices",
            "description": "Former employee alleges General Dynamics IT overbilled government contracts at Fort Bliss by $12M over three years. DOJ Civil Division investigating under False Claims Act.",
            "severity_score": 60,
            "source": "Federal Times",
            "days_ago": 8,
        },
        {
            "affected_company": "Booz Allen Hamilton",
            "risk_level": "high",
            "risk_type": "security_clearance",
            "title": "Booz Allen employee clearance revocation impacts Army programs",
            "description": "DCSA revoked security clearances for 15 Booz Allen employees following insider threat investigation. Multiple Fort Bliss consulting engagements disrupted pending replacement staffing.",
            "severity_score": 78,
            "source": "Bloomberg Government",
            "days_ago": 3,
        },
        {
            "affected_company": "Parsons Corporation",
            "risk_level": "low",
            "risk_type": "financial",
            "title": "Parsons Q3 earnings miss analyst estimates by 8%",
            "description": "Parsons Corporation reported Q3 revenue of $1.7B, missing consensus estimates by 8%. Border infrastructure programs on track but commercial segment underperformed.",
            "severity_score": 35,
            "source": "Seeking Alpha",
            "days_ago": 12,
        },
        {
            "affected_company": "Shield AI",
            "risk_level": "medium",
            "risk_type": "leadership",
            "title": "Shield AI CTO departs amid autonomous flight setbacks",
            "description": "Chief Technology Officer resigned following two failed autonomous flight tests of the V-BAT drone. Company cites personal reasons; industry sources suggest internal strategic disagreements.",
            "severity_score": 58,
            "source": "TechCrunch",
            "days_ago": 6,
        },
        {
            "affected_company": "Northrop Grumman",
            "risk_level": "high",
            "risk_type": "contract_delay",
            "title": "GBSD missile program faces 18-month schedule slip",
            "description": "GAO report reveals Sentinel (GBSD) ICBM program is 18 months behind schedule with $4.5B cost overrun. White Sands test timeline pushed to 2028. Congressional review initiated.",
            "severity_score": 80,
            "source": "GAO Report",
            "days_ago": 4,
        },
        {
            "affected_company": "Jabil",
            "risk_level": "medium",
            "risk_type": "supply_chain",
            "title": "Jabil Juarez plant faces component shortage disruption",
            "description": "Semiconductor component shortages impacting Jabil's Juarez manufacturing lines. Defense subcontract deliveries delayed 6-8 weeks. Alternate sourcing underway but at higher cost.",
            "severity_score": 55,
            "source": "Supply Chain Dive",
            "days_ago": 7,
        },
        {
            "affected_company": "Anduril Industries",
            "risk_level": "low",
            "risk_type": "regulatory",
            "title": "Anduril border tower deployment faces environmental review",
            "description": "NEPA environmental review required for 12 planned autonomous surveillance tower installations along El Paso sector. Deployment timeline may shift 3-6 months pending assessment.",
            "severity_score": 30,
            "source": "El Paso Times",
            "days_ago": 10,
        },
        {
            "affected_company": "Elbit Systems of America",
            "risk_level": "high",
            "risk_type": "protest",
            "title": "University protests target Elbit Systems defense contracts",
            "description": "Student protests at 15+ universities demand divestment from Elbit Systems. Congressional letter urges Pentagon review of Elbit border surveillance contracts. Stock down 12%.",
            "severity_score": 72,
            "source": "AP News",
            "days_ago": 3,
        },
        {
            "affected_company": "Verizon Defense",
            "risk_level": "low",
            "risk_type": "competition",
            "title": "T-Mobile wins 5G defense pilot, threatens Verizon position",
            "description": "T-Mobile selected for DoD 5G pilot at three military bases, including White Sands. Verizon's incumbent position in Southwest defense communications at risk if pilot succeeds.",
            "severity_score": 40,
            "source": "FierceWireless",
            "days_ago": 14,
        },
        {
            "affected_company": "UTEP Research",
            "risk_level": "medium",
            "risk_type": "funding_cut",
            "title": "DARPA reduces UTEP AI research grant by 40%",
            "description": "DARPA's Information Innovation Office cut UTEP Center for Defense Systems Research AI/ML grant from $8M to $4.8M citing budget constraints. Three research positions at risk.",
            "severity_score": 52,
            "source": "Inside Higher Ed",
            "days_ago": 9,
        },
    ]

    async def run(self) -> AgentResult:
        entities: list[dict[str, str | int | float | None]] = []
        signals: list[dict[str, str | float | None]] = []

        now = datetime.now(timezone.utc)

        # Sort by severity score descending
        sorted_events = sorted(
            self.MOCK_RISK_EVENTS,
            key=lambda e: int(e["severity_score"]),
            reverse=True,
        )

        for event in sorted_events:
            company = str(event["affected_company"])
            risk_level = str(event["risk_level"])
            risk_type = str(event["risk_type"])
            title = str(event["title"])
            description = str(event["description"])
            severity = int(event["severity_score"])
            source = str(event["source"])
            days_ago = int(event["days_ago"])

            event_date = (now - timedelta(days=days_ago)).strftime("%Y-%m-%d")

            entities.append(
                {
                    "name": company,
                    "source": "risk_detection",
                    "type": "risk_event",
                    "risk_level": risk_level,
                    "risk_type": risk_type,
                    "severity_score": severity,
                    "event_date": event_date,
                    "description": description,
                }
            )

            signals.append(
                {
                    "type": f"risk_{risk_level}",
                    "title": f"RISK [{risk_level.upper()}]: {title}",
                    "description": description[:250],
                    "vendor": company,
                    "risk_level": risk_level,
                    "risk_type": risk_type,
                    "severity_score": float(severity),
                    "source_publication": source,
                    "confidence": min(0.95, severity / 100),
                }
            )

        # Aggregate risk summary
        risk_summary = {
            "critical": len([e for e in sorted_events if e["risk_level"] == "critical"]),
            "high": len([e for e in sorted_events if e["risk_level"] == "high"]),
            "medium": len([e for e in sorted_events if e["risk_level"] == "medium"]),
            "low": len([e for e in sorted_events if e["risk_level"] == "low"]),
            "total_events": len(sorted_events),
            "avg_severity": sum(int(e["severity_score"]) for e in sorted_events) / len(sorted_events),
        }

        self.logger.info(
            "Risk detection complete: %d events (C:%d H:%d M:%d L:%d, avg severity: %.0f)",
            risk_summary["total_events"],
            risk_summary["critical"],
            risk_summary["high"],
            risk_summary["medium"],
            risk_summary["low"],
            risk_summary["avg_severity"],
        )

        return AgentResult(
            success=True,
            entities_found=len(entities),
            signals_found=len(signals),
            data={
                "risk_events": entities,
                "signals": signals,
                "risk_summary": risk_summary,
                "analysis_timestamp": now.isoformat(),
            },
        )
