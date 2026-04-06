# Monitoring and Logging Plan

## Metrics (Prometheus/OpenTelemetry)

### Crawler
- `crawler_queue_lag_seconds{source_id}`
- `crawler_success_total{source_id}`
- `crawler_failure_total{source_id,error_type}`
- `crawler_circuit_open{source_id}`
- `crawler_http_latency_ms_bucket{domain}`
- `crawler_snapshot_bytes_total{source_id}`

### Extraction + Classification
- `truth_card_created_total{source_id}`
- `truth_card_evidence_coverage_ratio`
- `classification_confidence_bucket`
- `review_queue_open_total`

### Search + Ranker
- `search_requests_total`
- `search_latency_ms_bucket`
- `search_ctr_at_10`
- `search_save_rate_at_10`
- `ranking_ndcg10_latest`
- `ranking_model_promotions_total`

### Trends
- `trend_signal_ingest_total{signal_type}`
- `trend_metrics_compute_seconds`
- `trend_momentum_score{category,region,window}`

## Logs

- JSON logs, required fields:
  - `trace_id`
  - `source_id`
  - `queue_id`
  - `capture_id`
  - `component`
  - `event`
  - `error_code`.
- All write/update operations mirrored in `audit_log`.

## Alert Rules

- `crawler_failure_total/source > 0.4 over 30m` -> critical.
- `crawler_queue_lag_seconds > 3600` -> high.
- `classification_confidence_p50 < 0.55` -> high.
- `review_queue_open_total` monotonic for 24h -> medium.
- `ranking_ndcg10_latest < production_baseline - 0.03` -> rollback candidate model.

## SLOs

- Crawl completion freshness: 95% of active sources crawled within 2x frequency window.
- Search API: p95 latency < 900ms.
- Extraction auditability: 100% cards with evidence IDs.
- Nightly model training success: >= 99%.

