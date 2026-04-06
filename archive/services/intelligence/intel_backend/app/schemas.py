from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl

from app.ontology import CAPABILITY_TAGS, INDUSTRIES, PROBLEM_CATEGORIES, SOLUTION_TYPES


class SourceCreate(BaseModel):
    name: str
    base_url: HttpUrl
    category: Literal["directory", "exhibitor", "marketplace", "news", "jobs", "patents", "github"]
    crawl_method: Literal["rss", "sitemap", "html", "api", "search-page"]
    crawl_frequency_minutes: int = Field(ge=1, le=10080)
    rate_limit_per_minute: int = Field(ge=1, le=1000, default=30)
    render_js: bool = False


class SourceOut(BaseModel):
    source_id: UUID
    name: str
    base_url: HttpUrl
    category: str
    crawl_method: str
    crawl_frequency_minutes: int
    rate_limit_per_minute: int
    render_js: bool
    reliability_score: float
    last_success: datetime | None
    last_error: str | None


class EvidenceSnippet(BaseModel):
    quote: str
    url: HttpUrl
    capture_id: UUID


class TruthCard(BaseModel):
    vendor_name: str
    product_names: list[str]
    capabilities: list[str] = Field(min_length=1, max_length=15)
    industries_mentioned: list[str]
    integrations_mentioned: list[str]
    deployment_type: str | None
    geographic_signals: list[str]
    evidence_snippets: list[EvidenceSnippet] = Field(min_length=1)


class ClassificationResult(BaseModel):
    industry: str
    problem_category: str
    solution_type: str
    capability_tags: list[str]
    confidence: float = Field(ge=0, le=1)
    evidence_ids: list[UUID]
    unknown_candidate_labels: list[str] = Field(default_factory=list)


class SearchRequest(BaseModel):
    user_id: str
    query: str
    limit: int = Field(default=20, ge=1, le=100)
    industries: list[str] = Field(default_factory=list)
    problem_categories: list[str] = Field(default_factory=list)
    solution_types: list[str] = Field(default_factory=list)


class FeedbackEventIn(BaseModel):
    user_id: str
    search_result_id: UUID
    truth_card_id: UUID
    action: Literal["impression", "click", "save", "reject", "edit"]
    dwell_ms: int | None = Field(default=None, ge=0)
    edited_labels: dict | None = None
