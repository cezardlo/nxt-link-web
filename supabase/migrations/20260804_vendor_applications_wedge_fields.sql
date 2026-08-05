-- 2026-08-04 — Wedge fields on vendor_applications (WEDGE-FIELDS-2026-08-04).
--
-- Cesar, verbatim: "Labor rate / Mobile fee / Response time / Contract type —
-- those are not optional. They are your differentiation. Without them, you're
-- a directory again."
--
-- ADDITIVE ONLY: five new columns + comments + value checks. NOTHING is
-- renamed or dropped. In particular the six conference-era columns
-- (conference_interests, participation_preference, demo_capabilities,
-- worker_support_value, budget_range, technology_category) are deliberately
-- LEFT IN PLACE with all stored values — they were removed from the FORM
-- only; whether to drop them is Cesar's later decision after a live-DB check.
--
-- Required-ness is enforced by the APP (submit + PATCH routes), not NOT NULL
-- constraints — existing rows (submitted before these fields existed) must
-- keep loading, and PostgREST rejects a NOT NULL add on a table with rows.
-- Idempotent: safe to run twice.

alter table public.vendor_applications
  add column if not exists labor_rate          numeric,
  add column if not exists labor_rate_currency text,
  add column if not exists mobile_fee          numeric,
  add column if not exists response_time       text,
  add column if not exists contract_types      jsonb default '[]'::jsonb;

comment on column public.vendor_applications.labor_rate is
  'Wedge field (2026-08-04): hourly labor rate, positive number, required by the app. Never free text — comparability is the point.';
comment on column public.vendor_applications.labor_rate_currency is
  'Currency for labor_rate/mobile_fee: USD | MXN | CAD | EUR (app defaults USD).';
comment on column public.vendor_applications.mobile_fee is
  'Wedge field (2026-08-04): flat trip/mobilization fee per visit. 0 is a REAL explicit answer ("no trip charge") — NULL means unanswered, never the same thing.';
comment on column public.vendor_applications.response_time is
  'Wedge field (2026-08-04): how fast they can be on site. Fixed values: same_day | within_24h | within_48h | days_3_plus.';
comment on column public.vendor_applications.contract_types is
  'Wedge field (2026-08-04): contract options offered, multi-select from none | membership | annual ("none" is exclusive).';

-- Value backstops (data-level; the app validates first). Drop-if-exists +
-- re-add keeps this idempotent without DO-block gymnastics.
alter table public.vendor_applications drop constraint if exists vendor_applications_labor_rate_check;
alter table public.vendor_applications
  add constraint vendor_applications_labor_rate_check
  check (labor_rate is null or (labor_rate > 0 and labor_rate <= 100000));

alter table public.vendor_applications drop constraint if exists vendor_applications_mobile_fee_check;
alter table public.vendor_applications
  add constraint vendor_applications_mobile_fee_check
  check (mobile_fee is null or (mobile_fee >= 0 and mobile_fee <= 100000));

alter table public.vendor_applications drop constraint if exists vendor_applications_response_time_check;
alter table public.vendor_applications
  add constraint vendor_applications_response_time_check
  check (response_time is null or response_time in ('same_day', 'within_24h', 'within_48h', 'days_3_plus'));

-- Extend the update-guard coverage: the wedge fields are VENDOR-editable
-- (like company_name/phone), so guard_vendor_application_update() needs no
-- change — it only protects status/admin_notes/approved_at/vendor_message.
-- Verified: no trigger change required.
