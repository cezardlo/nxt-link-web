"""Security layer for pipeline agents — sanitize, validate, and harden all external input.

Defends against:
- XSS via stored content (RSS titles, article text)
- SSRF via URL validation (trafilatura, RSS)
- Prompt injection / zombie prompts (future LLM calls)
- Malformed/oversized input
- Data exfiltration via embedded URLs
"""

import re
import html
import logging
from urllib.parse import urlparse

logger = logging.getLogger("pipeline.sanitize")

# ─── URL Validation ──────────────────────────────────────────────────────────

# Block internal/private network ranges
_BLOCKED_HOSTS = re.compile(
    r"^("
    r"localhost|"
    r"127\.\d+\.\d+\.\d+|"
    r"10\.\d+\.\d+\.\d+|"
    r"172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|"
    r"192\.168\.\d+\.\d+|"
    r"169\.254\.\d+\.\d+|"  # link-local
    r"0\.0\.0\.0|"
    r"\[::1?\]|"  # IPv6 loopback
    r"metadata\.google\.internal|"  # cloud metadata
    r"169\.254\.169\.254"  # AWS/GCP metadata endpoint
    r")$",
    re.IGNORECASE,
)

_ALLOWED_SCHEMES = {"http", "https"}


def validate_url(url: str) -> bool:
    """Check URL is safe to fetch — blocks SSRF targets and non-HTTP schemes."""
    try:
        parsed = urlparse(url.strip())
    except Exception:
        return False

    if parsed.scheme not in _ALLOWED_SCHEMES:
        return False

    host = parsed.hostname or ""
    if not host:
        return False

    if _BLOCKED_HOSTS.match(host):
        logger.warning(f"Blocked SSRF target: {host}")
        return False

    # Block URLs with credentials embedded
    if parsed.username or parsed.password:
        logger.warning(f"Blocked URL with embedded credentials: {url[:80]}")
        return False

    return True


# ─── Text Sanitization ───────────────────────────────────────────────────────

# HTML/script patterns that shouldn't appear in signal text
_DANGEROUS_PATTERNS = [
    re.compile(r"<\s*script", re.IGNORECASE),
    re.compile(r"javascript\s*:", re.IGNORECASE),
    re.compile(r"on\w+\s*=", re.IGNORECASE),       # onclick=, onerror=, etc.
    re.compile(r"<\s*iframe", re.IGNORECASE),
    re.compile(r"<\s*object", re.IGNORECASE),
    re.compile(r"<\s*embed", re.IGNORECASE),
    re.compile(r"<\s*form", re.IGNORECASE),
    re.compile(r"data\s*:\s*text/html", re.IGNORECASE),
]


def sanitize_text(text: str, max_length: int = 5000) -> str:
    """Clean text for safe storage — strips HTML tags, escapes entities, truncates.

    Use on all externally-sourced text before storing in the database.
    """
    if not text or not isinstance(text, str):
        return ""

    # Strip HTML tags
    cleaned = re.sub(r"<[^>]+>", " ", text)

    # Decode HTML entities (e.g. &amp; → &), then re-escape for safe storage
    cleaned = html.unescape(cleaned)
    cleaned = html.escape(cleaned, quote=False)

    # Collapse whitespace
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    # Truncate
    if len(cleaned) > max_length:
        cleaned = cleaned[:max_length]

    return cleaned


def sanitize_title(title: str) -> str:
    """Clean a signal title — stricter than general text."""
    cleaned = sanitize_text(title, max_length=500)

    # Titles should be single-line
    cleaned = cleaned.replace("\n", " ").replace("\r", " ")

    return cleaned


def check_xss(text: str) -> bool:
    """Return True if text contains XSS-like patterns. Logs a warning."""
    for pattern in _DANGEROUS_PATTERNS:
        if pattern.search(text):
            logger.warning(f"XSS pattern detected in content: {pattern.pattern}")
            return True
    return False


# ─── Prompt Injection Defense ────────────────────────────────────────────────

# Patterns that indicate prompt injection / zombie prompts in retrieved content
_INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(all\s+)?previous\s+instructions", re.IGNORECASE),
    re.compile(r"ignore\s+(all\s+)?above\s+instructions", re.IGNORECASE),
    re.compile(r"disregard\s+(all\s+)?previous", re.IGNORECASE),
    re.compile(r"you\s+are\s+now\s+a", re.IGNORECASE),
    re.compile(r"new\s+instructions?\s*:", re.IGNORECASE),
    re.compile(r"system\s*prompt\s*:", re.IGNORECASE),
    re.compile(r"<\s*system\s*>", re.IGNORECASE),
    re.compile(r"\[INST\]", re.IGNORECASE),
    re.compile(r"\[/INST\]", re.IGNORECASE),
    re.compile(r"<<\s*SYS\s*>>", re.IGNORECASE),
    re.compile(r"human\s*:\s*\n", re.IGNORECASE),
    re.compile(r"assistant\s*:\s*\n", re.IGNORECASE),
    re.compile(r"forget\s+(everything|all|what)", re.IGNORECASE),
    re.compile(r"act\s+as\s+(if\s+)?(you|an?\s+)", re.IGNORECASE),
    re.compile(r"pretend\s+(you|to\s+be)", re.IGNORECASE),
    re.compile(r"do\s+not\s+follow\s+(any|the|your)", re.IGNORECASE),
    re.compile(r"override\s+(the\s+)?(system|safety|instructions)", re.IGNORECASE),
]


def detect_injection(text: str) -> list[str]:
    """Scan text for prompt injection patterns. Returns list of matched patterns.

    Call this on any content before passing it to an LLM as context.
    Empty list = safe. Non-empty = contains suspicious patterns.
    """
    if not text:
        return []

    matches = []
    for pattern in _INJECTION_PATTERNS:
        if pattern.search(text):
            matches.append(pattern.pattern)

    if matches:
        logger.warning(f"Prompt injection detected ({len(matches)} patterns): {matches[0]}")

    return matches


def fence_content(text: str, source: str = "external") -> str:
    """Wrap external content in boundary markers for LLM context.

    This creates clear separation between system instructions and untrusted data,
    making it harder for injected prompts to break out of the data context.

    Use this when passing retrieved content (articles, signals) into LLM prompts.
    """
    sanitized = sanitize_text(text)
    return (
        f"<external_content source=\"{html.escape(source)}\">\n"
        f"{sanitized}\n"
        f"</external_content>"
    )


# ─── Input Validation ────────────────────────────────────────────────────────

def validate_signal(signal: dict) -> tuple[bool, str]:
    """Validate a signal dict before database insertion.

    Returns (is_valid, reason).
    """
    title = signal.get("title", "")
    url = signal.get("url", "")

    if not title or len(title.strip()) < 5:
        return False, "title too short"

    if not url:
        return False, "missing url"

    if not validate_url(url):
        return False, f"invalid url: {url[:80]}"

    if check_xss(title):
        return False, "xss in title"

    evidence = signal.get("evidence", [])
    if isinstance(evidence, list):
        for e in evidence:
            if isinstance(e, dict) and check_xss(e.get("text", "")):
                return False, "xss in evidence"

    return True, "ok"


# ─── DB Table Name Validation ────────────────────────────────────────────────

_VALID_TABLES = frozenset({
    "intel_signals",
    "cluster_metrics",
    "signal_clusters",
    "causal_chains",
    "causal_chain_signals",
    "signal_connections",
    "top_insights",
    "region_intelligence",
    "daily_briefings",
})

_TABLE_NAME_PATTERN = re.compile(r"^[a-z][a-z0-9_]{1,63}$")


def validate_table_name(table: str) -> bool:
    """Validate table name to prevent injection in REST API URL construction."""
    if table in _VALID_TABLES:
        return True
    if _TABLE_NAME_PATTERN.match(table):
        return True
    logger.warning(f"Invalid table name rejected: {table}")
    return False
