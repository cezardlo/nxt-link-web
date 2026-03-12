import re
from urllib.parse import urlparse
from uuid import UUID

from pydantic import HttpUrl
from trafilatura import extract

from app.schemas import EvidenceSnippet, TruthCard


def _split_sentences(text: str) -> list[str]:
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if len(s.strip()) > 20]


def _extract_vendor_name(url: str, text: str) -> str:
    title_match = re.search(r"^\s*([A-Z][A-Za-z0-9&,\- ]{2,80})", text)
    if title_match:
        return title_match.group(1).strip()
    host = urlparse(url).netloc.replace("www.", "")
    return host.split(".")[0].replace("-", " ").title()


def _extract_products(text: str) -> list[str]:
    candidates = []
    for line in text.splitlines()[:120]:
        if re.search(r"\b(platform|suite|software|solution|product)\b", line, flags=re.IGNORECASE):
            cleaned = re.sub(r"\s+", " ", line).strip()
            if 3 <= len(cleaned) <= 120:
                candidates.append(cleaned)
    return list(dict.fromkeys(candidates))[:8]


def _extract_capabilities(text: str) -> list[str]:
    sentences = _split_sentences(text)
    capability_sentences = [
        s for s in sentences if re.search(r"\b(enable|automate|reduce|improve|optimize|monitor|predict|integrate)\b", s, flags=re.IGNORECASE)
    ]
    return capability_sentences[:15]


def _extract_integrations(text: str) -> list[str]:
    known = ["SAP", "Oracle", "NetSuite", "Salesforce", "Microsoft Dynamics", "Shopify", "ServiceNow"]
    found = [name for name in known if re.search(rf"\b{re.escape(name)}\b", text, flags=re.IGNORECASE)]
    return found[:10]


def _extract_industries(text: str) -> list[str]:
    known = [
        "warehousing",
        "manufacturing",
        "energy",
        "construction",
        "healthcare",
        "logistics",
        "agriculture",
        "smart cities",
    ]
    found = [name.title() for name in known if name in text.lower()]
    return found[:8]


def _extract_geography(text: str) -> list[str]:
    countries = [
        "United States",
        "Canada",
        "Mexico",
        "United Kingdom",
        "Germany",
        "India",
        "Japan",
        "Australia",
    ]
    found = [country for country in countries if re.search(rf"\b{re.escape(country)}\b", text, flags=re.IGNORECASE)]
    return found[:10]


def _infer_deployment_type(text: str) -> str | None:
    normalized = text.lower()
    if "on-prem" in normalized or "on premise" in normalized:
        return "on-prem"
    if "saas" in normalized or "cloud" in normalized:
        return "cloud"
    if "hybrid" in normalized:
        return "hybrid"
    return None


def extract_truth_card(url: str, capture_id: str | UUID, text: str) -> TruthCard:
    cleaned = extract(text) or text
    lines = re.sub(r"<[^>]+>", " ", cleaned)
    lines = re.sub(r"\s+", " ", lines).strip()

    vendor_name = _extract_vendor_name(url, lines)
    capabilities = _extract_capabilities(lines)
    if len(capabilities) < 3:
        capabilities = _split_sentences(lines)[:8]

    snippets = []
    for sentence in capabilities[:6]:
        snippets.append(EvidenceSnippet(quote=sentence[:260], url=url, capture_id=UUID(str(capture_id))))

    return TruthCard(
        vendor_name=vendor_name,
        product_names=_extract_products(lines),
        capabilities=capabilities[:15],
        industries_mentioned=_extract_industries(lines),
        integrations_mentioned=_extract_integrations(lines),
        deployment_type=_infer_deployment_type(lines),
        geographic_signals=_extract_geography(lines),
        evidence_snippets=snippets,
    )
