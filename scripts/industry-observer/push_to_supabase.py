"""
NXT//LINK Industry Observer — Supabase Push Agent
Reads structured records from the local SQLite observer.db and
upserts them to Supabase (intel_signals, entities, products).

Requires env vars:
  SUPABASE_URL            — https://xxxx.supabase.co
  SUPABASE_SERVICE_KEY    — service_role key (write access)

Usage:
  python push_to_supabase.py           — push all data collected since last push
  python push_to_supabase.py --days 7  — push last N days of data
"""

import argparse
import json
import logging
import os
import sys
from datetime import datetime, timedelta
from typing import Any

import requests
from models import ClassifiedItem, Deployment, Product, Source, get_session

logger = logging.getLogger(__name__)


# ─── Supabase Client (minimal, no SDK needed) ─────────────────────────────────

class SupabaseClient:
    def __init__(self, url: str, service_key: str) -> None:
        self.url = url.rstrip('/')
        self.headers = {
            'apikey': service_key,
            'Authorization': f'Bearer {service_key}',
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates,return=minimal',
        }

    def upsert(self, table: str, rows: list[dict[str, Any]], conflict_col: str = 'id') -> int:
        """Upsert rows into table. Returns number of rows sent."""
        if not rows:
            return 0
        # Batch into 100-row chunks
        sent = 0
        for i in range(0, len(rows), 100):
            batch = rows[i:i + 100]
            resp = requests.post(
                f'{self.url}/rest/v1/{table}',
                headers={**self.headers, 'Prefer': f'resolution=merge-duplicates,return=minimal'},
                json=batch,
                timeout=30,
            )
            if resp.status_code not in (200, 201):
                logger.warning('Supabase upsert %s failed: %s — %s', table, resp.status_code, resp.text[:200])
            else:
                sent += len(batch)
        return sent


# ─── Converters ───────────────────────────────────────────────────────────────

def classified_to_intel_signal(item: ClassifiedItem) -> dict[str, Any] | None:
    """Convert a ClassifiedItem to an intel_signals row."""
    if not item.title or item.signal_type is None:
        return None

    # Build a deterministic ID from title hash
    import hashlib
    id_str = hashlib.md5(f'{item.signal_type}:{item.title}'.encode()).hexdigest()[:16]

    return {
        'id': f'obs-{id_str}',
        'signal_type': item.signal_type or 'case_study',
        'industry': item.industry or 'general',
        'title': (item.title or '')[:200],
        'url': item.source_url or None,
        'source': item.source_name or 'industry-observer',
        'evidence': (item.snippet or '')[:300],
        'company': item.company_name or None,
        'amount_usd': None,
        'confidence': float(item.confidence or 0.6),
        'importance_score': float(item.confidence or 0.6),
        'tags': json.loads(item.tags) if item.tags else [],
        'discovered_at': (item.extracted_at or datetime.utcnow()).isoformat(),
    }


def deployment_to_entity(dep: Deployment) -> dict[str, Any] | None:
    """Convert a Deployment's vendor to a knowledge-graph entity row."""
    if not dep.vendor:
        return None

    slug = dep.vendor.lower().replace(' ', '-').replace('/', '-').replace(',', '')
    return {
        'entity_type': 'company',
        'name': dep.vendor,
        'slug': slug,
        'description': dep.use_case or None,
        'metadata': json.dumps({
            'product': dep.product,
            'technology': dep.technology,
            'location': dep.location,
            'confidence': dep.confidence,
            'auto_discovered': True,
        }),
        'aliases': json.dumps([dep.vendor.lower()]),
        'last_seen_at': datetime.utcnow().isoformat(),
        'updated_at': datetime.utcnow().isoformat(),
    }


def product_to_row(prod: Product) -> dict[str, Any] | None:
    """Convert a Product to a products row."""
    if not prod.name or not prod.vendor:
        return None

    slug = f"{prod.vendor}-{prod.name}".lower().replace(' ', '-')[:80]
    return {
        'slug': slug,
        'name': prod.name,
        'vendor': prod.vendor,
        'category': prod.category or 'General',
        'description': (prod.use_cases or ''),
        'iker_score': min(100, max(0, int((prod.maturity_score or 0.5) * 100))),
        'tags': json.loads(prod.warehouse_zones) if prod.warehouse_zones else [],
        'source': 'industry-observer',
    }


# ─── Main Push ────────────────────────────────────────────────────────────────

def push_to_supabase(days: int = 7) -> dict[str, int]:
    url = os.environ.get('SUPABASE_URL', '')
    key = os.environ.get('SUPABASE_SERVICE_KEY') or os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')

    if not url or not key:
        logger.error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set')
        return {'error': 1}

    client = SupabaseClient(url, key)
    session = get_session()
    cutoff = datetime.utcnow() - timedelta(days=days)
    results = {'intel_signals': 0, 'entities': 0, 'products': 0}

    try:
        # ── 1. Intel signals from classified items ────────────────────────────
        classified = (
            session.query(ClassifiedItem)
            .filter(ClassifiedItem.extracted_at >= cutoff)
            .filter(ClassifiedItem.signal_type.isnot(None))
            .limit(500)
            .all()
        )
        signal_rows = [r for item in classified if (r := classified_to_intel_signal(item))]
        results['intel_signals'] = client.upsert('intel_signals', signal_rows, 'id')
        logger.info('Pushed %d intel signals', results['intel_signals'])

        # ── 2. Company entities from deployments ──────────────────────────────
        deployments = (
            session.query(Deployment)
            .filter(Deployment.confidence >= 0.5)
            .limit(200)
            .all()
        )
        entity_rows = [r for dep in deployments if (r := deployment_to_entity(dep))]
        # Deduplicate by slug
        seen_slugs: set[str] = set()
        unique_entities = []
        for row in entity_rows:
            if row['slug'] not in seen_slugs:
                seen_slugs.add(row['slug'])
                unique_entities.append(row)
        results['entities'] = client.upsert('entities', unique_entities, 'slug')
        logger.info('Pushed %d entities', results['entities'])

        # ── 3. Products ───────────────────────────────────────────────────────
        products = session.query(Product).filter(Product.maturity_score >= 0.4).limit(200).all()
        product_rows = [r for prod in products if (r := product_to_row(prod))]
        results['products'] = client.upsert('products', product_rows, 'slug')
        logger.info('Pushed %d products', results['products'])

    except Exception as exc:
        logger.error('Push failed: %s', exc)
    finally:
        session.close()

    return results


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(name)s — %(message)s')
    parser = argparse.ArgumentParser(description='Push observer data to Supabase')
    parser.add_argument('--days', type=int, default=7, help='Days of data to push (default: 7)')
    args = parser.parse_args()

    result = push_to_supabase(days=args.days)
    print(json.dumps(result, indent=2))
    sys.exit(0 if 'error' not in result else 1)
