"""Product & Solution Scanner Agent — discovers what companies sell."""

from __future__ import annotations

import re
import time
from typing import Any

from ..base import BaseAgent, AgentResult

# ─── Extraction patterns ──────────────────────────────────────────────────────

PRODUCT_PATTERNS: list[re.Pattern[str]] = [
    re.compile(
        r'(?:produces?|manufactures?|offers?|provides?|sells?|builds?)\s+(.+?)(?:\.|,|$)',
        re.I,
    ),
    re.compile(
        r'(?:platform|system|solution|software|hardware)\s+(?:for|called|named)\s+(.+?)(?:\.|,|$)',
        re.I,
    ),
    re.compile(
        r'(?:contract for|awarded for)\s+(.+?)(?:\.|,|$)',
        re.I,
    ),
]

# ─── Tag → product name / type mappings ──────────────────────────────────────

TAG_MAPPINGS: list[dict[str, Any]] = [
    {"keywords": ["c4isr", "c5isr"],            "name": "C4ISR Systems",                "type": "solution",  "category": "Command & Control"},
    {"keywords": ["isr"],                        "name": "ISR Platform",                 "type": "platform",  "category": "Intelligence, Surveillance & Reconnaissance"},
    {"keywords": ["sigint"],                     "name": "SIGINT Processing System",     "type": "solution",  "category": "Signals Intelligence"},
    {"keywords": ["electronic warfare", "ew"],  "name": "Electronic Warfare Suite",     "type": "solution",  "category": "Electronic Warfare"},
    {"keywords": ["radar"],                      "name": "Radar Platform",               "type": "product",   "category": "Sensing & Detection"},
    {"keywords": ["missiles", "patriot", "thaad", "himars", "pac-3"],
                                                 "name": "Missile System",               "type": "product",   "category": "Weapons & Munitions"},
    {"keywords": ["ibcs"],                       "name": "IBCS Command System",          "type": "solution",  "category": "Command & Control"},
    {"keywords": ["air defense"],                "name": "Air Defense System",           "type": "solution",  "category": "Air & Missile Defense"},
    {"keywords": ["armored vehicles", "m1 abrams", "bradley ifv"],
                                                 "name": "Armored Vehicle Systems",      "type": "product",   "category": "Ground Combat Vehicles"},
    {"keywords": ["rotary wing", "aviation", "chinook", "apache"],
                                                 "name": "Aviation Sustainment",         "type": "service",   "category": "Aviation"},
    {"keywords": ["soldier systems"],            "name": "Soldier-Worn Equipment",       "type": "product",   "category": "Individual Equipment"},
    {"keywords": ["ai", "artificial intelligence", "machine learning", "ml"],
                                                 "name": "AI/ML Platform",               "type": "platform",  "category": "Artificial Intelligence"},
    {"keywords": ["computer vision"],            "name": "Computer Vision System",       "type": "platform",  "category": "Artificial Intelligence"},
    {"keywords": ["aip", "gotham", "palantir"],  "name": "Intelligence Analytics Platform", "type": "platform", "category": "Data Analytics"},
    {"keywords": ["analytics", "predictive"],   "name": "Analytics Platform",           "type": "platform",  "category": "Data Analytics"},
    {"keywords": ["cybersecurity", "cyber"],     "name": "Cybersecurity Platform",       "type": "platform",  "category": "Cybersecurity"},
    {"keywords": ["edr", "endpoint protection"], "name": "Endpoint Detection & Response","type": "product",   "category": "Cybersecurity"},
    {"keywords": ["threat intelligence"],        "name": "Threat Intelligence Feed",     "type": "service",   "category": "Cybersecurity"},
    {"keywords": ["zero trust"],                 "name": "Zero Trust Network Access",    "type": "solution",  "category": "Network Security"},
    {"keywords": ["ot security", "ics/scada", "ics", "scada"],
                                                 "name": "OT/ICS Security",              "type": "service",   "category": "Operational Technology Security"},
    {"keywords": ["red team"],                   "name": "Red Team Assessment",          "type": "service",   "category": "Cybersecurity"},
    {"keywords": ["network security", "network ops"],
                                                 "name": "Network Security Operations",  "type": "service",   "category": "Network Security"},
    {"keywords": ["cloud", "deos"],              "name": "Cloud Migration Services",     "type": "service",   "category": "Cloud Computing"},
    {"keywords": ["enterprise it", "helpdesk"],  "name": "Enterprise IT Services",       "type": "service",   "category": "IT Services"},
    {"keywords": ["digital transformation"],     "name": "Digital Transformation",       "type": "service",   "category": "IT Services"},
    {"keywords": ["sap", "erp"],                 "name": "ERP Implementation",           "type": "service",   "category": "Enterprise Software"},
    {"keywords": ["logistics systems", "gcss-army"],
                                                 "name": "Logistics Information System", "type": "platform",  "category": "Logistics Technology"},
    {"keywords": ["logistics", "supply chain"],  "name": "Supply Chain Platform",        "type": "platform",  "category": "Logistics Technology"},
    {"keywords": ["distribution", "freight"],    "name": "Distribution & Freight",       "type": "service",   "category": "Logistics"},
    {"keywords": ["warehousing", "warehouse"],   "name": "Warehouse Management System",  "type": "platform",  "category": "Warehousing"},
    {"keywords": ["trucking", "fleet"],          "name": "Fleet Management",             "type": "service",   "category": "Transportation"},
    {"keywords": ["base operations", "logcap", "facilities management"],
                                                 "name": "Base Operations Support",      "type": "service",   "category": "Facilities & Operations"},
    {"keywords": ["health it", "health tech"],   "name": "Health IT Platform",           "type": "platform",  "category": "Health Technology"},
    {"keywords": ["financial management", "audit"],
                                                 "name": "Financial Management Services","type": "service",   "category": "Finance & Audit"},
    {"keywords": ["border tech", "cross-border"],"name": "Border Technology Solution",   "type": "solution",  "category": "Border Technology"},
    {"keywords": ["water tech"],                 "name": "Water Management System",      "type": "solution",  "category": "Water Technology"},
    {"keywords": ["energy", "solar", "renewable"],"name": "Energy Platform",             "type": "solution",  "category": "Energy Technology"},
    {"keywords": ["manufacturing", "fabrication"],"name": "Manufacturing System",        "type": "solution",  "category": "Manufacturing"},
    {"keywords": ["robotics", "autonomous", "drone", "uas", "unmanned"],
                                                 "name": "Robotic Systems",              "type": "product",   "category": "Robotics & Automation"},
    {"keywords": ["iot", "sensor fusion", "digital twin"],
                                                 "name": "IoT Platform",                 "type": "platform",  "category": "IoT"},
    {"keywords": ["strategy", "consulting"],     "name": "Advisory Services",            "type": "service",   "category": "Consulting"},
    {"keywords": ["construction"],               "name": "Construction Services",        "type": "service",   "category": "Construction"},
    {"keywords": ["engineering"],                "name": "Engineering Services",         "type": "service",   "category": "Engineering"},
    {"keywords": ["fintech", "payments"],        "name": "Financial Technology Platform","type": "platform",  "category": "FinTech"},
    {"keywords": ["hvac"],                       "name": "HVAC Systems",                 "type": "product",   "category": "Building Systems"},
]

# ─── Category-based capability inference ─────────────────────────────────────

CATEGORY_CAPABILITIES: dict[str, list[dict[str, str]]] = {
    "Defense": [
        {"name": "Defense Systems Integration", "type": "solution",  "category": "Defense Systems"},
        {"name": "Military Hardware Support",    "type": "service",   "category": "Defense Systems"},
    ],
    "Defense IT": [
        {"name": "Defense IT Infrastructure",   "type": "service",   "category": "Defense IT"},
        {"name": "Military Software Systems",   "type": "platform",  "category": "Defense IT"},
    ],
    "Cybersecurity": [
        {"name": "Security Platform",           "type": "platform",  "category": "Cybersecurity"},
        {"name": "Threat Detection",            "type": "solution",  "category": "Cybersecurity"},
    ],
    "Consulting": [
        {"name": "Management Consulting",       "type": "service",   "category": "Consulting"},
        {"name": "Technology Advisory",         "type": "service",   "category": "Consulting"},
    ],
    "Logistics": [
        {"name": "Transportation Management System", "type": "platform", "category": "Logistics Technology"},
        {"name": "Warehouse Management System", "type": "platform",  "category": "Warehousing"},
        {"name": "Freight & Tracking",          "type": "service",   "category": "Logistics"},
    ],
    "Warehousing": [
        {"name": "Warehouse Management System", "type": "platform",  "category": "Warehousing"},
        {"name": "Inventory Control",           "type": "service",   "category": "Warehousing"},
    ],
    "Trucking": [
        {"name": "Fleet Management",            "type": "service",   "category": "Transportation"},
        {"name": "Freight Brokerage",           "type": "service",   "category": "Transportation"},
    ],
    "Manufacturing": [
        {"name": "Production Systems",          "type": "solution",  "category": "Manufacturing"},
        {"name": "Automation Equipment",        "type": "product",   "category": "Manufacturing"},
    ],
    "Fabrication": [
        {"name": "Metal Fabrication",           "type": "service",   "category": "Manufacturing"},
        {"name": "Custom Parts Production",     "type": "service",   "category": "Manufacturing"},
    ],
    "Robotics": [
        {"name": "Robotic Systems",             "type": "product",   "category": "Robotics & Automation"},
        {"name": "Automation Platform",         "type": "platform",  "category": "Robotics & Automation"},
    ],
    "AI / ML": [
        {"name": "AI/ML Platform",              "type": "platform",  "category": "Artificial Intelligence"},
        {"name": "Machine Learning Services",   "type": "service",   "category": "Artificial Intelligence"},
    ],
    "Border Tech": [
        {"name": "Border Management Solution",  "type": "solution",  "category": "Border Technology"},
        {"name": "Cross-Border Data System",    "type": "platform",  "category": "Border Technology"},
    ],
    "Water Tech": [
        {"name": "Water Treatment System",      "type": "solution",  "category": "Water Technology"},
        {"name": "Water Analytics Platform",    "type": "platform",  "category": "Water Technology"},
    ],
    "Energy": [
        {"name": "Energy Management System",    "type": "solution",  "category": "Energy Technology"},
        {"name": "Renewable Energy Platform",   "type": "platform",  "category": "Energy Technology"},
    ],
    "Health Tech": [
        {"name": "Health IT Platform",          "type": "platform",  "category": "Health Technology"},
        {"name": "Clinical Data System",        "type": "solution",  "category": "Health Technology"},
    ],
    "IoT": [
        {"name": "IoT Platform",                "type": "platform",  "category": "IoT"},
        {"name": "Sensor Network",              "type": "product",   "category": "IoT"},
    ],
    "Analytics": [
        {"name": "Analytics Platform",          "type": "platform",  "category": "Data Analytics"},
        {"name": "Business Intelligence",       "type": "solution",  "category": "Data Analytics"},
    ],
    "Enterprise IT": [
        {"name": "Enterprise IT Services",      "type": "service",   "category": "IT Services"},
        {"name": "Infrastructure Management",   "type": "service",   "category": "IT Services"},
    ],
    "FinTech": [
        {"name": "Financial Technology Platform","type": "platform",  "category": "FinTech"},
        {"name": "Payment Processing",          "type": "service",   "category": "FinTech"},
    ],
    "Engineering": [
        {"name": "Engineering Design Services", "type": "service",   "category": "Engineering"},
        {"name": "Systems Engineering",         "type": "service",   "category": "Engineering"},
    ],
    "HVAC": [
        {"name": "HVAC Systems",                "type": "product",   "category": "Building Systems"},
        {"name": "Climate Control Services",    "type": "service",   "category": "Building Systems"},
    ],
    "Construction": [
        {"name": "Construction Services",       "type": "service",   "category": "Construction"},
        {"name": "Project Management",          "type": "service",   "category": "Construction"},
    ],
    "Government": [
        {"name": "Government Services",         "type": "service",   "category": "Government"},
        {"name": "Public Administration",       "type": "service",   "category": "Government"},
    ],
    "Economic Development": [
        {"name": "Economic Development Programs","type": "service",  "category": "Government"},
        {"name": "Business Incentives",         "type": "service",   "category": "Government"},
    ],
    "Education": [
        {"name": "Educational Programs",        "type": "service",   "category": "Education"},
        {"name": "Workforce Training",          "type": "service",   "category": "Education"},
    ],
}


# ─── Helper functions ─────────────────────────────────────────────────────────

def _infer_maturity(iker: float, weight: float) -> str:
    if iker >= 80 and weight >= 0.8:
        return "established"
    if iker >= 65:
        return "growing"
    if iker >= 50:
        return "emerging"
    return "concept"


def _normalize_name(name: str) -> str:
    return re.sub(r"[^a-z0-9]", "", name.lower())


def _derive_top_capability(
    description: str,
    products: list[dict[str, Any]],
) -> str:
    if products:
        best = max(products, key=lambda p: p["confidence"])
        return str(best["name"])
    first = description.split(".")[0].strip()
    return first[:80] + "..." if len(first) > 80 else first


def _scan_vendor(vendor: dict[str, Any]) -> dict[str, Any]:
    """Extract products from a single vendor record. Pure function, no I/O."""
    tags: list[str] = vendor.get("tags", [])
    evidence: list[str] = vendor.get("evidence", [])
    description: str = vendor.get("description", "")
    category: str = vendor.get("category", "")
    iker: float = vendor.get("iker_score", 50)
    weight: float = vendor.get("weight", 0.5)

    maturity = _infer_maturity(iker, weight)
    tags_lower = [t.lower() for t in tags]
    desc_lower = description.lower()

    seen: set[str] = set()
    products: list[dict[str, Any]] = []

    def add(product: dict[str, Any]) -> None:
        key = _normalize_name(product["name"])
        if key in seen:
            return
        seen.add(key)
        products.append(product)

    # 1. From tags
    for mapping in TAG_MAPPINGS:
        matched = any(
            kw in tag for kw in mapping["keywords"] for tag in tags_lower
        )
        if matched:
            add({
                "name": mapping["name"],
                "type": mapping["type"],
                "category": mapping["category"],
                "description": f"Extracted from vendor tags: {', '.join(tags)}",
                "maturity": maturity,
                "confidence": 0.85,
                "source": "tags",
            })

    # 2. From evidence regex extraction
    for ev in evidence:
        for pattern in PRODUCT_PATTERNS:
            m = pattern.search(ev)
            if m and m.group(1):
                raw = m.group(1).strip()
                if len(raw) < 5 or len(raw) > 80:
                    continue
                name = raw[0].upper() + raw[1:]
                add({
                    "name": name,
                    "type": "solution",
                    "category": category,
                    "description": f'Extracted from evidence: "{ev}"',
                    "maturity": maturity,
                    "confidence": 0.65,
                    "source": "evidence",
                })

    # 3. From description keyword matching
    desc_parts = re.split(r",|(?:\band\b)", description, flags=re.I)
    for mapping in TAG_MAPPINGS:
        if not any(kw in desc_lower for kw in mapping["keywords"]):
            continue
        fragment = next(
            (p for p in desc_parts if any(kw in p.lower() for kw in mapping["keywords"])),
            None,
        )
        desc_text = (
            f'From description: "{fragment.strip()[:100]}"'
            if fragment
            else "Inferred from description keyword match"
        )
        add({
            "name": mapping["name"],
            "type": mapping["type"],
            "category": mapping["category"],
            "description": desc_text,
            "maturity": maturity,
            "confidence": 0.60,
            "source": "description",
        })

    # 4. Category-based inference
    for cap in CATEGORY_CAPABILITIES.get(category, []):
        add({
            "name": cap["name"],
            "type": cap["type"],
            "category": cap["category"],
            "description": f"Inferred from vendor category: {category}",
            "maturity": maturity,
            "confidence": 0.45,
            "source": "inferred",
        })

    products.sort(key=lambda p: p["confidence"], reverse=True)

    return {
        "vendor_id": vendor.get("id", ""),
        "vendor_name": vendor.get("name", ""),
        "category": category,
        "products": products,
        "total_products": len(products),
        "top_capability": _derive_top_capability(description, products),
    }


# ─── Agent ────────────────────────────────────────────────────────────────────

# Seed vendor data mirroring el-paso-vendors.ts (representative subset).
# In production this would be loaded from the database or the TS data file.
_SEED_VENDORS: list[dict[str, Any]] = [
    {
        "id": "ep-l3harris", "name": "L3Harris Technologies", "category": "Defense",
        "tags": ["Defense", "C4ISR", "ISR", "Electronic Warfare", "Fort Bliss"],
        "evidence": ["Fort Bliss C4ISR contract 2023 ($240M)", "IVAS headset integration support",
                     "1st Armored Division ISR aircraft maintenance"],
        "description": "Defense electronics and C4ISR systems integrator with a major support contract at Fort Bliss.",
        "iker_score": 92, "weight": 0.92, "confidence": 0.95,
    },
    {
        "id": "ep-raytheon", "name": "Raytheon Technologies (RTX)", "category": "Defense",
        "tags": ["Defense", "Missiles", "Patriot", "Radar", "Fort Bliss"],
        "evidence": ["Patriot PAC-3 MSE production contract ($1.2B, 2024)",
                     "Fort Bliss Air Defense Artillery sustainment", "LTAMDS radar testing program"],
        "description": "Prime defense contractor delivering Patriot missile systems, radar platforms, and precision munitions.",
        "iker_score": 90, "weight": 0.90, "confidence": 0.94,
    },
    {
        "id": "ep-saic", "name": "SAIC", "category": "Defense IT",
        "tags": ["Defense IT", "Logistics Systems", "Digital Transformation", "Fort Bliss"],
        "evidence": ["Army ATIS program support contract", "Fort Bliss network modernization ($85M)",
                     "GCSS-Army logistics platform deployment"],
        "description": "IT modernization, logistics information systems, and digital transformation services.",
        "iker_score": 88, "weight": 0.88, "confidence": 0.91,
    },
    {
        "id": "ep-crowdstrike", "name": "CrowdStrike Federal", "category": "Cybersecurity",
        "tags": ["Cybersecurity", "EDR", "Endpoint Protection", "Threat Intelligence", "DoD", "CBP"],
        "evidence": ["DISA endpoint security program (Falcon platform deployment)",
                     "CBP network security task order ($38M, 2024)",
                     "Army ARCYBER threat intelligence feed integration"],
        "description": "Endpoint detection and response (EDR) and threat intelligence platform.",
        "iker_score": 83, "weight": 0.83, "confidence": 0.82,
    },
    {
        "id": "ep-palantir", "name": "Palantir Technologies (Army)", "category": "Defense IT",
        "tags": ["AI/ML", "Defense Analytics", "Intelligence Platform", "AIP", "Gotham", "Army"],
        "evidence": ["Army AIP deployment contract ($480M, 2024 ceiling)",
                     "Fort Bliss AIP operational planning pilot (2024)",
                     "Palantir TITAN ground station integration support"],
        "description": "Provides the Army AI Platform (AIP) and Palantir Gotham intelligence platform.",
        "iker_score": 89, "weight": 0.89, "confidence": 0.88,
    },
]


class ProductScannerAgent(BaseAgent):
    """Scans vendor records to extract products, solutions, and service offerings."""

    name = "product_scanner"
    description = "Scans vendor records to extract products, solutions, and service offerings"
    group = "analysis"
    cadence_hours = 24  # daily scan

    async def run(self) -> AgentResult:
        start = time.time()
        vendor_results: list[dict[str, Any]] = []
        total_products = 0

        for vendor in _SEED_VENDORS:
            result = _scan_vendor(vendor)
            vendor_results.append(result)
            total_products += result["total_products"]
            self.logger.info(
                "Scanned %s: %d products found, top=%s",
                result["vendor_name"],
                result["total_products"],
                result["top_capability"],
            )

        duration = time.time() - start

        return AgentResult(
            success=True,
            entities_found=len(vendor_results),
            signals_found=total_products,
            errors=[],
            data={
                "vendors_scanned": len(vendor_results),
                "total_products_found": total_products,
                "vendors_with_products": sum(
                    1 for v in vendor_results if v["total_products"] > 0
                ),
                "vendors": vendor_results,
                "duration_ms": round(duration * 1000),
            },
        )
