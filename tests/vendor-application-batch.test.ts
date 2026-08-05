import assert from 'node:assert/strict';
import test from 'node:test';

import { cleanStringArray, resolveMultiValue, cleanVendorMessage, resubmitStatusPatch, MAX_REGIONS, VENDOR_MESSAGE_MAXLEN, cleanLaborRate, cleanMobileFee, cleanWedgeCurrency, cleanResponseTime, cleanContractTypes } from '@/lib/apply/fields';
import { findOwnApplication, findAnonymousApplication, type ApplicantSession } from '@/lib/apply/auth';
import { syncApplicationToVendorProfile } from '@/lib/apply/profile-sync';
import { makeFakeDb } from './helpers/fake-supabase';

// 2026-08-04 vendor-application batch. Pins the behaviors Cesar's items 2, 5
// and 6 require, using the in-memory fake db — no live Supabase needed.

const SESSION: ApplicantSession = { authId: 'auth-1', email: 'vendor@example.com' };

// ---- field parsing (item 6) ------------------------------------------------

test('cleanStringArray: trims, dedups, caps count and length', () => {
  const out = cleanStringArray([' El Paso ', 'El Paso', '', 'Las Cruces'], 8, 60);
  assert.deepEqual(out, ['El Paso', 'Las Cruces']);
});

test('cleanStringArray: undefined when the field was not sent (PATCH absent-vs-empty)', () => {
  assert.equal(cleanStringArray(undefined, 8, 60), undefined);
  assert.equal(cleanStringArray('El Paso', 8, 60), undefined);
  assert.deepEqual(cleanStringArray([], 8, 60), []);
});

test('cleanStringArray: enforces the regions cap', () => {
  const many = Array.from({ length: 20 }, (_, i) => `Place ${i}`);
  assert.equal(cleanStringArray(many, MAX_REGIONS, 60)!.length, MAX_REGIONS);
});

test('resolveMultiValue: prefers the multi list, falls back to the legacy single', () => {
  assert.deepEqual(resolveMultiValue(['El Paso', 'Las Cruces'], 'Juárez'), ['El Paso', 'Las Cruces']);
  assert.deepEqual(resolveMultiValue([], ' Juárez '), ['Juárez']);
  assert.deepEqual(resolveMultiValue(undefined, 'Juárez'), ['Juárez']);
  assert.deepEqual(resolveMultiValue([], ''), []);
});

// ---- one application per company (item 2) -----------------------------------

test('findOwnApplication: returns the account-owned row first', async () => {
  const db = makeFakeDb({
    vendor_applications: [
      { id: 'app-mine', auth_id: 'auth-1', email: 'vendor@example.com', created_at: '2026-01-01' },
      { id: 'app-anon', auth_id: null, email: 'vendor@example.com', created_at: '2026-02-01' },
    ],
  });
  const app = await findOwnApplication(db, SESSION);
  assert.equal(app?.id, 'app-mine');
});

test('findOwnApplication: claims a prior anonymous submission by email (the work survives the account round trip)', async () => {
  const db = makeFakeDb({
    vendor_applications: [
      { id: 'app-anon', auth_id: null, email: 'Vendor@Example.com', created_at: '2026-02-01' },
    ],
  });
  const app = await findOwnApplication(db, SESSION);
  assert.equal(app?.id, 'app-anon');
  assert.equal(app?.auth_id, 'auth-1'); // claimed — locked to the account now
});

test('findAnonymousApplication: resumes the latest UNCLAIMED row for the email', async () => {
  const db = makeFakeDb({
    vendor_applications: [
      { id: 'app-old', auth_id: null, email: 'vendor@example.com', created_at: '2026-01-01' },
      { id: 'app-new', auth_id: null, email: 'vendor@example.com', created_at: '2026-02-01' },
    ],
  });
  const app = await findAnonymousApplication(db, 'vendor@example.com');
  assert.equal(app?.id, 'app-new');
});

test('findAnonymousApplication: NEVER returns a row already claimed by an account', async () => {
  const db = makeFakeDb({
    vendor_applications: [
      { id: 'app-claimed', auth_id: 'auth-9', email: 'vendor@example.com', created_at: '2026-02-01' },
    ],
  });
  const app = await findAnonymousApplication(db, 'vendor@example.com');
  assert.equal(app, null);
});

// ---- application → profile mirror (item 5) ----------------------------------

test('profile sync: a placeholder "New company" profile gets the real application facts', async () => {
  const db = makeFakeDb({
    vendor_profiles: [
      { id: 'vp-1', auth_id: 'auth-1', email: 'vendor@example.com', status: 'pending', company_name: 'New company', contact_name: null, phone: null, description: null, city: null, service_areas: [] },
    ],
  });
  await syncApplicationToVendorProfile(db, SESSION, {
    company_name: 'Borderland Forklift Services',
    contact_name: 'Jane Rivera',
    phone: '915-555-0100',
    problem_solved: 'We keep warehouses moving.',
    region: 'El Paso',
    regions: ['El Paso', 'Las Cruces'],
    email: 'vendor@example.com',
  });
  const vp = db._store.vendor_profiles[0];
  assert.equal(vp.company_name, 'Borderland Forklift Services');
  assert.equal(vp.contact_name, 'Jane Rivera');
  assert.equal(vp.phone, '915-555-0100');
  assert.equal(vp.description, 'We keep warehouses moving.');
  assert.equal(vp.city, 'El Paso');
  assert.deepEqual(vp.service_areas, ['El Paso', 'Las Cruces']);
});

test('profile sync: never overwrites fields the vendor already set', async () => {
  const db = makeFakeDb({
    vendor_profiles: [
      { id: 'vp-1', auth_id: 'auth-1', email: 'vendor@example.com', status: 'pending', company_name: 'Real Name Co', description: 'Portal-written description', service_areas: ['Juárez'] },
    ],
  });
  await syncApplicationToVendorProfile(db, SESSION, {
    company_name: 'Different Application Name',
    contact_name: 'Jane Rivera',
    phone: null,
    problem_solved: 'Application text',
    region: 'El Paso',
    regions: ['El Paso'],
    email: 'vendor@example.com',
  });
  const vp = db._store.vendor_profiles[0];
  assert.equal(vp.company_name, 'Real Name Co'); // untouched
  assert.equal(vp.description, 'Portal-written description'); // untouched
  assert.deepEqual(vp.service_areas, ['Juárez']); // untouched
  assert.equal(vp.contact_name, 'Jane Rivera'); // empty → filled
});

test('profile sync: mints a pending profile from application facts when none exists', async () => {
  const db = makeFakeDb({ vendor_profiles: [] });
  await syncApplicationToVendorProfile(db, SESSION, {
    company_name: 'Fresh Applicant LLC',
    contact_name: null,
    phone: null,
    problem_solved: 'Cold chain monitoring.',
    region: 'Juárez',
    regions: ['Juárez'],
    email: 'vendor@example.com',
  });
  assert.equal(db._store.vendor_profiles.length, 1);
  const vp = db._store.vendor_profiles[0];
  assert.equal(vp.company_name, 'Fresh Applicant LLC');
  assert.equal(vp.status, 'pending'); // portal lane — never self-approves
  assert.equal(vp.auth_id, 'auth-1');
});

// ---- "needs more info" send-back (2026-08-04 Batch B) -----------------------

test('cleanVendorMessage: trims and caps the admin note', () => {
  assert.equal(cleanVendorMessage('  add a phone number please  '), 'add a phone number please');
  assert.equal(cleanVendorMessage('x'.repeat(VENDOR_MESSAGE_MAXLEN + 50))!.length, VENDOR_MESSAGE_MAXLEN);
});

test('cleanVendorMessage: empty or non-string input is rejected (send-back requires a note)', () => {
  assert.equal(cleanVendorMessage(''), null);
  assert.equal(cleanVendorMessage('   '), null);
  assert.equal(cleanVendorMessage(undefined), null);
  assert.equal(cleanVendorMessage(42), null);
});

test('resubmitStatusPatch: only needs_info returns to review — the SAME row, never a second application', () => {
  assert.deepEqual(resubmitStatusPatch('needs_info'), { status: 'pending' });
});

test('resubmitStatusPatch: a vendor can never change any other status (no self-approve, no un-reject)', () => {
  assert.deepEqual(resubmitStatusPatch('pending'), {});
  assert.deepEqual(resubmitStatusPatch('approved'), {});
  assert.deepEqual(resubmitStatusPatch('rejected'), {});
});

// ---- Wedge fields (2026-08-04) — the four REQUIRED comparison fields --------
// Cesar: without labor rate / mobile fee / response time / contract type the
// marketplace is a directory again. These pin the exact validation rules the
// submit + PATCH routes enforce.

test('cleanLaborRate: a plain number passes, cents-rounded', () => {
  assert.equal(cleanLaborRate('95'), 95);
  assert.equal(cleanLaborRate(' 87.505 '), 87.51); // rounds to cents
  assert.equal(cleanLaborRate(120), 120);
});

test('cleanLaborRate: free text ("call us"), zero, negatives and blanks are all rejected — required means required', () => {
  assert.equal(cleanLaborRate('call us'), null);
  assert.equal(cleanLaborRate('0'), null); // labor rate must be POSITIVE
  assert.equal(cleanLaborRate('-50'), null);
  assert.equal(cleanLaborRate(''), null);
  assert.equal(cleanLaborRate(undefined), null);
  assert.equal(cleanLaborRate('999999999'), null); // sanity cap
});

test('cleanMobileFee: explicit 0 is a REAL answer — zero and blank are never the same thing', () => {
  assert.equal(cleanMobileFee('0'), 0); // "we don't charge a trip fee"
  assert.equal(cleanMobileFee('75'), 75);
  assert.equal(cleanMobileFee(''), null); // unanswered — rejected, never stored as 0
  assert.equal(cleanMobileFee(undefined), null);
  assert.equal(cleanMobileFee('-10'), null);
  assert.equal(cleanMobileFee('free!'), null);
});

test('cleanWedgeCurrency: fixed list, anything else falls back to USD', () => {
  assert.equal(cleanWedgeCurrency('MXN'), 'MXN');
  assert.equal(cleanWedgeCurrency('mxn'), 'MXN');
  assert.equal(cleanWedgeCurrency('BTC'), 'USD');
  assert.equal(cleanWedgeCurrency(''), 'USD');
  assert.equal(cleanWedgeCurrency(undefined), 'USD');
});

test('cleanResponseTime: only the four fixed choices pass — never free text', () => {
  assert.equal(cleanResponseTime('same_day'), 'same_day');
  assert.equal(cleanResponseTime('within_24h'), 'within_24h');
  assert.equal(cleanResponseTime('within_48h'), 'within_48h');
  assert.equal(cleanResponseTime('days_3_plus'), 'days_3_plus');
  assert.equal(cleanResponseTime('pretty fast'), null);
  assert.equal(cleanResponseTime(''), null);
  assert.equal(cleanResponseTime(undefined), null);
});

test('cleanContractTypes: multi-select from the fixed list, deduped', () => {
  assert.deepEqual(cleanContractTypes(['membership', 'annual']), ['membership', 'annual']);
  assert.deepEqual(cleanContractTypes(['annual', 'annual', 'bogus']), ['annual']);
});

test("cleanContractTypes: 'none' is exclusive — it collapses any combination to just ['none']", () => {
  assert.deepEqual(cleanContractTypes(['none', 'annual']), ['none']);
  assert.deepEqual(cleanContractTypes(['membership', 'none']), ['none']);
  assert.deepEqual(cleanContractTypes(['none']), ['none']);
});

test('cleanContractTypes: not-an-array and empty both mean "unanswered" (required field missing)', () => {
  assert.deepEqual(cleanContractTypes('annual'), []);
  assert.deepEqual(cleanContractTypes([]), []);
  assert.deepEqual(cleanContractTypes(undefined), []);
});
