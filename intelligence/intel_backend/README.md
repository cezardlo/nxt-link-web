# NXT Link Intelligence Backend

FastAPI + Prefect backend for:
- source registry and isolated crawl queues
- resilient crawling with per-source fault isolation
- truth card extraction with evidence provenance
- controlled ontology classification
- hybrid search
- learning-to-rank training
- trend momentum detection.

## Start

```bash
cd intelligence/intel_backend
uv sync
uv run uvicorn app.api:app --reload --port 8100
```

## Key Flows

- `app.orchestration.flows.source_registry_tick`
- `app.orchestration.flows.crawl_sources_batch`
- `app.orchestration.flows.train_ranker_nightly`
- `app.orchestration.flows.compute_trends_nightly`

