"""
NXT//LINK Industry Observer — SQLAlchemy Database Models
SQLite for local dev; can swap connection string for Postgres in production.
"""

import json
import logging
from datetime import datetime
from typing import Any

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    create_engine,
    event,
)
from sqlalchemy.orm import DeclarativeBase, Session, relationship, sessionmaker

from config import DB_PATH

logger = logging.getLogger(__name__)

# ─── Engine & Session ─────────────────────────────────────────────────────────

DATABASE_URL = f"sqlite:///{DB_PATH}"
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False,
)

# Enable WAL mode for better concurrent reads
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_conn: Any, _: Any) -> None:
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# ─── Base ─────────────────────────────────────────────────────────────────────

class Base(DeclarativeBase):
    pass


# ─── JSON helper ─────────────────────────────────────────────────────────────

def _json_get(column_value: str | None) -> Any:
    """Safely deserialize a JSON column value."""
    if column_value is None:
        return []
    try:
        return json.loads(column_value)
    except (json.JSONDecodeError, TypeError):
        return []


def _json_set(value: Any) -> str:
    """Serialize a value to a JSON string for storage."""
    return json.dumps(value, default=str)


# ─── Models ───────────────────────────────────────────────────────────────────

class Source(Base):
    """A content source (website / RSS feed) tracked by the observer."""

    __allow_unmapped__ = True
    __tablename__ = "sources"

    id: int = Column(Integer, primary_key=True, autoincrement=True)
    domain: str = Column(String(255), nullable=False, unique=True, index=True)
    url: str = Column(String(2048), nullable=False)
    feed_url: str | None = Column(String(2048), nullable=True)
    industry: str = Column(String(100), nullable=False, index=True)
    # Score 0–100; drives promote/demote decisions
    score: float = Column(Float, default=50.0, nullable=False)
    # approved | watchlist | blocked
    status: str = Column(String(20), default="watchlist", nullable=False, index=True)
    last_crawled: datetime | None = Column(DateTime, nullable=True)
    items_count: int = Column(Integer, default=0, nullable=False)
    useful_count: int = Column(Integer, default=0, nullable=False)

    raw_items: list["RawItem"] = relationship(
        "RawItem", back_populates="source", cascade="all, delete-orphan"
    )

    @property
    def yield_ratio(self) -> float:
        """Fraction of crawled items deemed useful."""
        return self.useful_count / self.items_count if self.items_count else 0.0

    def __repr__(self) -> str:
        return f"<Source domain={self.domain} status={self.status} score={self.score:.0f}>"


class RawItem(Base):
    """A raw fetched article or page — not yet classified."""

    __allow_unmapped__ = True
    __tablename__ = "raw_items"

    id: int = Column(Integer, primary_key=True, autoincrement=True)
    source_id: int = Column(Integer, ForeignKey("sources.id"), nullable=False, index=True)
    url: str = Column(String(2048), nullable=False, unique=True, index=True)
    title: str | None = Column(String(1024), nullable=True)
    text: str | None = Column(Text, nullable=True)
    html: str | None = Column(Text, nullable=True)
    published_at: datetime | None = Column(DateTime, nullable=True)
    fetched_at: datetime = Column(DateTime, default=datetime.utcnow, nullable=False)
    processed: bool = Column(Boolean, default=False, nullable=False, index=True)

    source: Source = relationship("Source", back_populates="raw_items")
    classified_items: list["ClassifiedItem"] = relationship(
        "ClassifiedItem", back_populates="raw_item", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<RawItem id={self.id} title={self.title[:40] if self.title else '?'}>"


class ClassifiedItem(Base):
    """A raw item after classification — knows its industry, zone, tech, and signal type."""

    __allow_unmapped__ = True
    __tablename__ = "classified_items"

    id: int = Column(Integer, primary_key=True, autoincrement=True)
    raw_item_id: int = Column(
        Integer, ForeignKey("raw_items.id"), nullable=False, index=True
    )
    industry: str | None = Column(String(100), nullable=True, index=True)
    warehouse_zone: str | None = Column(String(100), nullable=True, index=True)
    technology: str | None = Column(String(200), nullable=True)
    # case_study | product_launch | partnership | funding | research
    signal_type: str | None = Column(String(50), nullable=True, index=True)
    confidence: float = Column(Float, default=0.0, nullable=False)
    extracted_at: datetime = Column(DateTime, default=datetime.utcnow, nullable=False)

    raw_item: RawItem = relationship("RawItem", back_populates="classified_items")
    deployments: list["Deployment"] = relationship(
        "Deployment", back_populates="classified_item", cascade="all, delete-orphan"
    )
    products: list["Product"] = relationship(
        "Product", back_populates="classified_item", cascade="all, delete-orphan"
    )
    milestones: list["Milestone"] = relationship(
        "Milestone", back_populates="classified_item", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return (
            f"<ClassifiedItem id={self.id} industry={self.industry} "
            f"signal={self.signal_type} conf={self.confidence:.2f}>"
        )


class Deployment(Base):
    """A structured record of a real-world technology deployment."""

    __allow_unmapped__ = True
    __tablename__ = "deployments"

    id: int = Column(Integer, primary_key=True, autoincrement=True)
    classified_item_id: int = Column(
        Integer, ForeignKey("classified_items.id"), nullable=False, index=True
    )
    company_name: str | None = Column(String(500), nullable=True, index=True)
    vendor: str | None = Column(String(500), nullable=True, index=True)
    product: str | None = Column(String(500), nullable=True)
    technology: str | None = Column(String(200), nullable=True)
    warehouse_zone: str | None = Column(String(100), nullable=True)
    use_case: str | None = Column(Text, nullable=True)
    location: str | None = Column(String(300), nullable=True)
    year: int | None = Column(Integer, nullable=True)
    results: str | None = Column(Text, nullable=True)
    source_url: str | None = Column(String(2048), nullable=True)
    confidence: float = Column(Float, default=0.0, nullable=False)

    classified_item: ClassifiedItem = relationship(
        "ClassifiedItem", back_populates="deployments"
    )

    def __repr__(self) -> str:
        return (
            f"<Deployment company={self.company_name} vendor={self.vendor} "
            f"product={self.product}>"
        )


class Product(Base):
    """A vendor product entry synthesized from multiple classified items."""

    __allow_unmapped__ = True
    __tablename__ = "products"

    id: int = Column(Integer, primary_key=True, autoincrement=True)
    classified_item_id: int | None = Column(
        Integer, ForeignKey("classified_items.id"), nullable=True, index=True
    )
    name: str = Column(String(500), nullable=False, index=True)
    vendor: str | None = Column(String(500), nullable=True, index=True)
    category: str | None = Column(String(200), nullable=True)
    # JSON arrays stored as text
    _warehouse_zones: str = Column("warehouse_zones", Text, default="[]")
    _use_cases: str = Column("use_cases", Text, default="[]")
    _integrations: str = Column("integrations", Text, default="[]")
    _proof_links: str = Column("proof_links", Text, default="[]")
    maturity_score: float = Column(Float, default=0.0, nullable=False)
    # emerging | growing | mature | legacy
    price_band: str | None = Column(String(50), nullable=True)

    classified_item: ClassifiedItem | None = relationship(
        "ClassifiedItem", back_populates="products"
    )

    @property
    def warehouse_zones(self) -> list[str]:
        return _json_get(self._warehouse_zones)

    @warehouse_zones.setter
    def warehouse_zones(self, value: list[str]) -> None:
        self._warehouse_zones = _json_set(value)

    @property
    def use_cases(self) -> list[str]:
        return _json_get(self._use_cases)

    @use_cases.setter
    def use_cases(self, value: list[str]) -> None:
        self._use_cases = _json_set(value)

    @property
    def integrations(self) -> list[str]:
        return _json_get(self._integrations)

    @integrations.setter
    def integrations(self, value: list[str]) -> None:
        self._integrations = _json_set(value)

    @property
    def proof_links(self) -> list[str]:
        return _json_get(self._proof_links)

    @proof_links.setter
    def proof_links(self, value: list[str]) -> None:
        self._proof_links = _json_set(value)

    def __repr__(self) -> str:
        return f"<Product name={self.name} vendor={self.vendor}>"


class Milestone(Base):
    """A technology adoption milestone (e.g. 'Warehouse robots hit 1M units shipped 2024')."""

    __allow_unmapped__ = True
    __tablename__ = "milestones"

    id: int = Column(Integer, primary_key=True, autoincrement=True)
    classified_item_id: int | None = Column(
        Integer, ForeignKey("classified_items.id"), nullable=True, index=True
    )
    tech_timeline: str | None = Column(String(200), nullable=True, index=True)
    date: str | None = Column(String(20), nullable=True)   # ISO date or YYYY
    title: str = Column(String(500), nullable=False)
    summary: str | None = Column(Text, nullable=True)
    _evidence_urls: str = Column("evidence_urls", Text, default="[]")

    classified_item: ClassifiedItem | None = relationship(
        "ClassifiedItem", back_populates="milestones"
    )

    @property
    def evidence_urls(self) -> list[str]:
        return _json_get(self._evidence_urls)

    @evidence_urls.setter
    def evidence_urls(self, value: list[str]) -> None:
        self._evidence_urls = _json_set(value)

    def __repr__(self) -> str:
        return f"<Milestone title={self.title[:50]} date={self.date}>"


class Feedback(Base):
    """Human feedback on a classified or extracted item."""

    __allow_unmapped__ = True
    __tablename__ = "feedback"

    id: int = Column(Integer, primary_key=True, autoincrement=True)
    item_id: int = Column(Integer, nullable=False, index=True)
    # classified_item | deployment | product | milestone
    item_type: str = Column(String(50), nullable=False)
    # up | down
    rating: str = Column(String(10), nullable=False)
    notes: str | None = Column(Text, nullable=True)
    created_at: datetime = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self) -> str:
        return f"<Feedback item_id={self.item_id} type={self.item_type} rating={self.rating}>"


class EntityAlias(Base):
    """Canonical name → alias mapping for companies, vendors, and products."""

    __allow_unmapped__ = True
    __tablename__ = "entity_aliases"

    id: int = Column(Integer, primary_key=True, autoincrement=True)
    canonical_name: str = Column(String(500), nullable=False, index=True)
    alias: str = Column(String(500), nullable=False, index=True)
    # company | vendor | product
    entity_type: str = Column(String(50), nullable=False)

    def __repr__(self) -> str:
        return (
            f"<EntityAlias canonical={self.canonical_name} "
            f"alias={self.alias} type={self.entity_type}>"
        )


# ─── DB Init ──────────────────────────────────────────────────────────────────

def init_db() -> None:
    """Create all tables if they do not yet exist."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)
    logger.info("Database initialized at %s", DB_PATH)


def get_session() -> Session:
    """Return a new SQLAlchemy session. Caller must close it."""
    return SessionLocal()
