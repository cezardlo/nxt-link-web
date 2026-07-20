"""
Smart name filtering — distinguishes real company names from noise.
Uses heuristics + known patterns instead of spaCy (Python 3.14 compat).
"""

import re
from rapidfuzz import fuzz

# ─── Known non-company patterns ─────────────────────────────────────────────

# Common first names that slip through as exhibitor names
FIRST_NAMES = {
    "adam", "alex", "alice", "amanda", "amy", "andrew", "anna", "ben", "bill",
    "bob", "brian", "bruce", "carl", "carol", "charles", "chris", "cory",
    "dan", "daniel", "dave", "david", "dean", "diane", "don", "donna", "doug",
    "ed", "emily", "eric", "frank", "gary", "george", "greg", "harry", "jack",
    "james", "jane", "jason", "jeff", "jennifer", "jerry", "jessica", "jim",
    "joe", "john", "josh", "karen", "kate", "keith", "ken", "kevin", "kim",
    "larry", "laura", "linda", "lisa", "mark", "mary", "matt", "michael",
    "mike", "nancy", "nick", "paul", "peter", "rachel", "ray", "richard",
    "rob", "robert", "roger", "ron", "ryan", "sam", "sandra", "sarah", "scott",
    "sean", "steve", "steven", "susan", "terry", "tim", "tom", "tony", "wayne",
    "william",
}

# Navigation / UI elements that get extracted as names
UI_NOISE = {
    "home", "about", "about us", "contact", "contact us", "privacy", "privacy policy",
    "terms", "terms of service", "menu", "search", "login", "sign in", "sign up",
    "register", "back", "next", "prev", "previous", "more", "less", "close", "open",
    "exhibitors", "sponsors", "vendors", "directory", "floor plan", "booth map",
    "view all", "see all", "show more", "load more", "cookie", "accept", "decline",
    "read more", "learn more", "click here", "download", "subscribe", "newsletter",
    "all rights reserved", "copyright", "powered by", "follow us", "share",
    "facebook", "twitter", "linkedin", "instagram", "youtube", "tiktok",
    "events", "news", "blog", "press", "media", "careers", "jobs", "faq",
    "help", "support", "submit", "cancel", "save", "edit", "delete",
    "yes", "no", "ok", "loading", "error", "success", "warning",
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
    "january", "february", "march", "april", "may", "june", "july",
    "august", "september", "october", "november", "december",
    "booth", "hall", "pavilion", "level", "floor", "room", "area",
    "agenda", "schedule", "program", "speakers", "keynote", "session",
    "exhibit hall", "exhibition", "trade show", "conference",
}

# Patterns that look like company names but aren't
NON_COMPANY_PATTERNS = [
    r"^\d+$",                           # Just numbers
    r"^[A-Z]{1,2}\d+$",                # Booth numbers: A1, B23
    r"^\d{1,2}:\d{2}",                  # Times: 10:30
    r"^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)",  # Days
    r"^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d", # Dates
    r"^Page\s+\d",                      # Page numbers
    r"^Step\s+\d",                      # Steps
    r"^(Chapter|Section|Part)\s+\d",    # Document sections
    r"©",                               # Copyright symbols
    r"^\w+@\w+",                        # Email addresses
    r"^https?://",                      # URLs
    r"^\+?\d[\d\s\-()]+$",             # Phone numbers
]

# Company name indicators (suffixes and patterns that suggest a real company)
COMPANY_INDICATORS = [
    r"\b(Inc|LLC|Corp|Ltd|Co|GmbH|SA|BV|PLC|AG|SE|SAS|Pty|NV|AB|AS|SRL|SpA)\b",
    r"\b(Systems|Solutions|Technologies|Services|Industries|Group|International)\b",
    r"\b(Manufacturing|Logistics|Transport|Engineering|Consulting|Partners)\b",
    r"\b(Labs|Dynamics|Ventures|Capital|Networks|Digital|Software|Hardware)\b",
]


def is_likely_person_name(name: str) -> bool:
    """Check if name looks like a person rather than a company."""
    words = name.split()
    if len(words) == 2:
        # Two words, both capitalized, first word is a known first name
        if words[0].lower() in FIRST_NAMES:
            return True
    if len(words) == 3:
        # Three words with middle initial: "John A. Smith"
        if words[0].lower() in FIRST_NAMES and len(words[1].rstrip(".")) <= 2:
            return True
    return False


def is_valid_company_name(name: str) -> bool:
    """
    Determine if a string is likely a real company name.
    Returns True if it passes all filters.
    """
    name = name.strip()

    # Length check
    if len(name) < 2 or len(name) > 100:
        return False

    # Exact noise match
    if name.lower() in UI_NOISE:
        return False

    # Non-company patterns
    for pattern in NON_COMPANY_PATTERNS:
        if re.match(pattern, name, re.I):
            return False

    # Person name check
    if is_likely_person_name(name):
        return False

    # Must have at least one word with 2+ letters
    if not re.search(r"[a-zA-Z]{2,}", name):
        return False

    # Single word under 4 chars is suspicious unless it's an acronym
    words = name.split()
    if len(words) == 1 and len(name) < 4 and not name.isupper():
        return False

    # Too many words = probably a sentence/headline, not a company name
    if len(words) > 8:
        return False

    # Starts with common article/sentence starters
    sentence_starters = {"the ", "a ", "an ", "this ", "that ", "our ", "your ", "we ", "they "}
    if any(name.lower().startswith(s) for s in sentence_starters):
        # Allow "The" only if followed by a short company-like name (e.g. "The Boeing Company")
        if name.lower().startswith("the ") and len(words) <= 4:
            pass  # might be legit: "The Home Depot"
        else:
            return False

    return True


def has_company_indicator(name: str) -> bool:
    """Check if name has strong company indicators (Inc, LLC, etc.)."""
    for pattern in COMPANY_INDICATORS:
        if re.search(pattern, name, re.I):
            return True
    return False


def deduplicate_names(
    names: list[str],
    threshold: float = 85.0,
) -> list[str]:
    """
    Remove near-duplicate company names using fuzzy matching.
    Keeps the longest/most complete version.
    """
    if not names:
        return []

    # Sort by length descending (keep the more complete name)
    sorted_names = sorted(names, key=len, reverse=True)
    unique: list[str] = []

    for name in sorted_names:
        is_dup = False
        for existing in unique:
            ratio = fuzz.token_sort_ratio(name.lower(), existing.lower())
            if ratio >= threshold:
                is_dup = True
                break
        if not is_dup:
            unique.append(name)

    return unique


def filter_exhibitor_names(names: list[str]) -> list[str]:
    """
    Full pipeline: validate → deduplicate → sort.
    Takes raw extracted names, returns clean company names.
    """
    # Step 1: Filter invalid names
    valid = [n for n in names if is_valid_company_name(n)]

    # Step 2: Deduplicate
    unique = deduplicate_names(valid)

    # Step 3: Sort — companies with indicators first, then alphabetical
    def sort_key(n: str):
        has_indicator = has_company_indicator(n)
        return (0 if has_indicator else 1, n.lower())

    return sorted(unique, key=sort_key)
