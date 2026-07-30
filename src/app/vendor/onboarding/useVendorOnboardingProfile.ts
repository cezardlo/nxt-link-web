'use client';

// Data + autosave layer for the vendor onboarding card flow (v2).
//
// This intentionally mirrors src/app/vendor/portal/page.tsx's `persist()` /
// autosave `useEffect` field-for-field (same endpoint, same payload shape,
// same 1200ms debounce, same "skip the very first render" guard) — the spec
// for this flow requires reusing the existing autosave mechanism rather than
// forking a second save path. It's a separate copy (not an import) only
// because those functions are private to the portal page component and the
// portal page must stay untouched; the two must be kept in sync if
// PATCH /api/vendor/profile's contract ever changes.
//
// v2 extends the original (Slice S1) hook with the read-only Trust & Proof
// counts (certifications, gallery photos, case studies, videos, listings) and
// the vendor-agreement acceptance mechanism the Agreement & Activation
// section needs — every one of these calls the SAME endpoints the portal
// page already uses (GET/POST /api/vendor/agreement, GET /api/vendor/
// certifications, GET /api/vendor/gallery, GET /api/vendor/listings, POST/
// DELETE /api/vendor/videos). No new endpoints, no schema changes.

import { useCallback, useEffect, useRef, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser-auth';

export interface OnboardingVendor {
  id: string;
  public_ref: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  city: string | null;
  categories: string[];
  service_areas: string[];
  industries: string[];
  client_types: string[];
  achievements?: string[];
  tagline?: string | null;
  description: string | null;
  status: string;
  moderation_status?: string;
  suspended_until?: string | null;
  moderation_reason?: string | null;
}

export interface OnboardingCertification { id: string; name: string; issuer: string | null }
export interface OnboardingPhoto { id: string; caption: string | null; image_url: string | null }
export interface OnboardingCaseStudy { id: string; title: string }
export interface OnboardingVideo { id: string; title: string | null; url: string; embed_url: string; provider: string }
export interface OnboardingAgreement {
  accepted: boolean;
  summary: string;
  terms: { title: string; body: string }[];
  accepted_at: string | null;
}

export type VendorListKey = 'categories' | 'service_areas' | 'industries' | 'client_types';

export function useVendorOnboardingProfile() {
  const [checking, setChecking] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [vendor, setVendor] = useState<OnboardingVendor | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [catFam, setCatFam] = useState<Record<string, string>>({});
  const [savedAt, setSavedAt] = useState('');
  const [autosaving, setAutosaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const firstEdit = useRef(true);

  // Trust & Proof (read-only summaries + the lightweight video CRUD).
  const [certifications, setCertifications] = useState<OnboardingCertification[]>([]);
  const [photos, setPhotos] = useState<OnboardingPhoto[]>([]);
  const [caseStudies, setCaseStudies] = useState<OnboardingCaseStudy[]>([]);
  const [videos, setVideos] = useState<OnboardingVideo[]>([]);
  const [videoBusy, setVideoBusy] = useState(false);
  const [listingCount, setListingCount] = useState(0);

  // Agreement & Activation.
  const [agreement, setAgreement] = useState<OnboardingAgreement | null>(null);
  const [agreementBusy, setAgreementBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch('/api/vendor/profile');
    if (res.status === 401) { setSignedIn(false); setChecking(false); return; }
    const data = await res.json();
    setVendor(data.vendor || null);
    setLogoUrl(data.logo_url || null);
    setCaseStudies(data.case_studies || []);
    setVideos(data.videos || []);

    const [cats, certs, gallery, listings, ag] = await Promise.all([
      fetch('/api/marketplace/categories').then((r) => r.json()).catch(() => null),
      fetch('/api/vendor/certifications').then((r) => r.json()).catch(() => null),
      fetch('/api/vendor/gallery').then((r) => r.json()).catch(() => null),
      fetch('/api/vendor/listings').then((r) => r.json()).catch(() => null),
      fetch('/api/vendor/agreement').then((r) => r.json()).catch(() => null),
    ]);
    if (cats?.ok) {
      const fam: Record<string, string> = {};
      for (const d of (cats.departments || [])) {
        for (const it of (d.items || [])) {
          if (it.label_en) fam[it.label_en] = it.family || '';
          if (it.label_es) fam[it.label_es] = it.family || '';
        }
      }
      setCatFam(fam);
    }
    if (certs?.ok) setCertifications(certs.certifications || []);
    if (gallery?.ok) setPhotos(gallery.photos || []);
    if (listings?.ok) setListingCount((listings.products?.length || 0) + (listings.services?.length || 0));
    if (ag?.ok) setAgreement({ accepted: ag.accepted, summary: ag.summary, terms: ag.terms, accepted_at: ag.accepted_at });

    setSignedIn(true);
    setChecking(false);
  }, []);

  function set<K extends keyof OnboardingVendor>(k: K, v: OnboardingVendor[K]) {
    setVendor((prev) => (prev ? { ...prev, [k]: v } : prev));
  }
  function toggle(list: string[], v: string, key: VendorListKey) {
    if (!vendor) return;
    const next = list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
    set(key, next);
  }

  const persist = useCallback(async (silent: boolean) => {
    if (!vendor) return;
    if (silent) setAutosaving(true);
    const res = await fetch('/api/vendor/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_name: vendor.company_name, contact_name: vendor.contact_name, phone: vendor.phone,
        website: vendor.website, city: vendor.city, description: vendor.description,
        tagline: vendor.tagline || '',
        categories: vendor.categories, service_areas: vendor.service_areas,
        industries: vendor.industries, client_types: vendor.client_types,
        achievements: vendor.achievements || [],
      }),
    });
    const data = await res.json().catch(() => ({ ok: false }));
    if (data.ok) {
      setSavedAt(new Date().toISOString());
      setSaveError(false);
    } else {
      setSaveError(true);
    }
    if (silent) setAutosaving(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendor]);

  // Auto-save: quietly persist field edits ~1.2s after the vendor stops
  // typing/toggling, so nothing is lost if they close the tab or swipe to the
  // next card. Skips the initial load (same guard as the portal page).
  useEffect(() => {
    if (!vendor) return;
    if (firstEdit.current) { firstEdit.current = false; return; }
    const t = setTimeout(() => { persist(true); }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendor?.company_name, vendor?.contact_name, vendor?.phone, vendor?.website, vendor?.city,
    vendor?.description, vendor?.tagline,
    JSON.stringify(vendor?.categories), JSON.stringify(vendor?.service_areas),
    JSON.stringify(vendor?.industries), JSON.stringify(vendor?.client_types),
    JSON.stringify(vendor?.achievements)]);

  async function uploadLogo(file: File) {
    setLogoBusy(true);
    const fd = new FormData(); fd.append('file', file);
    const res = await fetch('/api/vendor/logo', { method: 'POST', body: fd });
    const data = await res.json().catch(() => ({ ok: false }));
    if (data.ok) setLogoUrl(data.logo_url || null);
    setLogoBusy(false);
    return !!data.ok;
  }
  async function removeLogo() {
    setLogoUrl(null);
    await fetch('/api/vendor/logo', { method: 'DELETE' }).catch(() => {});
  }

  // Videos have no file upload (just a pasted link), so — unlike
  // certifications/case studies/photos — this flow embeds full add/remove
  // inline instead of deep-linking to the portal.
  async function addVideo(title: string, url: string) {
    if (!url.trim()) return false;
    setVideoBusy(true);
    const res = await fetch('/api/vendor/videos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, url }),
    });
    const data = await res.json().catch(() => ({ ok: false }));
    if (data.ok) setVideos((v) => [data.video, ...v]);
    setVideoBusy(false);
    return !!data.ok;
  }
  async function removeVideo(id: string) {
    setVideos((v) => v.filter((x) => x.id !== id));
    await fetch(`/api/vendor/videos?id=${id}`, { method: 'DELETE' }).catch(() => {});
  }

  // Records the SAME click-wrap acceptance the portal page's "I accept the
  // NXT//LINK vendor terms" button records (POST /api/vendor/agreement ->
  // vendor_profiles.terms_accepted_version = VENDOR_TERMS_VERSION). This flow
  // never re-implements or alters that record — only presents it differently.
  async function acceptTerms() {
    setAgreementBusy(true);
    const res = await fetch('/api/vendor/agreement', { method: 'POST' });
    const data = await res.json().catch(() => ({ ok: false }));
    if (data.ok) {
      setAgreement((a) => (a ? { ...a, accepted: true, accepted_at: new Date().toISOString() } : a));
    }
    setAgreementBusy(false);
    return !!data.ok;
  }

  // Same gate as the portal page: check the Supabase session client-side
  // before hitting the profile API, so a signed-out visitor gets the sign-in
  // gate instantly instead of a network round trip first.
  useEffect(() => {
    const sb = createBrowserSupabaseClient();
    sb.auth.getSession().then(({ data }) => { if (data.session) load(); else setChecking(false); });
  }, [load]);

  const softwareOnly = !!vendor && (vendor.categories || []).length > 0
    && (vendor.categories || []).every((c) => catFam[c] === 'technology');

  const proofCount = certifications.length + photos.length + caseStudies.length + videos.length
    + (vendor?.achievements || []).length;

  return {
    checking, signedIn, vendor, set, toggle,
    persist, autosaving, savedAt, saveError,
    logoUrl, logoBusy, uploadLogo, removeLogo,
    softwareOnly,
    certifications, photos, caseStudies, videos, videoBusy, addVideo, removeVideo,
    listingCount, proofCount,
    agreement, agreementBusy, acceptTerms,
    reload: load,
  };
}
