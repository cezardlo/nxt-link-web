from __future__ import annotations

from datetime import datetime, timezone
from hashlib import sha256

import boto3

from app.config import settings


class ObjectStore:
    def __init__(self) -> None:
        kwargs = {
            "region_name": settings.object_store_region,
        }
        if settings.object_store_endpoint:
            kwargs["endpoint_url"] = settings.object_store_endpoint
        if settings.aws_access_key_id and settings.aws_secret_access_key:
            kwargs["aws_access_key_id"] = settings.aws_access_key_id
            kwargs["aws_secret_access_key"] = settings.aws_secret_access_key
        self.client = boto3.client("s3", **kwargs)

    def put_text(self, key_prefix: str, payload: str) -> str:
        digest = sha256(payload.encode("utf-8")).hexdigest()
        ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        key = f"{key_prefix}/{ts}-{digest[:20]}.txt"
        self.client.put_object(Bucket=settings.object_store_bucket, Key=key, Body=payload.encode("utf-8"))
        return f"s3://{settings.object_store_bucket}/{key}"

