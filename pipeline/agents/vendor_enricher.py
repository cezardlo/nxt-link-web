"""
Vendor Enricher — finds real websites for exhibitor names, scrapes company info.
No LLM. Domain probing + BeautifulSoup extraction.
"""

import asyncio
import re
from dataclasses import dataclass, field
from typing import Optional
from urllib.parse import urljoin

from loguru import logger

from pipeline.utils.http_client import fetch, fetch_text, close_client
from pipeline.utils.supabase_client import upsert_vendors


@dataclass
class EnrichedVendor:
    name: str
    domain: str = ""
    description: str = ""
    products: list[str] = field(default_factory=list)
    technologies: list[str] = field(default_factory=list)
    industries: list[str] = field(default_factory=list)
    country: str = ""
    employee_estimate: str = ""
    confidence: float = 0.0
    source_conference: str = ""


DOMAIN_SUFFIXES = [".com", ".io", ".ai", ".co", ".tech", ".net", ".org"]
ABOUT_PATHS = ["/about", "/about-us", "/company", "/who-we-are"]
PRODUCT_PATHS = ["/products", "/solutions", "/services", "/platform"]

TECH_KEYWORDS = {
    "AI": ["artificial intelligence", "machine learning", "deep learning", "ai-powered"],
    "IoT": ["iot", "internet of things", "connected devices", "sensor", "telemetry"],
    "Robotics": ["robot", "autonomous", "automation", "cobot", "drone"],
    "Blockchain": ["blockchain", "distributed ledger", "smart contract"],
    "Cloud": ["cloud", "saas", "aws", "azure", "kubernetes"],
    "Fleet Management": ["fleet", "telematics", "gps tracking", "dispatch"],
    "Warehouse": ["warehouse", "wms", "inventory", "fulfillment"],
    "Supply Chain": ["supply chain", "logistics", "freight", "shipping"],
    "Cybersecurity": ["cybersecurity", "security", "encryption", "zero trust"],
    "Clean Energy": ["solar", "ev", "electric vehicle", "battery", "sustainability"],
    "Computer Vision": ["computer vision", "image recognition", "lidar"],
}

INDUSTRY_KEYWORDS = {
    "Logistics": ["logistics", "freight", "shipping", "trucking", "carrier", "3pl"],
    "Manufacturing": ["manufacturing", "factory", "production", "industrial"],
    "Defense": ["defense", "military", "dod"],
    "Technology": ["software", "technology", "platform", "digital"],
    "Energy": ["energy", "oil", "gas", "renewable"],
    "Retail": ["retail", "ecommerce", "consumer"],
    "Healthcare": ["healthcare", "medical", "pharma"],
    "Automotive": ["automotive", "vehicle", "auto", "truck"],
}


def _slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", name.lower())


async def find_domain(name: str, hint: str = "") -> Optional[str]:
    if hint and hint.startswith("http"):
        try:
            resp = await fetch(hint, method="HEAD")
            if resp.status_code < 400:
                return hint
        except Exception:
            pass

    slug = _slugify(name)
    if not slug:
        return None

    for suffix in DOMAIN_SUFFIXES:
        url = f"https://{slug}{suffix}"
        try:
            resp = await fetch(url, method="HEAD")
            if resp.status_code < 400:
                return url
        except Exception:
            continue

    # Try dashed version
    slug_dashed = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    if slug_dashed != slug:
        for suffix in [".com", ".io", ".ai"]:
            url = f"https://{slug_dashed}{suffix}"
            try:
                resp = await fetch(url, method="HEAD")
                if resp.status_code < 400:
                    return url
            except Exception:
                continue
    return None


async def enrich_vendor(name: str, conference: str = "", hint: str = "") -> Optional[EnrichedVendor]:
    vendor = EnrichedVendor(name=name, source_conference=conference)

    domain = await find_domain(name, hint)
    if not domain:
        vendor.confidence = 0.2
        return vendor

    vendor.domain = domain
    vendor.confidence = 0.6

    from bs4 import BeautifulSoup

    homepage = await fetch_text(domain)
    if not homepage:
        return vendor

    soup = BeautifulSoup(homepage, "lxml")
    meta = soup.find("meta", attrs={"name": "description"})
    if meta and meta.get("content"):
        vendor.description = str(meta["content"])[:300]
        vendor.confidence = 0.7

    # Scrape about page
    for path in ABOUT_PATHS:
        about_html = await fetch_text(urljoin(domain, path))
        if about_html:
            about_soup = BeautifulSoup(about_html, "lxml")
            main = about_soup.find(["main", "article"]) or about_soup.find("body")
            if main:
                text = main.get_text(separator=" ", strip=True)[:2000]
                if len(text) > len(vendor.description):
                    vendor.description = text[:500]
                    vendor.confidence = 0.8
                # Country detection
                for country, pat in {
                    "United States": r"(?:USA|United States|US-based)",
                    "Germany": r"(?:Germany|Deutschland|GmbH)",
                    "United Kingdom": r"(?:United Kingdom|UK|London)",
                    "Japan": r"(?:Japan|Tokyo)",
                    "Canada": r"(?:Canada|Toronto|Vancouver)",
                    "Israel": r"(?:Israel|Tel Aviv)",
                }.items():
                    if re.search(pat, text, re.I):
                        vendor.country = country
                        break
                emp = re.search(r"(\d{1,3}(?:,\d{3})*)\+?\s*(?:employees|team members)", text, re.I)
                if emp:
                    vendor.employee_estimate = emp.group(1)
            break

    # Scrape products page
    for path in PRODUCT_PATHS:
        prod_html = await fetch_text(urljoin(domain, path))
        if prod_html:
            prod_soup = BeautifulSoup(prod_html, "lxml")
            for h in prod_soup.find_all(["h2", "h3"])[:10]:
                t = h.get_text().strip()
                if 3 <= len(t) <= 80:
                    vendor.products.append(t)
            break

    # Detect tech/industry
    all_text = (vendor.description + " " + " ".join(vendor.products)).lower()
    vendor.technologies = [t for t, kws in TECH_KEYWORDS.items() if any(k in all_text for k in kws)]
    vendor.industries = [i for i, kws in INDUSTRY_KEYWORDS.items() if any(k in all_text for k in kws)]

    if vendor.products or vendor.technologies:
        vendor.confidence = min(vendor.confidence + 0.1, 0.95)

    return vendor


@dataclass
class EnrichmentReport:
    vendors_processed: int = 0
    vendors_enriched: int = 0
    vendors_with_domain: int = 0
    results: list[EnrichedVendor] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    duration_ms: int = 0
    persisted: int = 0


async def run_vendor_enrichment(
    vendors: list[dict], max_concurrent: int = 3, persist: bool = True,
) -> EnrichmentReport:
    start = asyncio.get_event_loop().time()
    report = EnrichmentReport(vendors_processed=len(vendors))
    logger.info(f"Enriching {len(vendors)} vendors")

    sem = asyncio.Semaphore(max_concurrent)

    async def _do(v):
        async with sem:
            return await enrich_vendor(v["name"], v.get("conference_source", ""), v.get("website_hint", ""))

    results = await asyncio.gather(*[_do(v) for v in vendors], return_exceptions=True)

    for r in results:
        if isinstance(r, Exception):
            report.errors.append(str(r))
        elif r:
            report.results.append(r)
            if r.domain:
                report.vendors_with_domain += 1
            if r.confidence >= 0.5:
                report.vendors_enriched += 1

    if persist and report.results:
        records = [
            {
                "id": re.sub(r"[^a-z0-9]+", "-", v.name.lower()).strip("-"),
                "canonical_name": v.name, "official_domain": v.domain,
                "description": v.description[:500], "products": v.products[:10],
                "technologies": v.technologies, "industries": v.industries,
                "country": v.country, "vendor_type": "exhibitor",
                "employee_estimate": v.employee_estimate,
                "conference_sources": [v.source_conference] if v.source_conference else [],
                "confidence": v.confidence,
            }
            for v in report.results if v.confidence >= 0.3
        ]
        if records:
            try:
                report.persisted = upsert_vendors(records)
            except Exception as e:
                logger.error(f"Persist failed: {e}")

    report.duration_ms = int((asyncio.get_event_loop().time() - start) * 1000)
    await close_client()
    logger.info(f"Done: {report.vendors_enriched}/{report.vendors_processed} enriched ({report.duration_ms}ms)")
    return report
