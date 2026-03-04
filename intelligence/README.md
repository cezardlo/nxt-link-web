# NXT Link Intelligence Deliverables

This package contains the requested architecture and implementation scaffolding for a resilient 24/7 intelligence platform.

## Deliverables

- Database schema:
  - `intelligence/db/schema.sql`
- Pipeline + architecture:
  - `intelligence/docs/architecture.md`
- Monitoring and audit plan:
  - `intelligence/docs/monitoring.md`
- FastAPI backend scaffolding:
  - `intelligence/intel_backend/app/api.py`
- Crawler module structure:
  - `intelligence/intel_backend/app/crawler/*`
- Extraction module:
  - `intelligence/intel_backend/app/extraction/truth_card.py`
- Controlled classification:
  - `intelligence/intel_backend/app/classification/classifier.py`
- Hybrid search:
  - `intelligence/intel_backend/app/search/hybrid.py`
- Learning-to-rank:
  - `intelligence/intel_backend/app/ranking/features.py`
  - `intelligence/intel_backend/app/ranking/train.py`
- Trend detection:
  - `intelligence/intel_backend/app/trends/engine.py`
- Orchestration:
  - `intelligence/intel_backend/app/orchestration/flows.py`

