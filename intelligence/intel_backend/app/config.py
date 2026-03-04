from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "nxtlink-intel-backend"
    env: str = "dev"
    log_level: str = "INFO"

    postgres_dsn: str = Field(
        default="postgresql+psycopg://postgres:postgres@localhost:5432/nxtlink_intel"
    )
    object_store_bucket: str = "nxtlink-intel-snapshots"
    object_store_region: str = "us-east-1"
    object_store_endpoint: str | None = None
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None

    crawl_worker_id: str = "worker-local-1"
    crawl_batch_size: int = 20
    circuit_breaker_threshold: int = 5
    circuit_breaker_open_minutes: int = 30
    default_confidence_threshold: float = 0.72

    embedding_model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
    ranker_model_dir: str = "artifacts/ranker"
    trend_model_dir: str = "artifacts/trend"


settings = Settings()

