-- Migration: solution data quality constraints
-- Adds deduplication, bounds checking, and cleanup for products/vendors

-- ─── Products: Add constraints ──────────────────────────────────────────────

-- Confidence must be 0-1
ALTER TABLE products
  ADD CONSTRAINT products_confidence_range
  CHECK (confidence >= 0 AND confidence <= 1);

-- Product name length
ALTER TABLE products
  ADD CONSTRAINT products_name_length
  CHECK (char_length(product_name) >= 2 AND char_length(product_name) <= 200);

-- Unique product per company (case-insensitive)
-- First, remove duplicates keeping highest confidence
DELETE FROM products a
USING products b
WHERE a.id < b.id
  AND lower(trim(a.product_name)) = lower(trim(b.product_name))
  AND coalesce(lower(trim(a.company)), '') = coalesce(lower(trim(b.company)), '')
  AND a.confidence <= b.confidence;

-- Add unique index on normalized name+company
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_name_company_unique
  ON products (lower(trim(product_name)), coalesce(lower(trim(company)), ''));

-- ─── Products: Purge garbage ────────────────────────────────────────────────

-- Remove products with confidence below 0.2
DELETE FROM products WHERE confidence < 0.2;

-- Remove products with no description and no company
DELETE FROM products WHERE description IS NULL AND company IS NULL;

-- Remove products with very short names (likely regex artifacts)
DELETE FROM products WHERE char_length(trim(product_name)) < 3;

-- ─── Vendors: Add unique name index ─────────────────────────────────────────

-- Deduplicate vendors by name (keep highest IKER score)
DELETE FROM vendors a
USING vendors b
WHERE a.id < b.id
  AND lower(trim(a.name)) = lower(trim(b.name))
  AND coalesce(a.iker_score, 0) <= coalesce(b.iker_score, 0);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vendors_name_unique
  ON vendors (lower(trim(coalesce(company_name, name, ''))));

-- ─── Vendors: IKER score bounds ─────────────────────────────────────────────

ALTER TABLE vendors
  ADD CONSTRAINT vendors_iker_range
  CHECK (iker_score >= 0 AND iker_score <= 100);

-- Clamp any existing out-of-range values
UPDATE vendors SET iker_score = LEAST(100, GREATEST(0, iker_score))
  WHERE iker_score < 0 OR iker_score > 100;
