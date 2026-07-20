"""HTML parsing — multi-strategy exhibitor extraction from conference pages."""

import re
from dataclasses import dataclass, field
from typing import Optional

from bs4 import BeautifulSoup, Tag
from loguru import logger

from pipeline.utils.name_filter import is_valid_company_name, is_likely_person_name

try:
    import extruct
    HAS_EXTRUCT = True
except ImportError:
    HAS_EXTRUCT = False


@dataclass
class ExhibitorRecord:
    name: str
    booth: str = ""
    category: str = ""
    website: str = ""
    description: str = ""
    logo_url: str = ""
    country: str = ""
    technologies: list[str] = field(default_factory=list)
    confidence: float = 0.7


def _clean(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def _normalize_name(name: str) -> str:
    return re.sub(
        r"\s*(Inc\.?|LLC|Corp\.?|Ltd\.?|Co\.?|GmbH|S\.?A\.?|B\.?V\.?|PLC|AG|SE|SAS|Pty|NV)$",
        "", name, flags=re.IGNORECASE,
    ).rstrip(" ,.")


def extract_exhibitors_from_html(html: str, conference_name: str = "") -> list[ExhibitorRecord]:
    """
    5-strategy exhibitor extraction:
    1. JSON-LD structured data
    2. Exhibitor-class containers
    3. Card/grid layouts
    4. Table rows
    5. A-Z link lists
    """
    soup = BeautifulSoup(html, "lxml")
    seen: set[str] = set()
    results: list[ExhibitorRecord] = []

    def _add(rec: ExhibitorRecord) -> bool:
        key = _normalize_name(rec.name).lower()
        if key in seen or not is_valid_company_name(rec.name):
            return False
        seen.add(key)
        rec.name = _normalize_name(rec.name)
        results.append(rec)
        return True

    # Strategy 1: JSON-LD
    if HAS_EXTRUCT:
        try:
            data = extruct.extract(html, syntaxes=["json-ld", "microdata"])
            for item in data.get("json-ld", []):
                if isinstance(item, dict):
                    name = item.get("name", "")
                    if name and item.get("@type") in ("Organization", "LocalBusiness", "Corporation"):
                        _add(ExhibitorRecord(
                            name=_clean(name), website=item.get("url", ""),
                            description=_clean(item.get("description", "")), confidence=0.95,
                        ))
        except Exception:
            pass

    # Strategy 2: Exhibitor containers
    for pattern in [r"exhibitor", r"sponsor", r"vendor", r"company", r"participant", r"partner", r"brand"]:
        regex = re.compile(pattern, re.IGNORECASE)
        containers = soup.find_all(["div", "section", "ul", "article"], class_=regex)
        containers += soup.find_all(["div", "section", "ul", "article"], id=regex)
        for container in containers:
            for item in container.find_all(["li", "div", "article", "a"], recursive=True):
                name_el = item.find(["h2", "h3", "h4", "h5", "strong", "b", "span"])
                name = _clean(name_el.get_text()) if name_el else _clean(item.get_text())
                if len(name) > 100:
                    continue
                rec = ExhibitorRecord(name=name, confidence=0.8)
                # Booth
                booth_el = item.find(string=re.compile(r"booth|stand", re.I))
                if booth_el:
                    m = re.search(r"(?:booth|stand)\s*[:#]?\s*([A-Z0-9\-]+)", str(booth_el), re.I)
                    if m:
                        rec.booth = m.group(1)
                # Website
                link = item.find("a", href=re.compile(r"^https?://"))
                if link and isinstance(link, Tag):
                    rec.website = link.get("href", "")
                # Logo
                img = item.find("img")
                if img and isinstance(img, Tag):
                    rec.logo_url = img.get("src", "") or img.get("data-src", "")
                # Description
                desc_el = item.find(["p", "span"], class_=re.compile(r"desc|summary|about|category", re.I))
                if desc_el:
                    rec.description = _clean(desc_el.get_text())[:200]
                _add(rec)

    # Strategy 3: Card layouts
    for pattern in [r"card", r"tile", r"grid-item", r"listing", r"entry"]:
        cards = soup.find_all(["div", "article", "li"], class_=re.compile(pattern, re.IGNORECASE))
        for card in cards:
            heading = card.find(["h2", "h3", "h4", "h5"])
            if not heading:
                continue
            name = _clean(heading.get_text())
            if len(name) > 80:
                continue
            rec = ExhibitorRecord(name=name, confidence=0.65)
            link = card.find("a", href=re.compile(r"^https?://"))
            if link and isinstance(link, Tag):
                rec.website = link.get("href", "")
            img = card.find("img")
            if img and isinstance(img, Tag):
                rec.logo_url = img.get("src", "") or img.get("data-src", "")
            desc = card.find("p")
            if desc:
                rec.description = _clean(desc.get_text())[:200]
            _add(rec)

    # Strategy 4: Table rows
    for table in soup.find_all("table"):
        for row in table.find_all("tr")[1:]:
            cells = row.find_all(["td", "th"])
            if cells:
                name = _clean(cells[0].get_text())
                if len(name) > 80:
                    continue
                rec = ExhibitorRecord(name=name, confidence=0.6)
                if len(cells) > 1:
                    rec.booth = _clean(cells[1].get_text())[:20]
                if len(cells) > 2:
                    rec.category = _clean(cells[2].get_text())[:60]
                link = cells[0].find("a", href=re.compile(r"^https?://"))
                if link and isinstance(link, Tag):
                    rec.website = link.get("href", "")
                _add(rec)

    # Strategy 5: A-Z link lists (last resort)
    if len(results) < 10:
        for link in soup.find_all("a"):
            text = _clean(link.get_text())
            href = link.get("href", "")
            if (3 <= len(text) <= 60 and re.match(r"[A-Z]", text)
                    and isinstance(href, str)
                    and any(kw in href for kw in ["exhibitor", "sponsor", "vendor", "company", "directory"])):
                _add(ExhibitorRecord(
                    name=text, website=href if href.startswith("http") else "", confidence=0.55,
                ))

    logger.info(f"Extracted {len(results)} exhibitors from HTML ({conference_name})")
    return results


def find_exhibitor_links(html: str, base_url: str) -> list[str]:
    """Find links to exhibitor pages from a conference homepage."""
    from urllib.parse import urljoin
    soup = BeautifulSoup(html, "lxml")
    keywords = ["exhibitor", "sponsor", "vendor", "directory", "expo", "showcase", "partner", "companies"]
    links, seen = [], set()
    for a in soup.find_all("a", href=True):
        href = a["href"]
        text = _clean(a.get_text()).lower()
        href_lower = href.lower()
        if any(kw in href_lower or kw in text for kw in keywords):
            if href.startswith("/"):
                href = urljoin(base_url, href)
            elif not href.startswith("http"):
                continue
            if href not in seen:
                seen.add(href)
                links.append(href)
    return links


def extract_pagination_links(html: str, base_url: str) -> list[str]:
    """Find pagination links."""
    from urllib.parse import urljoin
    soup = BeautifulSoup(html, "lxml")
    pages, seen = [], set()
    pag = soup.find(class_=re.compile(r"paginat|pager|page-nav", re.I))
    if pag:
        for a in pag.find_all("a", href=True):
            href = a["href"]
            if href.startswith("/"):
                href = urljoin(base_url, href)
            if href not in seen and href.startswith("http"):
                seen.add(href)
                pages.append(href)
    for a in soup.find_all("a", href=re.compile(r"[?&]page=\d|/page/\d")):
        href = a["href"]
        if href.startswith("/"):
            href = urljoin(base_url, href)
        if href not in seen and href.startswith("http"):
            seen.add(href)
            pages.append(href)
    return pages[:20]
