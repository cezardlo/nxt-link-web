from dataclasses import dataclass

from app.ontology import CAPABILITY_TAGS, INDUSTRIES, PROBLEM_CATEGORIES, SOLUTION_TYPES
from app.schemas import ClassificationResult, TruthCard


@dataclass
class KeywordRule:
    label: str
    keywords: list[str]


INDUSTRY_RULES = [
    KeywordRule("Logistics", ["fleet", "dispatch", "route", "shipment", "last mile"]),
    KeywordRule("Manufacturing", ["production", "factory", "plant", "assembly"]),
    KeywordRule("Warehousing", ["warehouse", "fulfillment", "inventory"]),
    KeywordRule("Energy", ["power", "grid", "energy", "utility"]),
    KeywordRule("Healthcare", ["hospital", "clinical", "patient"]),
    KeywordRule("Construction", ["construction", "jobsite", "contractor"]),
    KeywordRule("Agriculture", ["farm", "crop", "agriculture"]),
    KeywordRule("Smart Cities", ["smart city", "municipal", "city infrastructure"]),
]

PROBLEM_RULES = [
    KeywordRule("Labor shortage", ["labor", "staffing", "workforce"]),
    KeywordRule("Inventory inaccuracy", ["inventory", "stockout", "stock accuracy"]),
    KeywordRule("High energy cost", ["energy cost", "utility", "electricity"]),
    KeywordRule("Equipment downtime", ["downtime", "outage", "asset failure"]),
    KeywordRule("Quality defects", ["defect", "quality", "scrap"]),
    KeywordRule("Low automation", ["manual process", "low automation", "paper process"]),
    KeywordRule("Manual paperwork", ["paperwork", "paper form", "manual entry"]),
    KeywordRule("Safety risk", ["safety", "incident", "osha", "hazard"]),
]

SOLUTION_RULES = [
    KeywordRule("Robotics", ["robot", "robotics", "amr", "cobot"]),
    KeywordRule("AI software", ["ai", "machine learning", "llm"]),
    KeywordRule("Vision systems", ["vision", "camera", "image", "inspection"]),
    KeywordRule("IoT sensors", ["sensor", "iot", "telematics"]),
    KeywordRule("Workflow automation", ["workflow", "orchestration", "automation"]),
    KeywordRule("Analytics", ["analytics", "dashboard", "insights", "kpi"]),
    KeywordRule("ERP extensions", ["erp", "sap", "oracle", "netsuite", "dynamics"]),
]

CAPABILITY_RULES = [
    KeywordRule("route_optimization", ["route optimization", "dispatch"]),
    KeywordRule("predictive_maintenance", ["predictive", "maintenance", "downtime"]),
    KeywordRule("computer_vision", ["vision", "image", "camera"]),
    KeywordRule("fleet_telematics", ["fleet", "telematics", "driver"]),
    KeywordRule("demand_forecasting", ["forecast", "planning", "demand"]),
    KeywordRule("energy_optimization", ["energy", "utility", "power"]),
    KeywordRule("work_order_automation", ["work order", "workflow", "ticket"]),
    KeywordRule("document_digitization", ["document", "paperwork", "forms"]),
]


def _normalize(card: TruthCard) -> str:
    values = [
        card.vendor_name,
        " ".join(card.product_names),
        " ".join(card.capabilities),
        " ".join(card.industries_mentioned),
        " ".join(card.integrations_mentioned),
        card.deployment_type or "",
        " ".join(card.geographic_signals),
    ]
    return " ".join(values).lower()


def _best_match(text: str, rules: list[KeywordRule]) -> tuple[str, float]:
    best_label = "Unknown"
    best_score = 0.0
    for rule in rules:
        hits = sum(1 for kw in rule.keywords if kw in text)
        score = hits / max(1, len(rule.keywords))
        if score > best_score:
            best_score = score
            best_label = rule.label
    return best_label, round(best_score, 3)


def classify_truth_card(card: TruthCard, evidence_ids: list[str]) -> ClassificationResult:
    text = _normalize(card)
    industry, industry_score = _best_match(text, INDUSTRY_RULES)
    problem, problem_score = _best_match(text, PROBLEM_RULES)
    solution, solution_score = _best_match(text, SOLUTION_RULES)

    capability_tags = [
        rule.label
        for rule in CAPABILITY_RULES
        if any(keyword in text for keyword in rule.keywords)
    ][:8]
    capability_tags = [tag for tag in capability_tags if tag in CAPABILITY_TAGS]

    confidence = max(0.2, min(0.99, industry_score * 0.34 + problem_score * 0.33 + solution_score * 0.33 + 0.14))

    unknown_candidates: list[str] = []
    if confidence < 0.72:
        tokens = [token for token in text.split() if len(token) >= 6][:3]
        if tokens:
            unknown_candidates.append(" ".join(tokens))

    if industry not in INDUSTRIES:
        industry = "Unknown"
    if problem not in PROBLEM_CATEGORIES:
        problem = "Unknown"
    if solution not in SOLUTION_TYPES:
        solution = "Unknown"

    return ClassificationResult(
        industry=industry,
        problem_category=problem,
        solution_type=solution,
        capability_tags=capability_tags,
        confidence=round(confidence, 2),
        evidence_ids=evidence_ids,
        unknown_candidate_labels=unknown_candidates,
    )

