from datetime import datetime
from uuid import uuid4

from pgvector.sqlalchemy import Vector
from sqlalchemy import JSON, ARRAY, Boolean, CheckConstraint, Date, DateTime, Enum, Float, ForeignKey
from sqlalchemy import Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Source(Base):
    __tablename__ = "sources"

    source_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(Text, nullable=False)
    base_url: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(
        Enum("directory", "exhibitor", "marketplace", "news", "jobs", "patents", "github", name="source_category"),
        nullable=False,
    )
    crawl_method: Mapped[str] = mapped_column(
        Enum("rss", "sitemap", "html", "api", "search-page", name="crawl_method"),
        nullable=False,
    )
    crawl_frequency_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    rate_limit_per_minute: Mapped[int] = mapped_column(Integer, nullable=False, default=20)
    render_js: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    reliability_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.5)
    circuit_open_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    etag: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_modified: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_success: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CrawlQueue(Base):
    __tablename__ = "crawl_queue"

    queue_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    source_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("sources.source_id"), nullable=False)
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=50)
    status: Mapped[str] = mapped_column(
        Enum("queued", "running", "completed", "failed", "retry_scheduled", "dead_letter", name="queue_status"),
        nullable=False,
        default="queued",
    )
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    attempt_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    max_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=6)
    next_retry_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    worker_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Capture(Base):
    __tablename__ = "captures"

    capture_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    source_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("sources.source_id"), nullable=False)
    queue_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("crawl_queue.queue_id"), nullable=True)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    normalized_url: Mapped[str] = mapped_column(Text, nullable=False)
    domain: Mapped[str] = mapped_column(Text, nullable=False)
    http_status: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(
        Enum("success", "failed", "blocked", "parse_error", name="capture_status"), nullable=False
    )
    etag: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_modified: Mapped[str | None] = mapped_column(Text, nullable=True)
    content_hash: Mapped[str | None] = mapped_column(Text, nullable=True)
    content_type: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw_snapshot_uri: Mapped[str | None] = mapped_column(Text, nullable=True)
    rendered_snapshot_uri: Mapped[str | None] = mapped_column(Text, nullable=True)
    text_snapshot_uri: Mapped[str | None] = mapped_column(Text, nullable=True)
    response_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    bytes_downloaded: Mapped[int | None] = mapped_column(Integer, nullable=True)
    parser_version: Mapped[str] = mapped_column(String(64), nullable=False)
    extraction_version: Mapped[str] = mapped_column(String(64), nullable=False)
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class EvidenceSnippet(Base):
    __tablename__ = "evidence_snippets"

    evidence_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    capture_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("captures.capture_id"), nullable=False)
    source_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("sources.source_id"), nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    quote_text: Mapped[str] = mapped_column(Text, nullable=False)
    char_start: Mapped[int | None] = mapped_column(Integer, nullable=True)
    char_end: Mapped[int | None] = mapped_column(Integer, nullable=True)
    section_hint: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class VendorTruthCard(Base):
    __tablename__ = "vendor_truth_cards"

    truth_card_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    source_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("sources.source_id"), nullable=False)
    capture_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("captures.capture_id"), nullable=False)
    canonical_vendor_id: Mapped[str] = mapped_column(String(255), nullable=False)
    vendor_name: Mapped[str] = mapped_column(Text, nullable=False)
    product_names: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)
    capabilities: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)
    industries_mentioned: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)
    integrations_mentioned: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)
    deployment_type: Mapped[str | None] = mapped_column(Text, nullable=True)
    geographic_signals: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)
    card_text: Mapped[str] = mapped_column(Text, nullable=False)
    card_embedding: Mapped[list[float] | None] = mapped_column(Vector(768), nullable=True)
    evidence_ids: Mapped[list[str]] = mapped_column(ARRAY(UUID(as_uuid=False)), nullable=False, default=list)
    confidence: Mapped[float] = mapped_column(Float, nullable=False, default=0.5)
    review_status: Mapped[str] = mapped_column(
        Enum("auto_accepted", "needs_review", "reviewed", name="review_status"),
        nullable=False,
        default="needs_review",
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint("confidence >= 0 AND confidence <= 1", name="chk_truth_card_confidence"),
    )


class TruthCardClassification(Base):
    __tablename__ = "truth_card_classifications"

    classification_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    truth_card_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("vendor_truth_cards.truth_card_id"), nullable=False
    )
    industry_label_key: Mapped[str] = mapped_column(String(128), nullable=False)
    problem_category_key: Mapped[str] = mapped_column(String(128), nullable=False)
    solution_type_key: Mapped[str] = mapped_column(String(128), nullable=False)
    capability_tags: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    unknown_candidate_labels: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)
    evidence_ids: Mapped[list[str]] = mapped_column(ARRAY(UUID(as_uuid=False)), nullable=False, default=list)
    classifier_version: Mapped[str] = mapped_column(String(128), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ReviewQueue(Base):
    __tablename__ = "review_queue"

    review_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    truth_card_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("vendor_truth_cards.truth_card_id"), nullable=False
    )
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=50)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="open")
    assigned_to: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolved_by: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolution_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class SearchSession(Base):
    __tablename__ = "search_sessions"

    session_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String(255), nullable=False)
    query_text: Mapped[str] = mapped_column(Text, nullable=False)
    query_embedding: Mapped[list[float] | None] = mapped_column(Vector(768), nullable=True)
    filters_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SearchResult(Base):
    __tablename__ = "search_results"

    search_result_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    session_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("search_sessions.session_id"), nullable=False)
    truth_card_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("vendor_truth_cards.truth_card_id"), nullable=False
    )
    rank_position: Mapped[int] = mapped_column(Integer, nullable=False)
    bm25_score: Mapped[float] = mapped_column(Float, nullable=False)
    vector_score: Mapped[float] = mapped_column(Float, nullable=False)
    ontology_match_score: Mapped[float] = mapped_column(Float, nullable=False)
    evidence_strength_score: Mapped[float] = mapped_column(Float, nullable=False)
    freshness_score: Mapped[float] = mapped_column(Float, nullable=False)
    source_reliability_score: Mapped[float] = mapped_column(Float, nullable=False)
    feedback_boost_score: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    final_score: Mapped[float] = mapped_column(Float, nullable=False)
    ranker_version: Mapped[str] = mapped_column(String(128), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class UserFeedbackEvent(Base):
    __tablename__ = "user_feedback_events"

    event_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    search_result_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("search_results.search_result_id"), nullable=False
    )
    truth_card_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("vendor_truth_cards.truth_card_id"), nullable=False
    )
    user_id: Mapped[str] = mapped_column(String(255), nullable=False)
    action: Mapped[str] = mapped_column(
        Enum("impression", "click", "save", "reject", "edit", name="feedback_action"),
        nullable=False,
    )
    dwell_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    edited_labels_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SourceReliabilityHistory(Base):
    __tablename__ = "source_reliability_history"

    metric_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    source_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("sources.source_id"), nullable=False)
    extraction_quality_score: Mapped[float] = mapped_column(Float, nullable=False)
    classification_confidence_score: Mapped[float] = mapped_column(Float, nullable=False)
    downstream_engagement_score: Mapped[float] = mapped_column(Float, nullable=False)
    spam_penalty_score: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    reliability_score: Mapped[float] = mapped_column(Float, nullable=False)
    measured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class TrendSignal(Base):
    __tablename__ = "trend_signals"

    signal_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    signal_type: Mapped[str] = mapped_column(String(32), nullable=False)
    source_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("sources.source_id"), nullable=True)
    observed_date: Mapped[datetime] = mapped_column(Date, nullable=False)
    region_key: Mapped[str] = mapped_column(String(128), nullable=False)
    category_key: Mapped[str] = mapped_column(String(128), nullable=False)
    count_value: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    payload_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class TrendMetric(Base):
    __tablename__ = "trend_metrics"

    trend_metric_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    category_key: Mapped[str] = mapped_column(String(128), nullable=False)
    region_key: Mapped[str] = mapped_column(String(128), nullable=False)
    window_days: Mapped[int] = mapped_column(Integer, nullable=False)
    growth_rate: Mapped[float] = mapped_column(Float, nullable=False)
    saturation: Mapped[float] = mapped_column(Float, nullable=False)
    geographic_concentration: Mapped[float] = mapped_column(Float, nullable=False)
    momentum_score: Mapped[float] = mapped_column(Float, nullable=False)
    cluster_label: Mapped[str | None] = mapped_column(String(256), nullable=True)
    model_version: Mapped[str] = mapped_column(String(128), nullable=False)
    measured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class MLModelRegistry(Base):
    __tablename__ = "ml_model_registry"

    model_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    model_family: Mapped[str] = mapped_column(String(64), nullable=False)
    model_version: Mapped[str] = mapped_column(String(128), nullable=False)
    stage: Mapped[str] = mapped_column(
        Enum("candidate", "staging", "production", "archived", name="model_stage"),
        nullable=False,
        default="candidate",
    )
    artifact_uri: Mapped[str] = mapped_column(Text, nullable=False)
    metrics_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    trained_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    trained_to: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("model_family", "model_version", name="uq_model_family_version"),
    )


class AuditLog(Base):
    __tablename__ = "audit_log"

    audit_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    actor: Mapped[str] = mapped_column(String(255), nullable=False)
    action: Mapped[str] = mapped_column(String(255), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(128), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(255), nullable=False)
    before_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    after_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    trace_id: Mapped[str] = mapped_column(String(128), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

