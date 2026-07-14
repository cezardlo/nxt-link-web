'use client';

// Guided vendor onboarding wizard — six stages, one major question per screen:
// Company → Offerings → Pricing → Ideal clients → Proof → Preview.
// A guided front-end over the SAME records the portal and Seller Central edit
// (vendor_profiles + marketplace listings): every field autosaves through the
// existing /api/vendor/* routes; nothing is public until the vendor reviews,
// confirms accuracy, and publishes. Quick path = the minimum useful profile;
// Complete path = every optional screen.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser-auth';
import { useAutosave, SAVE_LABEL } from '@/hooks/useAutosave';
import {
  ONBOARDING_STAGES, StageKey, COMPANY_TYPE_OPTIONS, INDUSTRY_OPTIONS,
  OPERATION_TYPE_OPTIONS, CLIENT_SIZE_OPTIONS, SERVICE_AREA_OPTIONS,
  OFFERING_FAMILY_CARDS, PRICING_METHOD_CARDS, ADDITIONAL_COST_OPTIONS,
  VISIBILITY_OPTIONS, buildMatchingSummary, onboardingProgress,
} from '@/lib/vendor/onboarding';
import {
  EXPERTISE_OPTIONS, PROBLEM_OPTIONS, CAPABILITY_OPTIONS, MAX_EXPERTISE,
  EMPLOYEE_RANGES, LANGUAGE_OPTIONS,
} from '@/lib/vendor/profile-template';
import {
  PriceModelEntry, PriceComponentEntry, PriceVisibility,
  priceLine, componentLine, tierLine, publicPricing, cleanPriceModels, cleanPriceComponents,
} from '@/lib/marketplace/types';
import { templateFor } from '@/lib/marketplace/spec-templates';

type Kind = 'product' | 'service';

interface Vendor {
  id: string; company_name: string; contact_name: string | null; email: string | null;
  phone: string | null; website: string | null; city: string | null;
  tagline?: string | null; description: string | null; status: string;
  categories: string[]; service_areas: string[]; industries: string[]; client_types: string[];
  year_founded?: number | null; employee_count?: string | null; company_type?: string | null;
  languages?: string[] | null; response_time?: string | null;
  main_expertise?: string[] | null; problems_solved?: string[] | null; capabilities?: string[] | null;
  offering_families?: string[] | null;
}

interface Listing {
  id: string; name: string; category: string; overview: string | null; status: string;
  best_for: string[]; industries: string[]; image_paths: string[];
  lead_time?: string | null; service_areas?: string[]; response_time?: string | null;
  specs?: Record<string, string> | null;
  pricing?: Record<string, unknown> | null; pricing_model?: string | null;
  kind: Kind;
}

interface OfferingForm {
  kind: Kind; family: string; name: string; category: string; overview: string;
  best_for: string; industries: string; lead_time: string; service_areas: string; response_time: string;
}
const EMPTY_OFFERING: OfferingForm = {
  kind: 'product', family: 'Equipment', name: '', category: '', overview: '',
  best_for: '', industries: '', lead_time: '', service_areas: '', response_time: '',
};

const csv = (s: string) => s.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);

// Sub-steps per stage; quick=false screens are skipped on the quick path.
const SUBS: Record<StageKey, Array<{ key: string; quick: boolean }>> = {
  company: [{ key: 'basics', quick: true }, { key: 'type', quick: true }, { key: 'expertise', quick: false }],
  offerings: [{ key: 'families', quick: true }, { key: 'first', quick: true }],
  pricing: [{ key: 'methods', quick: true }, { key: 'amounts', quick: true }, { key: 'extras', quick: false }, { key: 'visibility', quick: true }],
  clients: [{ key: 'who', quick: true }, { key: 'where', quick: true }],
  proof: [{ key: 'proof', quick: false }],
  preview: [{ key: 'preview', quick: true }],
};

let idSeq = 0;
const newId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${++idSeq}`;

export default function VendorOnboardingPage() {
  const [checking, setChecking] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [agreement, setAgreement] = useState<{ accepted: boolean; summary: string; terms: { title: string; body: string }[] } | null>(null);
  const [proofCount, setProofCount] = useState(0);
  const [emailVerified, setEmailVerified] = useState(true);
  const [msg, setMsg] = useState('');

  const [path, setPath] = useState<'quick' | 'complete' | null>(null);
  const [stage, setStage] = useState<StageKey>('company');
  const [sub, setSub] = useState(0);
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  // ---- Offering editor state ----
  const [offering, setOffering] = useState<OfferingForm>(EMPTY_OFFERING);
  const [editingId, setEditingId] = useState<string | null>(null); // listing id being edited
  const [creating, setCreating] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  // Specs as ordered rows so template fields and custom fields coexist.
  const [specRows, setSpecRows] = useState<Array<{ k: string; v: string }>>([]);
  const specTemplate = offering.kind === 'product' ? templateFor(offering.category, offering.name) : null;
  const specValue = (label: string) => specRows.find((r) => r.k === label)?.v || '';
  function setSpec(label: string, v: string) {
    setSpecRows((rows) => {
      const i = rows.findIndex((r) => r.k === label);
      if (i === -1) return v ? [...rows, { k: label, v }] : rows;
      const next = rows.slice(); next[i] = { k: label, v };
      return next;
    });
  }

  // ---- Pricing editor state (per selected listing) ----
  const [priceListingId, setPriceListingId] = useState<string>('');
  const [models, setModels] = useState<PriceModelEntry[]>([]);
  const [components, setComponents] = useState<PriceComponentEntry[]>([]);
  const [visibility, setVisibility] = useState<PriceVisibility>('public');
  const [priceApproved, setPriceApproved] = useState(false);

  // ---- Preview state ----
  const [accOk, setAccOk] = useState(false);
  const [pubBusy, setPubBusy] = useState(false);
  const [agBusy, setAgBusy] = useState(false);
  const [published, setPublished] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch('/api/vendor/profile');
    if (res.status === 401) { setSignedIn(false); setChecking(false); return; }
    const data = await res.json();
    setVendor(data.vendor);
    const [li, ag, ce, ga, me] = await Promise.all([
      fetch('/api/vendor/listings').then((r) => r.json()).catch(() => null),
      fetch('/api/vendor/agreement').then((r) => r.json()).catch(() => null),
      fetch('/api/vendor/certifications').then((r) => r.json()).catch(() => null),
      fetch('/api/vendor/gallery').then((r) => r.json()).catch(() => null),
      fetch('/api/auth/me').then((r) => r.json()).catch(() => null),
    ]);
    const all: Listing[] = [
      ...((li?.products || []) as Listing[]).map((l) => ({ ...l, kind: 'product' as Kind })),
      ...((li?.services || []) as Listing[]).map((l) => ({ ...l, kind: 'service' as Kind })),
    ];
    setListings(all);
    if (ag?.ok) setAgreement(ag);
    setProofCount((ce?.certifications?.length || 0) + (ga?.photos?.length || 0) + (data.case_studies?.length || 0));
    if (me?.signed_in) setEmailVerified(Boolean(me.email_verified));
    setSignedIn(true); setChecking(false);
  }, []);

  useEffect(() => {
    const sb = createBrowserSupabaseClient();
    sb.auth.getSession().then(({ data }) => { if (data.session) load(); else setChecking(false); });
    const sp = new URLSearchParams(window.location.search);
    const st = sp.get('stage') as StageKey | null;
    if (st && ONBOARDING_STAGES.some((s) => s.key === st)) setStage(st);
    const savedPath = window.localStorage.getItem('nxt_onboarding_path');
    if (savedPath === 'quick' || savedPath === 'complete') setPath(savedPath);
  }, [load]);

  // ---- Profile autosave ----
  const saveProfile = useCallback(async (): Promise<boolean> => {
    if (!vendor) return false;
    const res = await fetch('/api/vendor/profile', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_name: vendor.company_name, contact_name: vendor.contact_name, phone: vendor.phone,
        website: vendor.website, city: vendor.city, description: vendor.description,
        tagline: vendor.tagline || '',
        year_founded: vendor.year_founded ?? null,
        employee_count: vendor.employee_count || '',
        company_type: vendor.company_type || '',
        languages: vendor.languages || [],
        main_expertise: vendor.main_expertise || [],
        problems_solved: vendor.problems_solved || [],
        capabilities: vendor.capabilities || [],
        offering_families: vendor.offering_families || [],
        industries: vendor.industries, client_types: vendor.client_types,
        service_areas: vendor.service_areas, categories: vendor.categories,
      }),
    }).catch(() => null);
    if (!res) return false;
    const data = await res.json().catch(() => null);
    return Boolean(data?.ok);
  }, [vendor]);
  const profileSave = useAutosave(saveProfile);

  function setV<K extends keyof Vendor>(k: K, v: Vendor[K]) {
    setVendor((prev) => (prev ? { ...prev, [k]: v } : prev));
    profileSave.touch();
  }
  function toggleV(key: 'industries' | 'client_types' | 'service_areas', v: string) {
    if (!vendor) return;
    const cur = vendor[key] || [];
    setV(key, cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]);
  }
  function toggleArr(key: 'main_expertise' | 'problems_solved' | 'capabilities' | 'languages' | 'offering_families', v: string, cap?: number) {
    if (!vendor) return;
    const cur = vendor[key] || [];
    if (cur.includes(v)) setV(key, cur.filter((x) => x !== v));
    else if (!cap || cur.length < cap) setV(key, [...cur, v]);
    else setMsg(`Pick your top ${cap} — remove one to add another.`);
  }

  // ---- Pricing autosave ----
  const priceListing = listings.find((l) => l.id === priceListingId) || null;
  const savePricing = useCallback(async (): Promise<boolean> => {
    const listing = listings.find((l) => l.id === priceListingId);
    if (!listing) return false;
    const legacy = (listing.pricing || {}) as Record<string, unknown>;
    const methods = new Set(models.map((m) => m.method));
    const body = {
      kind: listing.kind, id: listing.id,
      pricing: {
        model: legacy.model || '', range: legacy.range || '', notes: legacy.notes || '',
        // Keep buy/rent/lease facets truthful to the chosen methods.
        buy: methods.has('exact') || methods.has('starting') || methods.has('range') || methods.has('per_unit') || Boolean(legacy.buy),
        rent: methods.has('rental') || Boolean(legacy.rent),
        lease: methods.has('lease') || Boolean(legacy.lease),
        models, components, visibility,
      },
    };
    const res = await fetch('/api/vendor/listings', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }).catch(() => null);
    if (!res) return false;
    const data = await res.json().catch(() => null);
    if (data?.ok) {
      setListings((prev) => prev.map((l) => (l.id === listing.id ? { ...l, pricing: data.listing.pricing } : l)));
      return true;
    }
    return false;
  }, [listings, priceListingId, models, components, visibility]);
  const pricingSave = useAutosave(savePricing);

  function selectPriceListing(id: string) {
    setPriceListingId(id);
    const l = listings.find((x) => x.id === id);
    const p = (l?.pricing || {}) as Record<string, unknown>;
    setModels(cleanPriceModels(p.models));
    setComponents(cleanPriceComponents(p.components));
    setVisibility((['public', 'signed_in', 'after_details', 'after_request', 'private'].includes(p.visibility as string) ? p.visibility : 'public') as PriceVisibility);
    setPriceApproved(false);
  }
  // Default the pricing editor to the newest listing.
  useEffect(() => {
    if (!priceListingId && listings.length) selectPriceListing(listings[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listings.length]);

  function addModel(methodKey: string) {
    const card = PRICING_METHOD_CARDS.find((c) => c.key === methodKey);
    if (!card) return;
    setModels((m) => [...m, {
      id: newId('pm'), name: card.label, method: card.key,
      amount: '', min_amount: '', max_amount: '', currency: 'USD',
      unit: card.unit, recurring: card.recurring,
      billing_frequency: card.recurring ? 'monthly' : '',
      conditions: '', included: '', excluded: '', tiers: [],
      visibility, confirmed_at: '',
    }]);
    setPriceApproved(false);
    pricingSave.touch();
  }
  function setModel(id: string, patch: Partial<PriceModelEntry>) {
    setModels((m) => m.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    setPriceApproved(false);
    pricingSave.touch();
  }
  function removeModel(id: string) {
    setModels((m) => m.filter((x) => x.id !== id));
    pricingSave.touch();
  }
  function addComponent(name: string) {
    setComponents((c) => [...c, {
      id: newId('pc'), name, description: '', amount: '', min_amount: '', max_amount: '',
      unit: '', required: true, recurring: false, conditions: '', visibility,
    }]);
    setPriceApproved(false);
    pricingSave.touch();
  }
  function setComponent(id: string, patch: Partial<PriceComponentEntry>) {
    setComponents((c) => c.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    setPriceApproved(false);
    pricingSave.touch();
  }
  function removeComponent(id: string) {
    setComponents((c) => c.filter((x) => x.id !== id));
    pricingSave.touch();
  }
  function applyVisibility(v: PriceVisibility) {
    setVisibility(v);
    setModels((m) => m.map((x) => ({ ...x, visibility: v })));
    setComponents((c) => c.map((x) => ({ ...x, visibility: v })));
    setPriceApproved(false);
    pricingSave.touch();
  }
  async function approvePricing() {
    const now = new Date().toISOString();
    setModels((m) => m.map((x) => ({ ...x, confirmed_at: now })));
    setPriceApproved(true);
    pricingSave.touch();
    await pricingSave.flush();
  }

  // ---- Offerings ----
  function startCreate(family: string) {
    const card = OFFERING_FAMILY_CARDS.find((c) => c.key === family);
    setOffering({ ...EMPTY_OFFERING, family, kind: card?.kind || 'product' });
    setEditingId(null); setCreating(true); setAiText(''); setSpecRows([]);
  }
  function startEdit(l: Listing) {
    setOffering({
      kind: l.kind, family: l.kind === 'service' ? 'Services' : 'Products',
      name: l.name, category: l.category || '', overview: l.overview || '',
      best_for: (l.best_for || []).join(', '), industries: (l.industries || []).join(', '),
      lead_time: l.lead_time || '', service_areas: (l.service_areas || []).join(', '),
      response_time: l.response_time || '',
    });
    setEditingId(l.id); setCreating(true); setAiText('');
    setSpecRows(Object.entries(l.specs || {}).map(([k, v]) => ({ k, v: String(v) })));
  }
  function duplicateListing(l: Listing) {
    startEdit(l);
    setEditingId(null);
    setOffering((o) => ({ ...o, name: `${l.name} (copy)` }));
  }
  async function aiDraftOffering() {
    if (aiText.trim().length < 40) return;
    setAiBusy(true); setMsg('');
    try {
      const res = await fetch('/api/vendor/listings/extract', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: offering.kind, text: aiText }),
      });
      const data = await res.json();
      if (data.ok) {
        const d = data.draft || {};
        setOffering((o) => ({
          ...o,
          name: o.name || d.name || '',
          category: o.category || d.category || '',
          overview: o.overview || d.overview || '',
          best_for: o.best_for || (Array.isArray(d.best_for) ? d.best_for.join(', ') : ''),
          industries: o.industries || (Array.isArray(d.industries) ? d.industries.join(', ') : ''),
        }));
        setMsg('AI drafted the fields below from your text — review every field before continuing. Anything missing was left blank on purpose.');
      } else setMsg(data.message || 'Could not draft from that text');
    } catch { setMsg('Could not draft from that text'); }
    setAiBusy(false);
  }
  async function saveOffering(): Promise<boolean> {
    if (!offering.name.trim()) { setMsg('Give the offering a name first.'); return false; }
    const body: Record<string, unknown> = {
      kind: offering.kind, name: offering.name, category: offering.category,
      overview: offering.overview, best_for: csv(offering.best_for), industries: csv(offering.industries),
    };
    if (offering.kind === 'product') {
      body.lead_time = offering.lead_time;
      body.specs = Object.fromEntries(specRows.filter((r) => r.k.trim() && r.v.trim()).map((r) => [r.k.trim(), r.v.trim()]));
    } else { body.service_areas = csv(offering.service_areas); body.response_time = offering.response_time; }
    if (editingId) body.id = editingId;
    const res = await fetch('/api/vendor/listings', {
      method: editingId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!data?.ok) { setMsg(data?.message || 'Could not save the offering'); return false; }
    const saved: Listing = { ...data.listing, kind: offering.kind };
    setListings((prev) => (editingId ? prev.map((l) => (l.id === saved.id ? saved : l)) : [saved, ...prev]));
    if (!editingId) { setEditingId(saved.id); selectPriceListing(saved.id); }
    setMsg('Offering saved as a draft — nothing is public until you publish in the Preview stage.');
    return true;
  }
  async function uploadOfferingPhoto(file: File) {
    if (!editingId) { setMsg('Save the offering first, then add photos.'); return; }
    const fd = new FormData(); fd.append('kind', offering.kind); fd.append('id', editingId); fd.append('file', file);
    const res = await fetch('/api/vendor/listings/media', { method: 'POST', body: fd });
    const data = await res.json();
    setMsg(data.ok ? 'Photo added.' : (data.message || 'Upload failed'));
  }

  // ---- Preview / publish ----
  const previewListing = priceListing || listings[0] || null;
  async function acceptTerms() {
    setAgBusy(true);
    const res = await fetch('/api/vendor/agreement', { method: 'POST' });
    const data = await res.json();
    if (data.ok) setAgreement((a) => (a ? { ...a, accepted: true } : a));
    else setMsg(data.message || 'Could not record acceptance');
    setAgBusy(false);
  }
  async function publishNow() {
    if (!previewListing || !accOk) return;
    setPubBusy(true); setMsg('');
    await profileSave.flush();
    await pricingSave.flush();
    const res = await fetch('/api/vendor/listings', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: previewListing.kind, id: previewListing.id, status: 'published', accuracy_confirmed: true }),
    });
    const data = await res.json();
    setPubBusy(false);
    if (!data.ok) { setMsg(data.message || 'Could not publish'); return; }
    setPublished(true);
    setListings((prev) => prev.map((l) => (l.id === previewListing.id ? { ...l, status: 'published' } : l)));
  }

  // ---- Navigation ----
  const visibleSubs = useCallback((s: StageKey) => SUBS[s].filter((x) => path !== 'quick' || x.quick), [path]);
  const stageOrder = useMemo(() => ONBOARDING_STAGES.map((s) => s.key).filter((k) => path !== 'quick' || k !== 'proof'), [path]);

  async function go(nextStage: StageKey, nextSub: number) {
    await profileSave.flush();
    await pricingSave.flush();
    setStage(nextStage); setSub(nextSub); setMsg('');
    const url = new URL(window.location.href);
    url.searchParams.set('stage', nextStage);
    window.history.replaceState(null, '', url.toString());
    requestAnimationFrame(() => headingRef.current?.focus());
  }
  async function next() {
    // Leaving the offering editor counts as saving it.
    if (stage === 'offerings' && creating) {
      const ok = await saveOffering();
      if (!ok) return;
      setCreating(false);
      return;
    }
    const subs = visibleSubs(stage);
    if (sub < subs.length - 1) return go(stage, sub + 1);
    const i = stageOrder.indexOf(stage);
    if (i < stageOrder.length - 1) return go(stageOrder[i + 1], 0);
  }
  async function back() {
    if (stage === 'offerings' && creating) { setCreating(false); return; }
    if (sub > 0) return go(stage, sub - 1);
    const i = stageOrder.indexOf(stage);
    if (i > 0) { const prev = stageOrder[i - 1]; return go(prev, visibleSubs(prev).length - 1); }
  }

  const progress = useMemo(() => onboardingProgress({
    companyName: vendor?.company_name, city: vendor?.city, tagline: vendor?.tagline,
    companyType: vendor?.company_type, mainExpertise: vendor?.main_expertise,
    problemsSolved: vendor?.problems_solved, offeringFamilies: vendor?.offering_families,
    listingCount: listings.length,
    hasStructuredPricing: listings.some((l) => {
      const p = (l.pricing || {}) as Record<string, unknown>;
      return (Array.isArray(p.models) && p.models.length > 0) || Boolean(p.range) || Boolean(l.pricing_model);
    }),
    clientTypes: vendor?.client_types, industries: vendor?.industries,
    serviceAreas: vendor?.service_areas, proofCount,
    publishedCount: listings.filter((l) => l.status === 'published').length,
  }), [vendor, listings, proofCount]);

  const saveState = pricingSave.state === 'idle' ? profileSave.state : pricingSave.state;
  const currentStage = ONBOARDING_STAGES.find((s) => s.key === stage)!;
  const subKey = visibleSubs(stage)[Math.min(sub, visibleSubs(stage).length - 1)]?.key || SUBS[stage][0].key;

  // ---------------- Render ----------------
  if (checking) return <Shell saveLabel=""><div className="ob-empty">Loading…</div></Shell>;
  if (!signedIn) {
    return (
      <Shell saveLabel="">
        <div className="ob-gate">
          <h1>Set up your company on NXT//LINK</h1>
          <p>Sign in or create a vendor account to start the guided setup.</p>
          <a className="ob-btn" href="/vendor-login">Sign in →</a>
        </div>
      </Shell>
    );
  }
  if (!vendor) return null;

  if (!path) {
    return (
      <Shell saveLabel="">
        <div className="ob-pathpick">
          <h1>How much do you want to set up today?</h1>
          <p className="ob-sub">Either way, nothing goes public until you review and publish. You can switch anytime.</p>
          <div className="ob-cards two">
            <button className="ob-card" onClick={() => { setPath('quick'); window.localStorage.setItem('nxt_onboarding_path', 'quick'); }}>
              <b>Quick setup</b>
              <span>~10 minutes. Company basics, one offering, one price, who it&apos;s for, publish.</span>
            </button>
            <button className="ob-card" onClick={() => { setPath('complete'); window.localStorage.setItem('nxt_onboarding_path', 'complete'); }}>
              <b>Complete setup</b>
              <span>Everything: expertise, additional costs, proof, and matching preferences.</span>
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell saveLabel={SAVE_LABEL[saveState]}>
      {/* Stage chips + progress */}
      <div className="ob-progress">
        <div className="ob-meterbar" role="progressbar" aria-valuenow={progress.pct} aria-valuemin={0} aria-valuemax={100} aria-label="Setup progress">
          <div style={{ width: `${progress.pct}%` }} />
        </div>
        <span className="ob-pct">{progress.pct}% complete</span>
      </div>
      <div className="ob-stages" role="tablist" aria-label="Setup stages">
        {stageOrder.map((k) => {
          const s = ONBOARDING_STAGES.find((x) => x.key === k)!;
          const st = progress.stages.find((x) => x.key === k);
          return (
            <button key={k} role="tab" aria-selected={stage === k}
              className={'ob-stage' + (stage === k ? ' on' : '') + (st?.done ? ' done' : '')}
              onClick={() => go(k, 0)}>
              {st?.done ? '✓ ' : ''}{s.label}
            </button>
          );
        })}
      </div>

      {msg && <div className="ob-msg" aria-live="polite">{msg}</div>}

      <h1 ref={headingRef} tabIndex={-1} className="ob-q">{currentStage.question}</h1>

      {/* ============ STAGE: COMPANY ============ */}
      {stage === 'company' && subKey === 'basics' && (
        <section className="ob-panel">
          <p className="ob-hint">The basics buyers see first. Everything autosaves — you can leave and come back anytime.</p>
          <div className="ob-grid">
            <Field label="Company name *"><input value={vendor.company_name || ''} onChange={(e) => setV('company_name', e.target.value)} /></Field>
            <Field label="One-line tagline"><input maxLength={160} placeholder="e.g. Forklift service and rentals across the Borderplex" value={vendor.tagline || ''} onChange={(e) => setV('tagline', e.target.value)} /></Field>
            <Field label="Headquarters city"><input placeholder="e.g. El Paso, TX" value={vendor.city || ''} onChange={(e) => setV('city', e.target.value)} /></Field>
            <Field label="Website"><input placeholder="https://…" value={vendor.website || ''} onChange={(e) => setV('website', e.target.value)} /></Field>
            <Field label="Main contact"><input value={vendor.contact_name || ''} onChange={(e) => setV('contact_name', e.target.value)} /></Field>
            <Field label="Phone"><input value={vendor.phone || ''} onChange={(e) => setV('phone', e.target.value)} /></Field>
            <Field label="Year founded"><input inputMode="numeric" placeholder="e.g. 2008" value={vendor.year_founded ?? ''} onChange={(e) => setV('year_founded', e.target.value ? Number(e.target.value.replace(/\D/g, '').slice(0, 4)) || null : null)} /></Field>
            <Field label="Company size">
              <select value={vendor.employee_count || ''} onChange={(e) => setV('employee_count', e.target.value)}>
                <option value="">Select…</option>
                {EMPLOYEE_RANGES.map((r) => <option key={r} value={r}>{r} employees</option>)}
              </select>
            </Field>
          </div>
          <Field label="Short company description">
            <textarea rows={4} placeholder="What you do, who you serve, and what makes you different." value={vendor.description || ''} onChange={(e) => setV('description', e.target.value)} />
          </Field>
          <div className="ob-chipsblock">
            <span className="ob-lblsm">Languages supported</span>
            <Chips options={LANGUAGE_OPTIONS} selected={vendor.languages || []} onToggle={(v) => toggleArr('languages', v)} />
          </div>
          <p className="ob-hint">Logo and banner uploads live in your <a href="/vendor/portal">company profile</a> — add them anytime.</p>
        </section>
      )}

      {stage === 'company' && subKey === 'type' && (
        <section className="ob-panel">
          <p className="ob-hint">What type of company are you? Pick the one that fits best.</p>
          <div className="ob-cards" role="radiogroup" aria-label="Company type">
            {COMPANY_TYPE_OPTIONS.map((t) => (
              <button key={t} role="radio" aria-checked={vendor.company_type === t}
                className={'ob-card sm' + (vendor.company_type === t ? ' on' : '')}
                onClick={() => setV('company_type', t)}>
                <b>{t}</b>
              </button>
            ))}
          </div>
        </section>
      )}

      {stage === 'company' && subKey === 'expertise' && (
        <section className="ob-panel">
          <div className="ob-chipsblock">
            <span className="ob-lblsm">What is your company best known for? (up to {MAX_EXPERTISE})</span>
            <Chips options={EXPERTISE_OPTIONS} selected={vendor.main_expertise || []} onToggle={(v) => toggleArr('main_expertise', v, MAX_EXPERTISE)} allowCustom />
          </div>
          <div className="ob-chipsblock">
            <span className="ob-lblsm">What problems do you help clients solve?</span>
            <Chips options={PROBLEM_OPTIONS} selected={vendor.problems_solved || []} onToggle={(v) => toggleArr('problems_solved', v)} allowCustom />
          </div>
          <div className="ob-chipsblock">
            <span className="ob-lblsm">What capabilities do you provide?</span>
            <Chips options={CAPABILITY_OPTIONS} selected={vendor.capabilities || []} onToggle={(v) => toggleArr('capabilities', v)} allowCustom />
          </div>
        </section>
      )}

      {/* ============ STAGE: OFFERINGS ============ */}
      {stage === 'offerings' && subKey === 'families' && !creating && (
        <section className="ob-panel">
          <p className="ob-hint">Pick everything that applies — each becomes a section of your storefront.</p>
          <div className="ob-cards two">
            {OFFERING_FAMILY_CARDS.map((c) => {
              const on = (vendor.offering_families || []).includes(c.key);
              return (
                <button key={c.key} aria-pressed={on} className={'ob-card' + (on ? ' on' : '')} onClick={() => toggleArr('offering_families', c.key)}>
                  <b>{c.label}</b>
                  <span>{c.hint}</span>
                  <small>{c.examples}</small>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {stage === 'offerings' && subKey === 'first' && !creating && (
        <section className="ob-panel">
          <p className="ob-hint">{listings.length ? 'Your offerings so far — add more or continue to pricing.' : 'Add your first offering. You can start from scratch, paste text for an AI draft, or duplicate later.'}</p>
          {listings.length > 0 && (
            <ul className="ob-list">
              {listings.map((l) => (
                <li key={l.id}>
                  <span className={'ob-status ' + l.status}>{l.status}</span>
                  <b>{l.name}</b><small>{l.category || l.kind}</small>
                  <span className="ob-spacer" />
                  <button className="ob-mini" onClick={() => startEdit(l)}>Edit</button>
                  <button className="ob-mini" onClick={() => duplicateListing(l)}>Duplicate</button>
                </li>
              ))}
            </ul>
          )}
          <div className="ob-addrow">
            {(vendor.offering_families?.length ? vendor.offering_families : ['Products', 'Services']).map((f) => (
              <button key={f} className="ob-btn ghost sm" onClick={() => startCreate(f)}>+ Add {f.toLowerCase().replace(/s$/, '')}</button>
            ))}
          </div>
        </section>
      )}

      {stage === 'offerings' && creating && (
        <section className="ob-panel">
          <div className="ob-panelhead">
            <span className="ob-lblsm">{editingId ? 'Edit' : 'New'} {offering.family.toLowerCase().replace(/s$/, '')}</span>
            <button className="ob-mini" onClick={() => setCreating(false)}>← Back to offerings</button>
          </div>
          <div className="ob-ai">
            <span className="ob-lblsm">Optional: paste brochure or spec text — AI drafts the fields (it never invents)</span>
            <div className="ob-airow">
              <textarea rows={2} placeholder="Paste text about this offering…" value={aiText} onChange={(e) => setAiText(e.target.value)} />
              <button className="ob-btn sm" disabled={aiBusy || aiText.trim().length < 40} onClick={aiDraftOffering}>{aiBusy ? 'Reading…' : 'Draft with AI'}</button>
            </div>
          </div>
          <div className="ob-grid">
            <Field label="Offering name *"><input value={offering.name} onChange={(e) => setOffering({ ...offering, name: e.target.value })} /></Field>
            <Field label="Category"><input placeholder={offering.kind === 'product' ? 'e.g. Forklifts, WMS, Racking' : 'e.g. Forklift maintenance, Staffing'} value={offering.category} onChange={(e) => setOffering({ ...offering, category: e.target.value })} /></Field>
          </div>
          <Field label="Short description">
            <textarea rows={4} placeholder="What it is, the problem it solves, and why it's different." value={offering.overview} onChange={(e) => setOffering({ ...offering, overview: e.target.value })} />
          </Field>
          <div className="ob-grid">
            <Field label="Who is this best for? (comma-separated)"><input placeholder="e.g. 3PLs, Cold storage, Maquiladoras" value={offering.best_for} onChange={(e) => setOffering({ ...offering, best_for: e.target.value })} /></Field>
            <Field label="Industries served (comma-separated)"><input placeholder="e.g. Warehousing & 3PL, Manufacturing" value={offering.industries} onChange={(e) => setOffering({ ...offering, industries: e.target.value })} /></Field>
          </div>
          {offering.kind === 'product' ? (
            <>
              <div className="ob-grid">
                <Field label="Typical lead time"><input placeholder="e.g. 2–4 weeks" value={offering.lead_time} onChange={(e) => setOffering({ ...offering, lead_time: e.target.value })} /></Field>
              </div>
              <div className="ob-specs">
                <span className="ob-lblsm">{specTemplate ? `${specTemplate.name} specifications` : 'Specifications'}</span>
                {specTemplate && (
                  <div className="ob-grid">
                    {specTemplate.fields.map((f) => (
                      <Field key={f.label} label={f.label}>
                        {f.options ? (
                          <select value={specValue(f.label)} onChange={(e) => setSpec(f.label, e.target.value)}>
                            <option value="">Select…</option>
                            {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : (
                          <input placeholder={f.hint || ''} value={specValue(f.label)} onChange={(e) => setSpec(f.label, e.target.value)} />
                        )}
                      </Field>
                    ))}
                  </div>
                )}
                {!specTemplate && <p className="ob-hint">Pick a category above and matching spec fields appear (forklifts, software, racking, robotics…). You can always add your own below.</p>}
                {specRows.filter((r) => !specTemplate || !specTemplate.fields.some((f) => f.label === r.k)).map((r, i) => (
                  <div className="ob-customspec" key={`c${i}`}>
                    <input placeholder="Field name" aria-label="Custom specification name" value={r.k}
                      onChange={(e) => setSpecRows((rows) => rows.map((x) => (x === r ? { ...x, k: e.target.value } : x)))} />
                    <input placeholder="Value" aria-label="Custom specification value" value={r.v}
                      onChange={(e) => setSpecRows((rows) => rows.map((x) => (x === r ? { ...x, v: e.target.value } : x)))} />
                    <button className="ob-mini" onClick={() => setSpecRows((rows) => rows.filter((x) => x !== r))} aria-label={`Remove ${r.k || 'custom field'}`}>✕</button>
                  </div>
                ))}
                <button className="ob-mini" onClick={() => setSpecRows((rows) => [...rows, { k: '', v: '' }])}>+ Add custom specification</button>
              </div>
            </>
          ) : (
            <div className="ob-grid">
              <Field label="Service areas (comma-separated)"><input placeholder="El Paso, Juárez, Cross-border" value={offering.service_areas} onChange={(e) => setOffering({ ...offering, service_areas: e.target.value })} /></Field>
              <Field label="Typical response time"><input placeholder="e.g. Same day, 24–48 hours" value={offering.response_time} onChange={(e) => setOffering({ ...offering, response_time: e.target.value })} /></Field>
            </div>
          )}
          {editingId && (
            <div className="ob-addrow">
              <label className="ob-btn ghost sm">Add photo
                <input type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadOfferingPhoto(f); e.target.value = ''; }} />
              </label>
              <span className="ob-hint" style={{ margin: 0 }}>Specs, pilot, warranty and more live in <a href="/vendor/listings">Seller Central</a>.</span>
            </div>
          )}
        </section>
      )}

      {/* ============ STAGE: PRICING ============ */}
      {stage === 'pricing' && listings.length === 0 && (
        <section className="ob-panel">
          <p className="ob-hint">Add an offering first — pricing attaches to an offering.</p>
          <button className="ob-btn ghost" onClick={() => go('offerings', 0)}>← Back to offerings</button>
        </section>
      )}
      {stage === 'pricing' && listings.length > 0 && (
        <>
          <div className="ob-listingpick">
            <label className="ob-lblsm" htmlFor="ob-price-listing">Pricing for:</label>
            <select id="ob-price-listing" value={priceListingId} onChange={(e) => selectPriceListing(e.target.value)}>
              {listings.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          {subKey === 'methods' && (
            <section className="ob-panel">
              <p className="ob-hint">How do you normally charge for this? Pick every method you offer — a forklift can have a purchase price AND a monthly rental.</p>
              <div className="ob-cards three">
                {PRICING_METHOD_CARDS.map((c) => {
                  const count = models.filter((m) => m.method === c.key).length;
                  return (
                    <button key={c.key} className={'ob-card sm' + (count ? ' on' : '')} onClick={() => addModel(c.key)} aria-pressed={count > 0}>
                      <b>{c.label}{count > 1 ? ` ×${count}` : ''}</b>
                      <span>{c.hint}</span>
                    </button>
                  );
                })}
              </div>
              {models.length > 0 && (
                <ul className="ob-list">
                  {models.map((m) => (
                    <li key={m.id}>
                      <b>{m.name}</b><small>{priceLine(m)}</small>
                      <span className="ob-spacer" />
                      <button className="ob-mini" onClick={() => removeModel(m.id)} aria-label={`Remove ${m.name}`}>Remove</button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {subKey === 'amounts' && (
            <section className="ob-panel">
              {models.length === 0 && <p className="ob-hint">No pricing methods picked yet — go back one step and choose how you charge.</p>}
              {models.map((m) => (
                <div className="ob-pricecard" key={m.id}>
                  <div className="ob-grid">
                    <Field label="Pricing name"><input value={m.name} onChange={(e) => setModel(m.id, { name: e.target.value })} /></Field>
                    <Field label={m.method === 'range' ? 'Low end' : m.method === 'starting' ? 'Starting at' : 'Amount'}>
                      <input inputMode="decimal" placeholder="e.g. 195" value={m.method === 'range' ? m.min_amount : m.amount}
                        onChange={(e) => setModel(m.id, m.method === 'range' ? { min_amount: e.target.value } : { amount: e.target.value })} />
                    </Field>
                    {m.method === 'range' && (
                      <Field label="High end"><input inputMode="decimal" placeholder="e.g. 450" value={m.max_amount} onChange={(e) => setModel(m.id, { max_amount: e.target.value })} /></Field>
                    )}
                    <Field label="Unit">
                      <input placeholder="per unit, per hour, per dock door…" value={m.unit} onChange={(e) => setModel(m.id, { unit: e.target.value })} />
                    </Field>
                    <Field label="Currency">
                      <select value={m.currency} onChange={(e) => setModel(m.id, { currency: e.target.value })}>
                        <option value="USD">USD $</option><option value="MXN">MXN $</option>
                      </select>
                    </Field>
                  </div>
                  <label className="ob-cb">
                    <input type="checkbox" checked={m.recurring} onChange={(e) => setModel(m.id, { recurring: e.target.checked, billing_frequency: e.target.checked ? (m.billing_frequency || 'monthly') : '' })} />
                    Recurring charge{m.recurring ? ' — billed' : ''}
                    {m.recurring && (
                      <select value={m.billing_frequency} onChange={(e) => setModel(m.id, { billing_frequency: e.target.value })} aria-label="Billing frequency">
                        <option value="monthly">monthly</option><option value="quarterly">quarterly</option><option value="yearly">yearly</option>
                      </select>
                    )}
                  </label>
                  <details className="ob-more"><summary>More pricing options</summary>
                    <Field label="Conditions"><input placeholder="e.g. Minimum 3 units, within 50 miles" value={m.conditions} onChange={(e) => setModel(m.id, { conditions: e.target.value })} /></Field>
                    <div className="ob-grid">
                      <Field label="What's included"><input value={m.included} onChange={(e) => setModel(m.id, { included: e.target.value })} /></Field>
                      <Field label="What's excluded"><input placeholder="e.g. Parts quoted separately" value={m.excluded} onChange={(e) => setModel(m.id, { excluded: e.target.value })} /></Field>
                    </div>
                    <div className="ob-tiers">
                      <span className="ob-lblsm">Quantity discounts (optional)</span>
                      {(m.tiers || []).map((t, ti) => (
                        <div className="ob-tierrow" key={ti}>
                          <input inputMode="numeric" placeholder="From qty" aria-label="From quantity" value={t.min_qty}
                            onChange={(e) => setModel(m.id, { tiers: m.tiers.map((x, i) => (i === ti ? { ...x, min_qty: e.target.value } : x)) })} />
                          <input inputMode="numeric" placeholder="To qty (empty = no limit)" aria-label="To quantity" value={t.max_qty}
                            onChange={(e) => setModel(m.id, { tiers: m.tiers.map((x, i) => (i === ti ? { ...x, max_qty: e.target.value } : x)) })} />
                          <input inputMode="decimal" placeholder="$ each" aria-label="Price each" value={t.unit_amount}
                            onChange={(e) => setModel(m.id, { tiers: m.tiers.map((x, i) => (i === ti ? { ...x, unit_amount: e.target.value } : x)) })} />
                          <button className="ob-mini" onClick={() => setModel(m.id, { tiers: m.tiers.filter((_, i) => i !== ti) })} aria-label="Remove tier">✕</button>
                        </div>
                      ))}
                      <button className="ob-mini" onClick={() => setModel(m.id, { tiers: [...(m.tiers || []), { min_qty: m.tiers?.length ? '' : '1', max_qty: '', unit_amount: '' }] })}>+ Add quantity tier</button>
                      {(m.tiers || []).filter((t) => t.min_qty && t.unit_amount).length > 0 && (
                        <p className="ob-hint" style={{ margin: '8px 0 0' }}>
                          Buyers see: {(m.tiers || []).filter((t) => t.min_qty && t.unit_amount).map((t) => tierLine(t, m.currency)).join(' · ')}
                        </p>
                      )}
                    </div>
                  </details>
                  <div className="ob-linepreview">Buyers see: <b>{priceLine(m)}</b></div>
                </div>
              ))}
            </section>
          )}

          {subKey === 'extras' && (
            <section className="ob-panel">
              <p className="ob-hint">Are there additional costs clients should know about? Surprises kill deals — list them up front.</p>
              <div className="ob-chipsblock">
                <Chips options={ADDITIONAL_COST_OPTIONS} selected={components.map((c) => c.name)} onToggle={(name) => {
                  const existing = components.find((c) => c.name === name);
                  if (existing) removeComponent(existing.id); else addComponent(name);
                }} allowCustom customLabel="Add another cost" />
              </div>
              {components.map((c) => (
                <div className="ob-pricecard" key={c.id}>
                  <div className="ob-grid">
                    <Field label="Charge name"><input value={c.name} onChange={(e) => setComponent(c.id, { name: e.target.value })} /></Field>
                    <Field label="Amount (leave empty for “Quoted separately”)"><input inputMode="decimal" value={c.amount} onChange={(e) => setComponent(c.id, { amount: e.target.value })} /></Field>
                    <Field label="Unit"><input placeholder="per visit, % of labor…" value={c.unit} onChange={(e) => setComponent(c.id, { unit: e.target.value })} /></Field>
                  </div>
                  <div className="ob-cbrow">
                    <label className="ob-cb"><input type="checkbox" checked={c.required} onChange={(e) => setComponent(c.id, { required: e.target.checked })} /> Required (not optional)</label>
                    <label className="ob-cb"><input type="checkbox" checked={c.recurring} onChange={(e) => setComponent(c.id, { recurring: e.target.checked })} /> Recurring</label>
                    <span className="ob-spacer" />
                    <button className="ob-mini" onClick={() => removeComponent(c.id)} aria-label={`Remove ${c.name}`}>Remove</button>
                  </div>
                </div>
              ))}
            </section>
          )}

          {subKey === 'visibility' && (
            <section className="ob-panel">
              <p className="ob-hint">Who should be able to see this pricing? Public prices get more qualified leads; private pricing still helps you quote faster.</p>
              <div className="ob-cards" role="radiogroup" aria-label="Pricing visibility">
                {VISIBILITY_OPTIONS.map((o) => (
                  <button key={o.key} role="radio" aria-checked={visibility === o.key}
                    className={'ob-card sm' + (visibility === o.key ? ' on' : '')} onClick={() => applyVisibility(o.key)}>
                    <b>{o.label}</b><span>{o.hint}</span>
                  </button>
                ))}
              </div>
              <div className="ob-preview">
                <span className="ob-lblsm">Exactly what buyers will see on your listing:</span>
                <PricePreview pricing={{ models, components, visibility }} listingName={priceListing?.name || ''} />
                <button className="ob-btn" disabled={priceApproved} onClick={approvePricing}>
                  {priceApproved ? '✓ Pricing approved' : 'This is correct — approve this preview'}
                </button>
                <p className="ob-hint" style={{ marginTop: 8 }}>Approving stamps today as the date you confirmed this pricing is accurate.</p>
              </div>
            </section>
          )}
        </>
      )}

      {/* ============ STAGE: IDEAL CLIENTS ============ */}
      {stage === 'clients' && subKey === 'who' && (
        <section className="ob-panel">
          <p className="ob-hint">This builds your private matching profile — buyers never see it directly; it decides which opportunities reach you.</p>
          <div className="ob-chipsblock">
            <span className="ob-lblsm">Operation types you want to work with</span>
            <Chips options={OPERATION_TYPE_OPTIONS} selected={vendor.client_types || []} onToggle={(v) => toggleV('client_types', v)} />
          </div>
          <div className="ob-chipsblock">
            <span className="ob-lblsm">Client size</span>
            <Chips options={CLIENT_SIZE_OPTIONS} selected={vendor.client_types || []} onToggle={(v) => toggleV('client_types', v)} />
          </div>
          <div className="ob-chipsblock">
            <span className="ob-lblsm">Industries</span>
            <Chips options={INDUSTRY_OPTIONS} selected={vendor.industries || []} onToggle={(v) => toggleV('industries', v)} allowCustom />
          </div>
        </section>
      )}

      {stage === 'clients' && subKey === 'where' && (
        <section className="ob-panel">
          <div className="ob-chipsblock">
            <span className="ob-lblsm">Where can you serve clients?</span>
            <Chips options={SERVICE_AREA_OPTIONS} selected={vendor.service_areas || []} onToggle={(v) => toggleV('service_areas', v)} allowCustom customLabel="Add another area" />
          </div>
          <div className="ob-summary" aria-live="polite">
            <span className="ob-lblsm">Your matching summary</span>
            <p>{buildMatchingSummary({
              operations: (vendor.client_types || []).filter((c) => OPERATION_TYPE_OPTIONS.includes(c)),
              industries: vendor.industries || [], areas: vendor.service_areas || [],
              expertise: vendor.main_expertise || [],
            })}</p>
            <p className="ob-hint" style={{ margin: 0 }}>Delivery vs. installation vs. on-site coverage, minimum project size, and do-not-send rules are coming next — this summary only promises what the platform matches on today.</p>
          </div>
        </section>
      )}

      {/* ============ STAGE: PROOF ============ */}
      {stage === 'proof' && (
        <section className="ob-panel">
          <p className="ob-hint">Proof wins quotes: certifications, case studies, and photos. {proofCount > 0 ? `You have ${proofCount} proof item${proofCount === 1 ? '' : 's'} so far.` : 'You have none yet — even one helps.'}</p>
          <ul className="ob-list">
            <li><b>Certifications & insurance</b><small>Name, issuer, expiry, and the document</small><span className="ob-spacer" /><a className="ob-mini" href="/vendor/portal">Add in profile →</a></li>
            <li><b>Case studies (up to 3 featured)</b><small>Problem → solution → result</small><span className="ob-spacer" /><a className="ob-mini" href="/vendor/portal">Add in profile →</a></li>
            <li><b>Photos & videos</b><small>Your work, your facility, your team</small><span className="ob-spacer" /><a className="ob-mini" href="/vendor/portal">Add in profile →</a></li>
          </ul>
          <p className="ob-hint">Only NXT//LINK can mark documents as verified — buyers see exactly what was checked. You can skip this and add proof later.</p>
        </section>
      )}

      {/* ============ STAGE: PREVIEW ============ */}
      {stage === 'preview' && (
        <section className="ob-panel">
          {published ? (
            <div className="ob-donebox">
              <b>🎉 You are live in the marketplace.</b>
              <p>Buyers can now find your listing and every quote request lands in your leads inbox.</p>
              <div className="ob-addrow">
                {previewListing && <a className="ob-btn sm" href={`/marketplace/${previewListing.kind}/${previewListing.id}`}>View live listing</a>}
                <a className="ob-btn ghost sm" href={`/marketplace/vendor/${vendor.id}`}>View your storefront</a>
                <a className="ob-btn ghost sm" href="/vendor/leads">Go to leads inbox</a>
              </div>
            </div>
          ) : !previewListing ? (
            <p className="ob-hint">Create an offering first — then preview and publish it here.</p>
          ) : (
            <>
              <p className="ob-hint">This is exactly what buyers will see. Check every line — you are responsible for its accuracy.</p>
              <div className="ob-prevcard">
                <div className="ob-previmg">{previewListing.image_paths?.[0] && /^https?:/.test(previewListing.image_paths[0]) ? <img src={previewListing.image_paths[0]} alt="" /> : <span>{previewListing.image_paths?.length ? 'Photo attached' : 'No photo'}</span>}</div>
                <div className="ob-prevbody">
                  <b>{previewListing.name}</b>
                  <small>{previewListing.category || previewListing.kind} · {vendor.company_name}{vendor.city ? ` · ${vendor.city}` : ''}</small>
                  <PriceCardLine pricing={priceListingId === previewListing.id ? { models, components, visibility } : (previewListing.pricing as Record<string, unknown>)} />
                  <em>Get Quote →</em>
                </div>
              </div>
              <PricePreview pricing={priceListingId === previewListing.id ? { models, components, visibility } : (previewListing.pricing as Record<string, unknown>)} listingName={previewListing.name} />
              <p className="ob-hint">Storefront: <a href={`/marketplace/vendor/${vendor.id}`} target="_blank" rel="noreferrer">preview your public company page →</a></p>

              {agreement && !agreement.accepted && (
                <div className="ob-terms">
                  <span className="ob-lblsm">One thing first — the NXT//LINK vendor terms</span>
                  <p className="ob-hint">{agreement.summary}</p>
                  <ul>{agreement.terms.map((t) => <li key={t.title}><b>{t.title}.</b> {t.body}</li>)}</ul>
                  <button className="ob-btn sm" disabled={agBusy} onClick={acceptTerms}>{agBusy ? 'Saving…' : 'I accept the vendor terms'}</button>
                </div>
              )}
              {!emailVerified && <div className="ob-warn">Your email is not verified yet — publishing unlocks after you click the confirmation link we emailed you.</div>}

              <label className="ob-cb ob-acc">
                <input type="checkbox" checked={accOk} onChange={(e) => setAccOk(e.target.checked)} />
                I confirm this information — including pricing — is accurate as of today and approved to be displayed on NXT//LINK.
              </label>
              <div className="ob-addrow">
                <button className="ob-btn ghost" onClick={() => { setMsg('Saved as a draft — sign back in anytime to finish.'); }}>Save draft & finish later</button>
                <button className="ob-btn" disabled={!accOk || pubBusy || !agreement?.accepted || !emailVerified} onClick={publishNow}>{pubBusy ? 'Publishing…' : 'Publish to marketplace'}</button>
              </div>
            </>
          )}
        </section>
      )}

      {/* Wizard footer nav */}
      <div className="ob-nav">
        <button className="ob-btn ghost" onClick={back} disabled={stage === stageOrder[0] && sub === 0 && !creating}>← Back</button>
        <a className="ob-later" href="/vendor/portal">Save and finish later</a>
        {!(stage === 'preview' && !creating) && (
          <button className="ob-btn" onClick={next}>{stage === 'offerings' && creating ? (editingId ? 'Save offering' : 'Create offering') : 'Continue →'}</button>
        )}
      </div>
    </Shell>
  );
}

// ---------- Small building blocks ----------

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="ob-field"><span>{label}</span>{children}</label>;
}

function Chips({ options, selected, onToggle, allowCustom, customLabel }: {
  options: readonly string[]; selected: string[]; onToggle: (v: string) => void;
  allowCustom?: boolean; customLabel?: string;
}) {
  const [custom, setCustom] = useState('');
  const extra = selected.filter((s) => !options.includes(s));
  return (
    <div className="ob-chips">
      {[...options, ...extra].map((o) => (
        <button key={o} type="button" aria-pressed={selected.includes(o)}
          className={'ob-chip' + (selected.includes(o) ? ' on' : '')} onClick={() => onToggle(o)}>
          {o}
        </button>
      ))}
      {allowCustom && (
        <span className="ob-chipadd">
          <input placeholder={customLabel || 'Add your own'} value={custom} onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && custom.trim()) { onToggle(custom.trim()); setCustom(''); } }} aria-label={customLabel || 'Add your own option'} />
          <button type="button" className="ob-mini" onClick={() => { if (custom.trim()) { onToggle(custom.trim()); setCustom(''); } }}>Add</button>
        </span>
      )}
    </div>
  );
}

/** Buyer-facing price block — renders through the SAME publicPricing gate the
 *  marketplace APIs use, so the vendor previews exactly what anonymous buyers get. */
function PricePreview({ pricing, listingName }: { pricing: Record<string, unknown> | null | undefined; listingName: string }) {
  const pub = publicPricing(pricing, 'public') || {};
  const pubModels = (pub.models as PriceModelEntry[]) || [];
  const pubComponents = (pub.components as PriceComponentEntry[]) || [];
  const gated = Boolean(pub.has_gated_pricing);
  return (
    <div className="ob-buyerprev">
      <b>{listingName || 'Your offering'}</b>
      {pubModels.length === 0 && <p className="ob-quoteonly">Request Quote{gated ? ' — pricing shared after you request a quote' : ''}</p>}
      {pubModels.map((m) => (
        <div key={m.id}>
          <p className="ob-priceline">{m.name ? `${m.name}: ` : ''}<b>{priceLine(m)}</b></p>
          {(m.tiers || []).length > 0 && (
            <ul className="ob-tierlist">{m.tiers.map((t, i) => <li key={i}>{tierLine(t, m.currency)}</li>)}</ul>
          )}
        </div>
      ))}
      {pubComponents.length > 0 && (
        <>
          <span className="ob-lblsm">Additional costs</span>
          <ul>{pubComponents.map((c) => <li key={c.id}>{componentLine(c)}</li>)}</ul>
        </>
      )}
      {pubModels.length > 0 && gated && <p className="ob-hint" style={{ margin: '6px 0 0' }}>Some pricing is only shown to signed-in clients or after a quote request.</p>}
      <p className="ob-estnote">Estimates are not binding quotes — you confirm the official price in your final quote.</p>
    </div>
  );
}

function PriceCardLine({ pricing }: { pricing: Record<string, unknown> | null | undefined }) {
  const pub = publicPricing(pricing, 'public') || {};
  const pubModels = (pub.models as PriceModelEntry[]) || [];
  const first = pubModels.find((m) => m.method !== 'quote');
  return <em className="ob-cardprice">{first ? priceLine(first) : String(pub.range || 'Request quote')}</em>;
}

function Shell({ children, saveLabel }: { children: React.ReactNode; saveLabel: string }) {
  return (
    <div className="ob">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <nav className="ob-topnav">
        <a className="ob-brand" href="/"><b>NXT<i>{'//'}</i>LINK</b><span>Company setup</span></a>
        <div className="ob-topr">
          <span className="ob-save" aria-live="polite">{saveLabel}</span>
          <a className="ob-navlink" href="/vendor/portal">Full profile</a>
          <a className="ob-navlink" href="/vendor/listings">Seller Central</a>
        </div>
      </nav>
      <main className="ob-wrap">{children}</main>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
.ob{min-height:100vh;background:#0A0A0F;color:#F0F0F5;font-family:'Outfit',system-ui,sans-serif;-webkit-font-smoothing:antialiased;}
.ob *{box-sizing:border-box;}
.ob-topnav{display:flex;justify-content:space-between;align-items:center;padding:14px 26px;border-bottom:1px solid rgba(255,255,255,.08);position:sticky;top:0;background:rgba(10,10,15,.9);backdrop-filter:blur(20px);z-index:20;}
.ob-brand{display:flex;align-items:baseline;gap:10px;color:#F0F0F5;text-decoration:none;}
.ob-brand b{font-size:17px;}.ob-brand i{color:#A78BFA;font-style:normal;}
.ob-brand span{color:#8080A0;font-size:13px;}
.ob-topr{display:flex;gap:16px;align-items:center;}
.ob-save{font-size:12.5px;color:#34D399;min-width:110px;text-align:right;}
.ob-navlink{color:#A78BFA;font-size:13.5px;font-weight:600;text-decoration:none;}
.ob-wrap{max-width:760px;margin:0 auto;padding:30px 20px 140px;}
.ob-empty{text-align:center;color:#8080A0;padding:80px 0;}
.ob-gate{max-width:420px;margin:14vh auto;text-align:center;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:36px;}
.ob-gate h1{font-size:20px;margin-bottom:10px;}
.ob-gate p{color:#8080A0;font-size:14px;margin-bottom:18px;}
.ob-pathpick{max-width:640px;margin:8vh auto 0;}
.ob-pathpick h1{font-size:26px;font-weight:800;letter-spacing:-.02em;}
.ob-sub{color:#8080A0;font-size:14.5px;margin:8px 0 22px;line-height:1.6;}
.ob-progress{display:flex;align-items:center;gap:12px;margin-bottom:14px;}
.ob-meterbar{flex:1;height:9px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden;}
.ob-meterbar div{height:100%;background:linear-gradient(90deg,#7C5CFC,#34D399);border-radius:99px;transition:width .4s;}
.ob-pct{font-size:12.5px;font-weight:700;color:#C0C0D0;white-space:nowrap;}
.ob-stages{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;}
.ob-stage{font-family:inherit;font-size:12.5px;font-weight:700;padding:8px 13px;border-radius:99px;border:1px solid rgba(255,255,255,.12);background:none;color:#C0C0D0;cursor:pointer;}
.ob-stage.on{border-color:#7C5CFC;background:rgba(124,92,252,.12);color:#C4B5FD;}
.ob-stage.done{color:#34D399;}
.ob-q{font-size:26px;font-weight:800;letter-spacing:-.02em;margin:0 0 14px;outline:none;}
.ob-msg{background:rgba(124,92,252,.12);border:1px solid rgba(124,92,252,.25);color:#C4B5FD;padding:11px 15px;border-radius:12px;font-size:13.5px;margin-bottom:14px;}
.ob-warn{background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.3);color:#FCD34D;padding:11px 15px;border-radius:12px;font-size:13.5px;margin:12px 0;line-height:1.5;}
.ob-panel{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:22px;margin-bottom:16px;}
.ob-panelhead{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;}
.ob-hint{color:#8080A0;font-size:13.5px;line-height:1.55;margin:0 0 14px;}
.ob-hint a{color:#A78BFA;}
.ob-lblsm{display:block;font-size:12px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#A78BFA;margin-bottom:8px;}
.ob-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:12px;}
@media(max-width:600px){.ob-grid{grid-template-columns:1fr;}}
.ob-field{display:flex;flex-direction:column;gap:6px;font-size:12.5px;font-weight:500;color:#C0C0D0;}
.ob-field input,.ob-field textarea,.ob-field select,.ob-listingpick select{font-family:inherit;font-size:14px;padding:11px 13px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:#0A0A0F;color:#F0F0F5;outline:none;resize:vertical;width:100%;}
.ob-field input:focus,.ob-field textarea:focus,.ob-field select:focus{border-color:#7C5CFC;}
.ob-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin-bottom:8px;}
.ob-cards.two{grid-template-columns:repeat(auto-fill,minmax(240px,1fr));}
.ob-cards.three{grid-template-columns:repeat(auto-fill,minmax(150px,1fr));}
.ob-card{font-family:inherit;text-align:left;display:flex;flex-direction:column;gap:5px;background:#111118;border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:15px;color:#F0F0F5;cursor:pointer;min-height:44px;}
.ob-card b{font-size:14.5px;}
.ob-card span{font-size:12.5px;color:#8080A0;line-height:1.45;}
.ob-card small{font-size:11.5px;color:#606078;}
.ob-card.on{border-color:#7C5CFC;background:rgba(124,92,252,.1);}
.ob-card.sm{padding:12px 14px;}
.ob-card:focus-visible{outline:2px solid #7C5CFC;outline-offset:2px;}
.ob-chipsblock{margin-bottom:18px;}
.ob-chips{display:flex;flex-wrap:wrap;gap:8px;}
.ob-chip{font-family:inherit;font-size:13px;padding:8px 13px;border-radius:99px;border:1px solid rgba(255,255,255,.12);background:none;color:#C0C0D0;cursor:pointer;min-height:36px;}
.ob-chip.on{border-color:#7C5CFC;background:rgba(124,92,252,.14);color:#C4B5FD;}
.ob-chip:focus-visible{outline:2px solid #7C5CFC;outline-offset:2px;}
.ob-chipadd{display:inline-flex;gap:6px;align-items:center;}
.ob-chipadd input{font-family:inherit;font-size:13px;padding:8px 12px;border-radius:99px;border:1px dashed rgba(255,255,255,.2);background:none;color:#F0F0F5;outline:none;width:170px;}
.ob-cb{display:flex;align-items:center;gap:8px;font-size:13.5px;color:#C0C0D0;cursor:pointer;flex-wrap:wrap;}
.ob-cb select{font-family:inherit;font-size:13px;padding:5px 8px;border-radius:8px;border:1px solid rgba(255,255,255,.12);background:#0A0A0F;color:#F0F0F5;}
.ob-cbrow{display:flex;gap:16px;align-items:center;margin-top:8px;flex-wrap:wrap;}
.ob-list{list-style:none;margin:10px 0;padding:0;display:flex;flex-direction:column;gap:8px;}
.ob-list li{display:flex;align-items:center;gap:10px;padding:11px 14px;border:1px solid rgba(255,255,255,.07);border-radius:11px;background:#111118;font-size:14px;flex-wrap:wrap;}
.ob-list b{font-size:14px;}
.ob-list small{color:#8080A0;font-size:12.5px;}
.ob-spacer{flex:1;}
.ob-status{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:3px 8px;border-radius:99px;background:rgba(251,191,36,.1);color:#FBBF24;}
.ob-status.published{background:rgba(52,211,153,.12);color:#34D399;}
.ob-mini{font-family:inherit;background:none;border:1px solid rgba(255,255,255,.12);color:#C0C0D0;font-size:12px;border-radius:8px;padding:6px 10px;cursor:pointer;text-decoration:none;}
.ob-mini:hover{border-color:#A78BFA;color:#C4B5FD;}
.ob-addrow{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:10px;}
.ob-btn{font-family:inherit;font-size:14px;font-weight:700;padding:12px 20px;border-radius:11px;border:none;background:#7C5CFC;color:#fff;cursor:pointer;min-height:44px;text-decoration:none;display:inline-flex;align-items:center;}
.ob-btn:hover{background:#6344DF;}.ob-btn:disabled{opacity:.5;cursor:default;}
.ob-btn.sm{padding:9px 14px;font-size:13px;min-height:38px;}
.ob-btn.ghost{background:none;border:1px solid rgba(124,92,252,.5);color:#C4B5FD;}
.ob-ai{border:1.5px dashed rgba(124,92,252,.35);background:rgba(124,92,252,.06);border-radius:14px;padding:14px;margin-bottom:16px;}
.ob-airow{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:start;}
@media(max-width:600px){.ob-airow{grid-template-columns:1fr;}}
.ob-airow textarea{font-family:inherit;font-size:13.5px;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:#0A0A0F;color:#F0F0F5;outline:none;resize:vertical;}
.ob-pricecard{border:1px solid rgba(255,255,255,.08);border-radius:13px;background:#111118;padding:15px;margin-bottom:12px;}
.ob-more{margin-top:10px;border-top:1px dashed rgba(255,255,255,.08);padding-top:10px;}
.ob-more summary{cursor:pointer;font-size:13px;font-weight:600;color:#A78BFA;margin-bottom:10px;}
.ob-linepreview{margin-top:10px;font-size:13px;color:#8080A0;}
.ob-linepreview b{color:#34D399;}
.ob-tiers{margin-top:12px;border-top:1px dashed rgba(255,255,255,.08);padding-top:10px;}
.ob-tierrow{display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:8px;margin-bottom:8px;}
.ob-tierrow input{font-family:inherit;font-size:13px;padding:9px 11px;border-radius:9px;border:1px solid rgba(255,255,255,.1);background:#0A0A0F;color:#F0F0F5;outline:none;width:100%;}
.ob-tierrow input:focus{border-color:#7C5CFC;}
@media(max-width:600px){.ob-tierrow{grid-template-columns:1fr 1fr;}}
.ob-tierlist{margin:2px 0 0;padding-left:18px;color:#8080A0;font-size:12.5px;line-height:1.6;}
.ob-specs{margin-top:14px;border-top:1px dashed rgba(255,255,255,.08);padding-top:12px;}
.ob-customspec{display:grid;grid-template-columns:1fr 1.4fr auto;gap:8px;margin-bottom:8px;}
.ob-customspec input{font-family:inherit;font-size:13px;padding:9px 11px;border-radius:9px;border:1px solid rgba(255,255,255,.1);background:#0A0A0F;color:#F0F0F5;outline:none;width:100%;}
.ob-customspec input:focus{border-color:#7C5CFC;}
.ob-listingpick{display:flex;gap:12px;align-items:center;margin-bottom:14px;}
.ob-listingpick .ob-lblsm{margin:0;white-space:nowrap;}
.ob-listingpick select{max-width:340px;}
.ob-preview{margin-top:18px;border-top:1px solid rgba(255,255,255,.08);padding-top:16px;}
.ob-buyerprev{background:#0E0E16;border:1px solid rgba(255,255,255,.1);border-radius:13px;padding:16px;margin:10px 0 14px;}
.ob-buyerprev b{font-size:15px;}
.ob-buyerprev ul{margin:6px 0 0;padding-left:18px;color:#C0C0D0;font-size:13.5px;line-height:1.6;}
.ob-priceline{margin:7px 0 0;font-size:14px;color:#C0C0D0;}
.ob-priceline b{color:#34D399;}
.ob-quoteonly{margin:7px 0 0;font-size:14px;color:#C4B5FD;font-weight:700;}
.ob-estnote{margin:10px 0 0;font-size:12px;color:#606078;}
.ob-summary{background:rgba(52,211,153,.06);border:1px solid rgba(52,211,153,.25);border-radius:13px;padding:16px;margin-top:6px;}
.ob-summary p{margin:0 0 8px;font-size:14.5px;line-height:1.6;color:#D1FAE5;}
.ob-terms{border:1px solid rgba(251,191,36,.3);background:rgba(251,191,36,.05);border-radius:13px;padding:16px;margin:14px 0;}
.ob-terms ul{margin:8px 0;padding-left:18px;color:#C0C0D0;font-size:13px;line-height:1.6;}
.ob-prevcard{display:flex;gap:14px;background:#0E0E16;border:1px solid rgba(255,255,255,.08);border-radius:13px;padding:12px;margin:12px 0;}
.ob-previmg{width:110px;height:74px;border-radius:9px;overflow:hidden;background:#1A1A28;display:grid;place-items:center;color:#505068;font-size:11px;flex-shrink:0;}
.ob-previmg img{width:100%;height:100%;object-fit:cover;}
.ob-prevbody{display:flex;flex-direction:column;gap:4px;}
.ob-prevbody b{font-size:15px;}
.ob-prevbody small{color:#8080A0;font-size:12.5px;}
.ob-cardprice{font-style:normal;font-size:13px;color:#34D399;font-weight:700;}
.ob-prevbody em:last-child{font-style:normal;font-size:12.5px;color:#A78BFA;font-weight:700;}
.ob-acc{margin:14px 0 4px;font-size:13.5px;line-height:1.5;align-items:flex-start;}
.ob-acc input{margin-top:3px;}
.ob-donebox{background:rgba(52,211,153,.08);border:1px solid rgba(52,211,153,.3);border-radius:14px;padding:20px;}
.ob-donebox b{font-size:17px;}
.ob-donebox p{color:#A7F3D0;font-size:14px;margin:8px 0 4px;line-height:1.6;}
.ob-nav{position:fixed;left:0;right:0;bottom:0;display:flex;gap:12px;align-items:center;justify-content:space-between;padding:12px 20px;background:rgba(10,10,15,.95);backdrop-filter:blur(20px);border-top:1px solid rgba(255,255,255,.08);z-index:30;}
.ob-nav .ob-btn{min-width:130px;justify-content:center;}
.ob-later{color:#8080A0;font-size:13px;text-decoration:none;}
.ob-later:hover{color:#C4B5FD;}
@media(min-width:820px){.ob-nav{position:sticky;margin-top:26px;border-radius:14px;border:1px solid rgba(255,255,255,.08);}}
`;
