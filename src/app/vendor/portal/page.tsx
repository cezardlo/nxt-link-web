'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser-auth';
import ChatWidget from '@/components/ChatWidget';
import CategoryPicker from '@/components/CategoryPicker';
import LanguageToggle, { useLang } from '@/components/LanguageToggle';
import ProfileStrengthMeter, { computeProfileStrength } from '@/components/ProfileStrengthMeter';
import VendorNav from '@/components/VendorNav';

const AREAS = ['El Paso', 'Juárez', 'New Mexico', 'West Texas', 'Cross-border', 'National'];
const INDUSTRIES = [
  'Warehousing & 3PL', 'Manufacturing', 'Retail & E-commerce', 'Food & Beverage', 'Automotive',
  'Cold Chain', 'Import / Export & Customs', 'Construction', 'Distribution Centers',
  'Pharma & Healthcare', 'Aerospace & Defense', 'General Industrial',
];
const CLIENT_TYPES = [
  'Small warehouses (<50k sqft)', 'Mid-size warehouses', 'Large distribution centers',
  'Manufacturers', '3PL providers', 'Retailers', 'Cross-border operations', 'Startups',
];
// Client company size — stored alongside client_types so no schema change is
// needed and it shows on the public storefront's "Clients" facts.
const CLIENT_SIZES = [
  'Small businesses (1–50 people)', 'Mid-size companies (51–500)', 'Large companies (500+)', 'Enterprise / Fortune 500',
];

type Lang = 'en' | 'es';
// First-pass bilingual strings for the vendor onboarding flow (EN/ES toggle).
const TR: Record<string, { en: string; es: string }> = {
  nav_listings: { en: 'Listings', es: 'Listados' },
  nav_leads: { en: 'Leads', es: 'Prospectos' },
  nav_deals: { en: 'Deals', es: 'Tratos' },
  nav_store: { en: 'My storefront', es: 'Mi tienda' },
  nav_account: { en: 'Account', es: 'Cuenta' },
  signout: { en: 'Sign out', es: 'Cerrar sesión' },
  confirm_remove_media: { en: 'Remove this? This can’t be undone.', es: '¿Quitar esto? No se puede deshacer.' },
  title_welcome: { en: 'Welcome{name} — let’s build your profile', es: 'Bienvenido{name} — construyamos tu perfil' },
  title_done: { en: 'Your company profile', es: 'Tu perfil de empresa' },
  sub: { en: 'This is what buyers see and what NXT//LINK matches you to. Fill it in once; keep it current.', es: 'Esto es lo que ven los compradores y con lo que NXT//LINK te conecta. Complétalo una vez y mantenlo al día.' },
  vprop: { en: '🤝 NXT//LINK doesn’t just list you — we put you directly in front of buyers who are ready to purchase, and we can help coordinate the deal, quotes, and cross-border logistics across the El Paso–Juárez region whenever you want a hand.', es: '🤝 NXT//LINK no solo te publica — te ponemos frente a compradores listos para comprar, y podemos ayudarte a coordinar el trato, las cotizaciones y la logística transfronteriza en la región El Paso–Juárez cuando lo necesites.' },
  preview: { en: '👁 View as a buyer', es: '👁 Ver como comprador' },
  saving: { en: 'Saving…', es: 'Guardando…' },
  saved: { en: '✓ Saved', es: '✓ Guardado' },
  autosave: { en: 'Auto-saves as you type', es: 'Se guarda solo mientras escribes' },
  live: { en: '🎉 Your profile is complete and buyer-ready.', es: '🎉 Tu perfil está completo y listo para compradores.' },
  rv_title: { en: 'You’re in — your storefront is in review', es: 'Ya estás dentro — tu tienda está en revisión' },
  rv_body: { en: 'A human on our team reviews every new company. While that happens you can do everything below — nothing you build is lost, and your listings go live the moment you’re approved.', es: 'Una persona de nuestro equipo revisa cada empresa nueva. Mientras tanto puedes hacer todo lo de abajo — nada de lo que construyas se pierde, y tus publicaciones salen en vivo en cuanto te aprueben.' },
  rv_now_1: { en: 'Build your profile and storefront', es: 'Construye tu perfil y tu tienda' },
  rv_now_2: { en: 'Create listings as drafts', es: 'Crea publicaciones como borradores' },
  rv_now_3: { en: 'Add photos, certifications, and proof', es: 'Agrega fotos, certificaciones y pruebas' },
  rv_cta: { en: 'Speed it up — finish your review application (2 min) →', es: 'Acelera la revisión — completa tu solicitud (2 min) →' },
  rv_cta_hint: { en: 'We pre-filled it with what you already told us — never twice.', es: 'Ya la prellenamos con lo que nos dijiste — nunca dos veces.' },
  live_link: { en: 'See how buyers see it →', es: 'Mira cómo lo ven los compradores →' },
  cx_start: { en: '✦ Set up with NXT AI — answer 2 questions, I’ll draft it all', es: '✦ Configura con NXT AI — responde 2 preguntas y lo redacto todo' },
  cx_title: { en: '✦ NXT AI · Set up your profile', es: '✦ NXT AI · Configura tu perfil' },
  cx_p1: { en: 'Answer two quick things and I’ll draft your whole profile — you can edit anything after.', es: 'Responde dos cosas rápidas y redacto tu perfil completo — puedes editar todo después.' },
  cx_name_q: { en: 'Your company name', es: 'El nombre de tu empresa' },
  cx_do_q: { en: 'In one sentence, what do you do?', es: 'En una frase, ¿qué haces?' },
  cx_draft_btn: { en: 'Draft my profile →', es: 'Redactar mi perfil →' },
  cx_drafting: { en: 'Drafting…', es: 'Redactando…' },
  cx_p2: { en: 'Here’s what I drafted. Use it as a starting point — edit anything after.', es: 'Esto es lo que redacté. Úsalo como punto de partida — edita lo que quieras.' },
  cx_use: { en: 'Use this — set up my profile', es: 'Usar esto — configurar mi perfil' },
  cx_setting: { en: 'Setting up…', es: 'Configurando…' },
  cx_retry: { en: 'Try again', es: 'Intentar de nuevo' },
  sec_company: { en: 'Company', es: 'Empresa' },
  sec_industry: { en: 'Industries your clients are in', es: 'Industrias de tus clientes' },
  sec_industry_hint: { en: 'Buyers filter by their own industry — pick every industry you serve.', es: 'Los compradores filtran por su industria — elige todas las que atiendes.' },
  sec_clientsize: { en: 'What size companies do you serve?', es: '¿De qué tamaño son las empresas que atiendes?' },
  sec_clientsize_hint: { en: 'Small, mid-size, large, or enterprise — helps NXT//LINK match you to the right buyers.', es: 'Pequeñas, medianas, grandes o corporativas — ayuda a NXT//LINK a conectarte con los compradores correctos.' },
  sec_clients: { en: 'Clients you’re looking for', es: 'Clientes que buscas' },
  sec_products: { en: 'Products / services you sell', es: 'Productos / servicios que vendes' },
  sec_areas: { en: 'Service areas', es: 'Zonas de servicio' },
  areas_hint: { en: 'where you install / serve', es: 'dónde instalas / atiendes' },
  software_note: { en: '💻 You sell software — no install site or service region needed, so we skip that. NXT//LINK reaches buyers across the whole Borderplex for you.', es: '💻 Vendes software — no se necesita sitio de instalación ni zona de servicio, así que lo omitimos. NXT//LINK llega a compradores en todo el Borderplex por ti.' },
  sec_awards: { en: 'Awards & recognitions', es: 'Premios y reconocimientos' },
  sec_cases: { en: 'Case studies', es: 'Casos de éxito' },
  sec_certs: { en: 'Certifications', es: 'Certificaciones' },
  sec_gallery: { en: 'Photo gallery', es: 'Galería de fotos' },
  sec_videos: { en: 'Showcase videos', es: 'Videos de tu trabajo' },
  sec_brochures: { en: 'Brochures & documents', es: 'Folletos y documentos' },
  f_company: { en: 'Company name', es: 'Nombre de la empresa' },
  f_contact: { en: 'Contact name', es: 'Nombre de contacto' },
  f_website: { en: 'Website', es: 'Sitio web' },
  f_city: { en: 'City', es: 'Ciudad' },
  f_about: { en: 'About your company', es: 'Acerca de tu empresa' },
  write_me: { en: '✨ Write it for me', es: '✨ Escríbelo por mí' },
  writing: { en: 'Writing…', es: 'Escribiendo…' },
  save_profile: { en: 'Save profile', es: 'Guardar perfil' },
  saving_btn: { en: 'Saving…', es: 'Guardando…' },
};

interface Vendor {
  id: string; public_ref: string; company_name: string; contact_name: string | null;
  email: string | null; phone: string | null; website: string | null; city: string | null;
  categories: string[]; service_areas: string[]; industries: string[]; client_types: string[];
  achievements?: string[]; tagline?: string | null;
  description: string | null; status: string;
  moderation_status?: string; suspended_until?: string | null; moderation_reason?: string | null;
}
interface Brochure { id: string; file_name: string; title: string; size_bytes: number; public_url: string | null }
interface Video { id: string; title: string | null; url: string; embed_url: string; provider: string }
interface CaseStudy { id: string; title: string; challenge: string | null; solution: string | null; result: string | null; sort_order: number }
interface Cert { id: string; name: string; issuer: string | null; credential: string | null; issued_on: string | null; expires_on: string | null; image_url?: string | null }
interface Photo { id: string; caption: string | null; image_url: string | null }
interface Draft {
  company_name: string | null; description: string | null; categories: string[];
  service_areas: string[]; industries: string[]; client_types: string[];
  website: string | null; phone: string | null; city: string | null; summary: string;
}

export default function VendorPortalPage() {
  const [checking, setChecking] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [brochures, setBrochures] = useState<Brochure[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [extractingId, setExtractingId] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftSource, setDraftSource] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [bannerBusy, setBannerBusy] = useState(false);
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([]);
  const [cs, setCs] = useState({ title: '', challenge: '', solution: '', result: '' });
  const [csBusy, setCsBusy] = useState(false);
  const [agreement, setAgreement] = useState<{ accepted: boolean; summary: string; terms: { title: string; body: string }[]; accepted_at: string | null } | null>(null);
  const [agBusy, setAgBusy] = useState(false);
  const [certs, setCerts] = useState<Cert[]>([]);
  const [certForm, setCertForm] = useState({ name: '', issuer: '', credential: '', issued_on: '', expires_on: '' });
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certBusy, setCertBusy] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photoCaption, setPhotoCaption] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [listingCount, setListingCount] = useState(0);
  const [catFam, setCatFam] = useState<Record<string, string>>({});
  const [savedAt, setSavedAt] = useState('');
  const [autosaving, setAutosaving] = useState(false);
  const [genBusy, setGenBusy] = useState(false);
  const firstEdit = useRef(true);
  const [cxOpen, setCxOpen] = useState(false);
  const [cxName, setCxName] = useState('');
  const [cxSummary, setCxSummary] = useState('');
  const [cxBusy, setCxBusy] = useState(false);
  const [cxDraft, setCxDraft] = useState<{ description: string; tagline: string; categories: string[]; offerings: Array<{ kind: 'product' | 'service'; name: string; category: string }> } | null>(null);
  // Shared language state — the one LanguageToggle + `nxt_lang` key app-wide.
  const [lang, switchLang] = useLang('en');
  const t = (k: string) => (TR[k] ? (lang === 'es' ? TR[k].es : TR[k].en) : k);

  const load = useCallback(async () => {
    const res = await fetch('/api/vendor/profile');
    if (res.status === 401) { setSignedIn(false); setChecking(false); return; }
    const data = await res.json();
    setVendor(data.vendor); setBrochures(data.brochures || []); setVideos(data.videos || []);
    setCaseStudies(data.case_studies || []); setLogoUrl(data.logo_url || null);
    setBannerUrl(data.banner_url || null);
    const ag = await fetch('/api/vendor/agreement').then((r) => r.json()).catch(() => null);
    if (ag?.ok) setAgreement(ag);
    const [ce, ga, li, cats] = await Promise.all([
      fetch('/api/vendor/certifications').then((r) => r.json()).catch(() => null),
      fetch('/api/vendor/gallery').then((r) => r.json()).catch(() => null),
      fetch('/api/vendor/listings').then((r) => r.json()).catch(() => null),
      fetch('/api/marketplace/categories').then((r) => r.json()).catch(() => null),
    ]);
    if (ce?.ok) setCerts(ce.certifications || []);
    if (ga?.ok) setPhotos(ga.photos || []);
    if (li?.ok) setListingCount((li.products?.length || 0) + (li.services?.length || 0));
    // Map each category label → family so we can tell software/tech (delivered
    // digitally, no install site or service region) from physical offerings.
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
    setSignedIn(true); setChecking(false);
  }, []);

  useEffect(() => {
    const sb = createBrowserSupabaseClient();
    sb.auth.getSession().then(({ data }) => { if (data.session) load(); else setChecking(false); });
  }, [load]);

  function set<K extends keyof Vendor>(k: K, v: Vendor[K]) { setVendor((prev) => (prev ? { ...prev, [k]: v } : prev)); }
  function toggle(list: string[], v: string, key: 'categories' | 'service_areas' | 'industries' | 'client_types') {
    if (!vendor) return;
    const next = list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
    set(key, next);
  }

  async function persist(silent: boolean) {
    if (!vendor) return;
    if (silent) setAutosaving(true); else { setSaving(true); setMsg(''); }
    const res = await fetch('/api/vendor/profile', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
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
    if (data.ok) setSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    if (silent) setAutosaving(false);
    else { setMsg(data.ok ? 'Saved.' : (data.message || 'Could not save')); setSaving(false); }
  }
  const save = () => persist(false);

  // Auto-save: quietly persist profile-field edits ~1.2s after the vendor stops
  // typing, so nothing is lost if they close the tab. Skips the initial load.
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

  // AI: draft a company description from what we already know. Vendor edits/keeps it.
  async function generateDescription() {
    if (!vendor) return;
    setGenBusy(true); setMsg('');
    try {
      const res = await fetch('/api/vendor/profile/describe', { method: 'POST' });
      const data = await res.json();
      if (data.ok && data.description) { set('description', data.description); setMsg('Draft description added — edit it to sound like you, then it auto-saves.'); }
      else setMsg(data.message || 'Could not draft a description');
    } catch { setMsg('Could not draft a description'); }
    setGenBusy(false);
  }

  // NXT AI Onboarding Concierge: name + one sentence → full profile draft.
  function openConcierge() {
    setCxName(vendor && vendor.company_name !== 'New company' ? vendor.company_name : '');
    setCxSummary(''); setCxDraft(null); setCxOpen(true);
  }
  async function runConcierge() {
    const summary = cxSummary.trim(); if (!summary || cxBusy) return;
    setCxBusy(true);
    try {
      const r = await fetch('/api/vendor/onboard/concierge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ company_name: cxName.trim(), summary }) });
      const j = await r.json();
      if (j.ok) setCxDraft({ description: j.description, tagline: j.tagline, categories: j.categories || [], offerings: j.offerings || [] });
      else setMsg(j.message || 'NXT AI could not draft that — try adding a bit more detail.');
    } catch { setMsg('NXT AI could not draft that — try again.'); }
    setCxBusy(false);
  }
  async function applyConcierge() {
    if (!vendor || !cxDraft) return;
    setCxBusy(true);
    const merge = (a: string[], b: string[]) => Array.from(new Set([...(a || []), ...b]));
    const nextName = cxName.trim() && vendor.company_name === 'New company' ? cxName.trim() : vendor.company_name;
    const updated = { ...vendor, company_name: nextName, description: cxDraft.description, tagline: cxDraft.tagline, categories: merge(vendor.categories, cxDraft.categories) };
    setVendor(updated);
    await fetch('/api/vendor/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_name: updated.company_name, tagline: updated.tagline, description: updated.description, categories: updated.categories }) }).catch(() => {});
    setSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    for (const o of cxDraft.offerings) {
      await fetch('/api/vendor/listings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: o.kind, name: o.name, category: o.category }) }).catch(() => {});
    }
    firstEdit.current = true; // don't let the apply trigger a redundant autosave
    setCxBusy(false); setCxOpen(false); setCxDraft(null);
    setMsg('✦ NXT AI set up your profile. Review each section, add your logo, then add prices to your offerings to go live.');
    load();
  }

  async function addVideo() {
    if (!videoUrl.trim()) return;
    const res = await fetch('/api/vendor/videos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: videoTitle, url: videoUrl }) });
    const data = await res.json();
    if (data.ok) { setVideos((v) => [data.video, ...v]); setVideoUrl(''); setVideoTitle(''); }
    else setMsg(data.message || 'Could not add video');
  }
  async function removeVideo(id: string) {
    if (!confirm(t('confirm_remove_media'))) return;
    await fetch(`/api/vendor/videos?id=${id}`, { method: 'DELETE' });
    setVideos((v) => v.filter((x) => x.id !== id));
  }

  async function uploadLogo(file: File) {
    setLogoBusy(true); setMsg('');
    const fd = new FormData(); fd.append('file', file);
    const res = await fetch('/api/vendor/logo', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.ok) setLogoUrl(data.logo_url || null); else setMsg(data.message || 'Logo upload failed');
    setLogoBusy(false);
  }
  async function removeLogo() {
    if (!confirm(t('confirm_remove_media'))) return;
    setLogoUrl(null);
    await fetch('/api/vendor/logo', { method: 'DELETE' });
  }
  async function uploadBanner(file: File) {
    setBannerBusy(true); setMsg('');
    const fd = new FormData(); fd.append('file', file);
    const res = await fetch('/api/vendor/banner', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.ok) setBannerUrl(data.banner_url || null); else setMsg(data.message || 'Banner upload failed');
    setBannerBusy(false);
  }
  async function removeBanner() {
    if (!confirm(t('confirm_remove_media'))) return;
    setBannerUrl(null);
    await fetch('/api/vendor/banner', { method: 'DELETE' });
  }
  async function addCaseStudy() {
    if (!cs.title.trim()) { setMsg('Give the case study a title first.'); return; }
    setCsBusy(true); setMsg('');
    const res = await fetch('/api/vendor/case-studies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cs) });
    const data = await res.json();
    if (data.ok) { setCaseStudies((c) => [...c, data.case_study]); setCs({ title: '', challenge: '', solution: '', result: '' }); }
    else setMsg(data.message || 'Could not add case study');
    setCsBusy(false);
  }
  async function removeCaseStudy(id: string) {
    setCaseStudies((c) => c.filter((x) => x.id !== id));
    await fetch(`/api/vendor/case-studies?id=${id}`, { method: 'DELETE' });
  }
  async function addCert() {
    if (!certForm.name.trim()) { setMsg('Give the certification a name first.'); return; }
    setCertBusy(true); setMsg('');
    const fd = new FormData();
    Object.entries(certForm).forEach(([k, v]) => fd.append(k, v));
    if (certFile) fd.append('file', certFile);
    const res = await fetch('/api/vendor/certifications', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.ok) {
      setCerts((c) => [...c, data.certification]);
      setCertForm({ name: '', issuer: '', credential: '', issued_on: '', expires_on: '' });
      setCertFile(null);
    } else setMsg(data.message || 'Could not add certification');
    setCertBusy(false);
  }
  async function removeCert(id: string) {
    setCerts((c) => c.filter((x) => x.id !== id));
    await fetch(`/api/vendor/certifications?id=${id}`, { method: 'DELETE' });
  }
  async function addPhoto(file: File) {
    setPhotoBusy(true); setMsg('');
    const fd = new FormData(); fd.append('file', file); fd.append('caption', photoCaption);
    const res = await fetch('/api/vendor/gallery', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.ok) { setPhotos((p) => [...p, data.photo]); setPhotoCaption(''); }
    else setMsg(data.message || 'Could not add photo');
    setPhotoBusy(false);
  }
  async function removePhoto(id: string) {
    if (!confirm(t('confirm_remove_media'))) return;
    setPhotos((p) => p.filter((x) => x.id !== id));
    await fetch(`/api/vendor/gallery?id=${id}`, { method: 'DELETE' });
  }

  async function acceptTerms() {
    setAgBusy(true); setMsg('');
    const res = await fetch('/api/vendor/agreement', { method: 'POST' });
    const data = await res.json();
    if (data.ok) setAgreement((a) => (a ? { ...a, accepted: true, accepted_at: new Date().toISOString() } : a));
    else setMsg(data.message || 'Could not record acceptance');
    setAgBusy(false);
  }

  async function uploadFile(file: File) {
    const fd = new FormData(); fd.append('file', file);
    const res = await fetch('/api/vendor/brochures', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.ok && data.brochure) setBrochures((b) => [data.brochure, ...b]);
    else setMsg(data.message || 'Upload failed');
  }
  async function removeBrochure(id: string) {
    if (!confirm(t('confirm_remove_media'))) return;
    await fetch(`/api/vendor/brochures?id=${id}`, { method: 'DELETE' });
    setBrochures((b) => b.filter((x) => x.id !== id));
  }
  async function extractFromBrochure(id: string) {
    setExtractingId(id); setMsg('');
    try {
      const res = await fetch('/api/vendor/profile/extract', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ brochure_id: id }) });
      const data = await res.json();
      if (data.ok) { setDraft(data.draft); setDraftSource(data.source_file || ''); }
      else setMsg(data.message || 'Could not read that file');
    } catch { setMsg('Could not read that file'); }
    setExtractingId('');
  }
  function applyDraft() {
    if (!vendor || !draft) return;
    const merge = (a: string[], b: string[]) => Array.from(new Set([...(a || []), ...b]));
    setVendor({
      ...vendor,
      company_name: draft.company_name || vendor.company_name,
      description: draft.description || vendor.description,
      website: draft.website || vendor.website,
      phone: draft.phone || vendor.phone,
      city: draft.city || vendor.city,
      categories: merge(vendor.categories, draft.categories),
      service_areas: merge(vendor.service_areas, draft.service_areas),
      industries: merge(vendor.industries, draft.industries),
      client_types: merge(vendor.client_types, draft.client_types),
    });
    setDraft(null);
    setMsg('Draft applied — review the fields above, then press "Save profile" to confirm.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  if (checking) return <div className="vp"><style dangerouslySetInnerHTML={{ __html: CSS }} /><div className="vp-loading">Loading…</div></div>;

  if (!signedIn) {
    return (
      <div className="vp"><style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div className="vp-gate">
          <h1>Sign in to manage your profile</h1>
          <p>Create or access your vendor account to edit your company profile, brochures, and videos.</p>
          <a className="vp-btn" href="/vendor-login">Go to sign in →</a>
        </div>
      </div>
    );
  }

  if (!vendor) return null;

  // Suspended or banned — don't lock them out (they may need to dispute it),
  // but replace the editor with a clear "under review" screen.
  if (vendor.moderation_status === 'suspended' || vendor.moderation_status === 'banned') {
    const banned = vendor.moderation_status === 'banned';
    return (
      <div className="vp"><style dangerouslySetInnerHTML={{ __html: CSS }} />
        <VendorNav active="portal" />
        <div className="vp-gate">
          <h1>Your account is currently under review</h1>
          <p>
            {banned
              ? 'Your NXT//LINK vendor account has been closed. Your profile is not visible to buyers.'
              : 'Your NXT//LINK vendor account is temporarily suspended, so your profile isn’t visible to buyers and no new deals can be started right now.'}
            {vendor.suspended_until && !banned && <><br /><br />Access is expected to be restored on <b>{new Date(vendor.suspended_until).toLocaleDateString()}</b>.</>}
          </p>
          {vendor.moderation_reason && <p style={{ marginTop: 4 }}><b>Reason:</b> {vendor.moderation_reason}</p>}
          <p style={{ marginTop: 4 }}>If you think this is a mistake, reply to your NXT//LINK contact or email <a className="vp-link" href="mailto:support@nxtlink.io">support@nxtlink.io</a> to dispute it.</p>
        </div>
      </div>
    );
  }

  // Profile Strength — computed by THE one shared meter (30% pre-credited at
  // signup; 5 items max, each naming its unlock; disappears at 100%).
  const meterInput = {
    hasLogo: !!logoUrl,
    taglineLen: (vendor.tagline || '').trim().length,
    descriptionLen: (vendor.description || '').trim().length,
    listingCount,
    hasWebsite: !!(vendor.website || '').trim(),
    hasPhone: !!(vendor.phone || '').trim(),
    hasCity: !!(vendor.city || '').trim(),
    proofCount: certs.length + photos.length + caseStudies.length,
  };
  const pct = computeProfileStrength(meterInput).pct;
  const firstName = (vendor.contact_name || '').trim().split(/\s+/)[0] || '';
  const inReview = vendor.status !== 'approved';

  // Software / technology is delivered digitally — no physical install site or
  // service region — so we skip the Service areas question for software-only vendors.
  const selCats = vendor.categories || [];
  const softwareOnly = selCats.length > 0 && selCats.every((c) => catFam[c] === 'technology');

  return (
    <div className="vp">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <VendorNav
        active="portal"
        extra={
          <>
            <LanguageToggle lang={lang} onChange={switchLang} variant="dark" />
            <span className={'vp-badge ' + vendor.status}>{vendor.status}</span>
          </>
        }
      />

      <main className="vp-wrap">
        <div className="vp-titlerow">
          <h1>{pct === 100 ? t('title_done') : t('title_welcome').replace('{name}', firstName ? `, ${firstName}` : '')}</h1>
          <div className="vp-titleactions">
            <span className="vp-autosave">{autosaving ? t('saving') : savedAt ? `${t('saved')} ${savedAt}` : t('autosave')}</span>
            <a className="vp-preview" href={`/marketplace/vendor/${vendor.id}`} target="_blank" rel="noreferrer">{t('preview')}</a>
          </div>
        </div>
        <p className="vp-sub">{t('sub')}</p>
        <div className="vp-vprop">{t('vprop')}</div>
        {msg && <div className="vp-msg">{msg}</div>}

        {cxOpen && (
          <section className="vp-cx">
            <div className="vp-cxhd"><b>{t('cx_title')}</b><button className="vp-cxx" onClick={() => setCxOpen(false)}>✕</button></div>
            {!cxDraft ? (
              <>
                <p className="vp-cxp">{t('cx_p1')}</p>
                <label className="vp-field"><span>{t('cx_name_q')}</span>
                  <input value={cxName} onChange={(e) => setCxName(e.target.value)} placeholder="El Paso Forklift Solutions" />
                </label>
                <label className="vp-field" style={{ marginTop: 12 }}><span>{t('cx_do_q')}</span>
                  <input value={cxSummary} onChange={(e) => setCxSummary(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && runConcierge()} placeholder={lang === 'es' ? 'Vendemos, rentamos y reparamos montacargas en El Paso y Juárez.' : 'We sell, rent, and repair forklifts in El Paso and Juárez.'} />
                </label>
                <button className="vp-btn" style={{ marginTop: 16 }} disabled={cxBusy || !cxSummary.trim()} onClick={runConcierge}>{cxBusy ? t('cx_drafting') : t('cx_draft_btn')}</button>
              </>
            ) : (
              <>
                <p className="vp-cxp">{t('cx_p2')}</p>
                <div className="vp-cxprev">
                  {cxDraft.tagline && <div className="vp-cxrow"><span>Tagline</span><b>{cxDraft.tagline}</b></div>}
                  <div className="vp-cxrow"><span>About</span><p>{cxDraft.description}</p></div>
                  {cxDraft.categories.length > 0 && <div className="vp-cxrow"><span>Categories</span><div className="vp-chips">{cxDraft.categories.map((c) => <span key={c} className="vp-chip on">{c}</span>)}</div></div>}
                  {cxDraft.offerings.length > 0 && <div className="vp-cxrow"><span>Offerings</span><ul className="vp-cxoff">{cxDraft.offerings.map((o, i) => <li key={i}><em>{o.kind}</em> {o.name}{o.category ? ` · ${o.category}` : ''}</li>)}</ul></div>}
                </div>
                <div className="vp-cxacts">
                  <button className="vp-btn" disabled={cxBusy} onClick={applyConcierge}>{cxBusy ? t('cx_setting') : t('cx_use')}</button>
                  <button className="vp-signout" disabled={cxBusy} onClick={() => setCxDraft(null)}>{t('cx_retry')}</button>
                </div>
                {cxDraft.offerings.length > 0 && <p className="vp-hint" style={{ marginTop: 12, marginBottom: 0 }}>Offerings are added as drafts — open Listings to add prices and publish.</p>}
              </>
            )}
          </section>
        )}

        {inReview && (
          <section className="vp-review">
            <b>{t('rv_title')}</b>
            <p>{t('rv_body')}</p>
            <ul>
              <li>{t('rv_now_1')}</li>
              <li>{t('rv_now_2')}</li>
              <li>{t('rv_now_3')}</li>
            </ul>
            <a className="vp-reviewcta" href="/apply?from=portal">{t('rv_cta')}</a>
            <span className="vp-reviewhint">{t('rv_cta_hint')}</span>
          </section>
        )}

        {pct === 100 ? (
          <div className="vp-live">{t('live')} <a href={`/marketplace/vendor/${vendor.id}`} target="_blank" rel="noreferrer">{t('live_link')}</a></div>
        ) : (
          <>
            {!cxOpen && (
              <button className="vp-cxstart" onClick={openConcierge}>{t('cx_start')}</button>
            )}
            <ProfileStrengthMeter input={meterInput} lang={lang} links={{ listing: '/vendor/listings' }} />
          </>
        )}

        {agreement && !agreement.accepted && (
          <section className="vp-card vp-agreement">
            <div className="vp-lbl">Vendor agreement — required before you can publish</div>
            <p className="vp-hint">To publish listings and receive buyer leads, accept the NXT//LINK vendor terms. In short: {agreement.summary}</p>
            <ul className="vp-terms">
              {agreement.terms.map((t) => <li key={t.title}><b>{t.title}.</b> {t.body}</li>)}
            </ul>
            <p className="vp-hint" style={{ fontSize: 12 }}>Plain-language business terms, not final legal wording — a lawyer reviews the full agreement before real commerce.</p>
            <button className="vp-btn" disabled={agBusy} onClick={acceptTerms}>{agBusy ? 'Saving…' : 'I accept the NXT//LINK vendor terms'}</button>
          </section>
        )}
        {agreement && agreement.accepted && (
          <div className="vp-accepted">✓ NXT//LINK vendor terms accepted{agreement.accepted_at ? ` on ${new Date(agreement.accepted_at).toLocaleDateString()}` : ''}. You can publish listings and receive leads.</div>
        )}

        <section className="vp-card">
          <div className="vp-lbl">{t('sec_company')}</div>
          <div className="vp-banner">
            <div className="vp-bannerimg">
              {bannerUrl ? <img src={bannerUrl} alt="Storefront banner" /> : <div className="vp-bannerph">Cover banner — shown across the top of your storefront</div>}
            </div>
            <div className="vp-logoactions" style={{ marginTop: 10 }}>
              <label className="vp-btn sm vp-logobtn">
                {bannerBusy ? 'Uploading…' : bannerUrl ? 'Replace banner' : 'Upload banner'}
                <input type="file" accept="image/png,image/jpeg,image/webp" disabled={bannerBusy} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadBanner(f); e.target.value = ''; }} />
              </label>
              {bannerUrl && <button className="vp-signout" type="button" onClick={removeBanner}>Remove</button>}
              <p className="vp-hint" style={{ margin: 0 }}>Wide image works best (about 1200×300) · up to 8&nbsp;MB</p>
            </div>
          </div>
          <div className="vp-logo">
            <div className="vp-logobox">
              {logoUrl ? <img src={logoUrl} alt="Company logo" /> : <span>Logo</span>}
            </div>
            <div className="vp-logoactions">
              <label className="vp-btn sm vp-logobtn">
                {logoBusy ? 'Uploading…' : logoUrl ? 'Replace logo' : 'Upload logo'}
                <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" disabled={logoBusy} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f); e.target.value = ''; }} />
              </label>
              {logoUrl && <button className="vp-signout" type="button" onClick={removeLogo}>Remove</button>}
              <p className="vp-hint" style={{ margin: 0 }}>PNG, JPG, WEBP, or SVG · up to 5&nbsp;MB</p>
            </div>
          </div>
          <div className="vp-fgrid">
            <Field label={t('f_company')} value={vendor.company_name} onChange={(v) => set('company_name', v)} />
            <Field label={t('f_contact')} value={vendor.contact_name || ''} onChange={(v) => set('contact_name', v)} />
            <Field label={t('f_website')} value={vendor.website || ''} onChange={(v) => set('website', v)} />
            <Field label={t('f_city')} value={vendor.city || ''} onChange={(v) => set('city', v)} />
          </div>
          <div style={{ marginTop: 16 }}>
            <PhoneField value={vendor.phone || ''} onChange={(v) => set('phone', v)} />
          </div>
          <label className="vp-field" style={{ marginTop: 18 }}>
            <span className="vp-fieldlbl">Tagline — one line under your name (e.g. &ldquo;Forklift service across the Borderplex since 2009&rdquo;)<em className="vp-count">{(vendor.tagline || '').length}/160</em></span>
            <input value={vendor.tagline || ''} maxLength={160} onChange={(e) => set('tagline', e.target.value)} />
          </label>
          <label className="vp-field" style={{ marginTop: 18 }}>
            <span className="vp-fieldlbl">
              <span>{t('f_about')}</span>
              <span className="vp-fieldright">
                <button type="button" className="vp-genbtn" disabled={genBusy} onClick={generateDescription}>{genBusy ? t('writing') : t('write_me')}</button>
                <em className="vp-count">{(vendor.description || '').trim().length} chars</em>
              </span>
            </span>
            <textarea rows={4} value={vendor.description || ''} onChange={(e) => set('description', e.target.value)} />
            <span className="vp-why">{(vendor.description || '').trim().length < 40 ? 'A clear 2–3 sentence description helps buyers trust you — aim for 40+ characters. No time? Tap “Write it for me”.' : 'Looks good. Say what you do, who you serve, and what makes you different.'}</span>
          </label>
        </section>

        <section className="vp-card">
          <div className="vp-lbl">{t('sec_industry')}</div>
          <p className="vp-hint">{t('sec_industry_hint')}</p>
          <ChipGroup options={Array.from(new Set([...INDUSTRIES, ...(vendor.industries || [])]))} selected={vendor.industries || []} onToggle={(v) => toggle(vendor.industries || [], v, 'industries')} />
          <AddYourOwn placeholder="Add another industry (e.g. Mining, Textiles)…" existing={vendor.industries || []} onAdd={(v) => set('industries', [...(vendor.industries || []), v])} />
          <div className="vp-lbl" style={{ marginTop: 22 }}>{t('sec_clientsize')}</div>
          <p className="vp-hint">{t('sec_clientsize_hint')}</p>
          <ChipGroup options={CLIENT_SIZES} selected={vendor.client_types || []} onToggle={(v) => toggle(vendor.client_types || [], v, 'client_types')} />
          <div className="vp-lbl" style={{ marginTop: 22 }}>{t('sec_clients')}</div>
          <ChipGroup options={Array.from(new Set([...CLIENT_TYPES, ...((vendor.client_types || []).filter((v) => !CLIENT_SIZES.includes(v)))]))} selected={vendor.client_types || []} onToggle={(v) => toggle(vendor.client_types || [], v, 'client_types')} />
          <div className="vp-lbl" style={{ marginTop: 22 }}>{t('sec_products')}</div>
          <CategoryPicker selected={vendor.categories || []} onToggle={(v) => toggle(vendor.categories || [], v, 'categories')} lang={lang} />
          {softwareOnly ? (
            <p className="vp-hint" style={{ marginTop: 18 }}>{t('software_note')}</p>
          ) : (
            <>
              <div className="vp-lbl" style={{ marginTop: 22 }}>{t('sec_areas')} <span className="vp-lblhint">{t('areas_hint')}</span></div>
              <ChipGroup options={AREAS} selected={vendor.service_areas || []} onToggle={(v) => toggle(vendor.service_areas || [], v, 'service_areas')} />
            </>
          )}
          <div className="vp-lbl" style={{ marginTop: 22 }}>{t('sec_awards')}</div>
          <p className="vp-hint">Industry analyst mentions, awards, and honors — e.g. Gartner Cool Vendor, Inc. 5000, ISO 9001. Shown on your public storefront.</p>
          {(vendor.achievements || []).length > 0 && (
            <div className="vp-chips">
              {(vendor.achievements || []).map((a) => (
                <button key={a} type="button" className="vp-chip on" title="Remove" onClick={() => set('achievements', (vendor.achievements || []).filter((x) => x !== a))}>{a} ✕</button>
              ))}
            </div>
          )}
          <AddYourOwn placeholder="Add an award or recognition (e.g. Gartner Cool Vendor 2025)…" existing={vendor.achievements || []} onAdd={(v) => set('achievements', [...(vendor.achievements || []), v])} />
          <button className="vp-btn" style={{ marginTop: 24 }} disabled={saving} onClick={save}>{saving ? t('saving_btn') : t('save_profile')}</button>
        </section>

        <section className="vp-card">
          <div className="vp-lbl">{t('sec_cases')} <span className="vp-cnt">{caseStudies.length}/3</span></div>
          <p className="vp-hint">Show up to 3 real results. Buyers trust proof — the challenge, what you did, and the measurable outcome.</p>
          {caseStudies.length > 0 && (
            <div className="vp-cslist">
              {caseStudies.map((c) => (
                <div className="vp-cscard" key={c.id}>
                  <div className="vp-cshead"><b>{c.title}</b><button type="button" onClick={() => removeCaseStudy(c.id)}>Remove</button></div>
                  {c.challenge && <p><span>Challenge:</span> {c.challenge}</p>}
                  {c.solution && <p><span>Solution:</span> {c.solution}</p>}
                  {c.result && <p><span>Result:</span> {c.result}</p>}
                </div>
              ))}
            </div>
          )}
          {caseStudies.length < 3 ? (
            <div className="vp-csform">
              <input placeholder="Title — e.g. “Cut picking time 40% for a 3PL”" value={cs.title} onChange={(e) => setCs({ ...cs, title: e.target.value })} />
              <textarea rows={2} placeholder="Challenge — what problem did the customer have?" value={cs.challenge} onChange={(e) => setCs({ ...cs, challenge: e.target.value })} />
              <textarea rows={2} placeholder="Solution — what you delivered" value={cs.solution} onChange={(e) => setCs({ ...cs, solution: e.target.value })} />
              <textarea rows={2} placeholder="Result — the measurable outcome" value={cs.result} onChange={(e) => setCs({ ...cs, result: e.target.value })} />
              <button className="vp-btn sm" type="button" disabled={csBusy} onClick={addCaseStudy}>{csBusy ? 'Adding…' : 'Add case study'}</button>
            </div>
          ) : <p className="vp-hint">You&apos;ve added the maximum of 3. Remove one to add another.</p>}
        </section>

        <section className="vp-card">
          <div className="vp-lbl">{t('sec_certs')} <span className="vp-cnt">{certs.length}/12</span></div>
          <p className="vp-hint">ISO, OSHA, licenses, insurance — with issuer, dates, and an optional photo/PDF of the certificate. Shown on your storefront; buyers filter by these.</p>
          {certs.length > 0 && (
            <div className="vp-certlist">
              {certs.map((c) => (
                <div className="vp-cert" key={c.id}>
                  <div className="vp-certmain">
                    <b>{c.name}</b>
                    <small>{[c.issuer, c.credential && `#${c.credential}`, c.expires_on && `expires ${c.expires_on}`].filter(Boolean).join(' · ')}</small>
                  </div>
                  {c.image_url && <a href={c.image_url} target="_blank" rel="noreferrer">Proof</a>}
                  <button type="button" onClick={() => removeCert(c.id)}>Remove</button>
                </div>
              ))}
            </div>
          )}
          {certs.length < 12 && (
            <div className="vp-csform">
              <div className="vp-fgrid">
                <input placeholder="Certification name * — e.g. ISO 9001:2015" value={certForm.name} onChange={(e) => setCertForm({ ...certForm, name: e.target.value })} />
                <input placeholder="Issuer — e.g. SGS" value={certForm.issuer} onChange={(e) => setCertForm({ ...certForm, issuer: e.target.value })} />
                <input placeholder="Certificate #" value={certForm.credential} onChange={(e) => setCertForm({ ...certForm, credential: e.target.value })} />
                <label className="vp-datef">Expires<input type="date" value={certForm.expires_on} onChange={(e) => setCertForm({ ...certForm, expires_on: e.target.value })} /></label>
              </div>
              <label className="vp-fileline">
                {certFile ? certFile.name : 'Attach certificate photo/PDF (optional)'}
                <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(e) => setCertFile(e.target.files?.[0] || null)} />
              </label>
              <button className="vp-btn sm" type="button" disabled={certBusy} onClick={addCert}>{certBusy ? 'Adding…' : 'Add certification'}</button>
            </div>
          )}
        </section>

        <section className="vp-card">
          <div className="vp-lbl">{t('sec_gallery')} <span className="vp-cnt">{photos.length}/12</span></div>
          <p className="vp-hint">Facility, equipment, and completed-work photos. High-quality images make buyers trust you faster.</p>
          {photos.length > 0 && (
            <div className="vp-gallery">
              {photos.map((p) => (
                <div className="vp-photo" key={p.id}>
                  {p.image_url && <img src={p.image_url} alt={p.caption || 'Gallery photo'} />}
                  <div className="vp-photofoot"><span>{p.caption || ''}</span><button type="button" onClick={() => removePhoto(p.id)}>Remove</button></div>
                </div>
              ))}
            </div>
          )}
          {photos.length < 12 && (
            <div className="vp-vform" style={{ gridTemplateColumns: '1.6fr auto' }}>
              <input placeholder="Caption (optional)" value={photoCaption} onChange={(e) => setPhotoCaption(e.target.value)} />
              <label className="vp-btn sm vp-logobtn">
                {photoBusy ? 'Uploading…' : 'Add photo'}
                <input type="file" accept="image/png,image/jpeg,image/webp" disabled={photoBusy} onChange={(e) => { const f = e.target.files?.[0]; if (f) addPhoto(f); e.target.value = ''; }} />
              </label>
            </div>
          )}
        </section>

        <section className="vp-card">
          <div className="vp-lbl">{t('sec_videos')}</div>
          <p className="vp-hint">Paste a YouTube or Vimeo link to show what you do (up to 8 videos).</p>
          <div className="vp-vform">
            <input placeholder="Title (optional)" value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} />
            <input placeholder="https://youtube.com/watch?v=…" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addVideo()} />
            <button className="vp-btn sm" onClick={addVideo}>Add video</button>
          </div>
          {videos.length > 0 && (
            <div className="vp-vgrid">
              {videos.map((v) => (
                <div className="vp-vcard" key={v.id}>
                  {v.provider === 'other' ? <a className="vp-vlink" href={v.url} target="_blank" rel="noreferrer">{v.title || v.url}</a>
                    : <div className="vp-viframe"><iframe src={v.embed_url} title={v.title || 'video'} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /></div>}
                  <div className="vp-vfoot"><span>{v.title || 'Untitled'}</span><button onClick={() => removeVideo(v.id)}>Remove</button></div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="vp-card">
          <div className="vp-lbl">{t('sec_brochures')}</div>
          <p className="vp-hint">Upload a brochure, then press &ldquo;AI fill&rdquo; and we&apos;ll draft your profile from it — you review and approve before anything is saved.</p>
          <label className="vp-drop">
            <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.ppt,.pptx,.doc,.docx" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ''; }} />
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M5 20h14" /></svg>
            <span>Upload a file</span>
          </label>
          {brochures.length > 0 && (
            <ul className="vp-files">
              {brochures.map((b) => (
                <li key={b.id}>
                  {b.public_url ? <a href={b.public_url} target="_blank" rel="noreferrer">{b.title || b.file_name}</a> : <span>{b.title || b.file_name}</span>}
                  <span className="vp-fmeta">{(b.size_bytes / 1024 / 1024).toFixed(1)} MB</span>
                  <button className="vp-ai" disabled={!!extractingId} onClick={() => extractFromBrochure(b.id)}>{extractingId === b.id ? 'Reading…' : 'AI fill'}</button>
                  <button onClick={() => removeBrochure(b.id)}>Remove</button>
                </li>
              ))}
            </ul>
          )}
          {draft && (
            <div className="vp-draft">
              <div className="vp-lbl">AI draft from {draftSource}</div>
              <p className="vp-hint">{draft.summary}</p>
              <ul className="vp-draft-list">
                {draft.company_name && <li><b>Company:</b> {draft.company_name}</li>}
                {draft.description && <li><b>About:</b> {draft.description}</li>}
                {draft.categories.length > 0 && <li><b>Products / services:</b> {draft.categories.join(', ')}</li>}
                {draft.industries.length > 0 && <li><b>Industries:</b> {draft.industries.join(', ')}</li>}
                {draft.service_areas.length > 0 && <li><b>Service areas:</b> {draft.service_areas.join(', ')}</li>}
                {draft.client_types.length > 0 && <li><b>Client types:</b> {draft.client_types.join(', ')}</li>}
                {draft.website && <li><b>Website:</b> {draft.website}</li>}
                {draft.city && <li><b>City:</b> {draft.city}</li>}
              </ul>
              <div className="vp-draft-actions">
                <button className="vp-btn sm" onClick={applyDraft}>Use this draft</button>
                <button className="vp-signout" onClick={() => setDraft(null)}>Dismiss</button>
              </div>
            </div>
          )}
        </section>
      </main>
      <ChatWidget mode="vendor" locale={lang} />
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (<label className="vp-field"><span>{label}</span><input value={value} onChange={(e) => onChange(e.target.value)} /></label>);
}
function ChipGroup({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (<div className="vp-chips">{options.map((o) => (<button key={o} type="button" className={'vp-chip' + (selected.includes(o) ? ' on' : '')} onClick={() => onToggle(o)}>{o}</button>))}</div>);
}

// "Add your own" free-text entry that appends to a chip list (industries, etc.).
function AddYourOwn({ placeholder, existing, onAdd }: { placeholder: string; existing: string[]; onAdd: (v: string) => void }) {
  const [v, setV] = useState('');
  const add = () => {
    const t = v.trim();
    if (!t) return;
    if (!existing.some((x) => x.toLowerCase() === t.toLowerCase())) onAdd(t);
    setV('');
  };
  return (
    <div className="vp-addown">
      <input value={v} placeholder={placeholder} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
      <button type="button" className="vp-btn sm" onClick={add}>Add</button>
    </div>
  );
}

// International phone: country code + number + optional extension, combined
// into one stored string like "+52 656 123 4567 x201". Borderplex-first list.
const COUNTRY_CODES: Array<{ c: string; n: string }> = [
  { c: '+1', n: 'US / Canada (+1)' },
  { c: '+52', n: 'Mexico (+52)' },
  { c: '+44', n: 'UK (+44)' },
  { c: '+34', n: 'Spain (+34)' },
  { c: '+49', n: 'Germany (+49)' },
  { c: '+86', n: 'China (+86)' },
  { c: '+91', n: 'India (+91)' },
  { c: '+81', n: 'Japan (+81)' },
];
function parsePhone(raw: string): { code: string; number: string; ext: string } {
  let v = (raw || '').trim();
  let ext = '';
  const em = v.match(/(?:x|ext\.?)\s*(\d+)\s*$/i);
  if (em) { ext = em[1]; v = v.slice(0, em.index).trim(); }
  let code = '+1';
  const cm = v.match(/^(\+\d{1,3})\s*(.*)$/);
  let number = v;
  if (cm) { code = cm[1]; number = cm[2].trim(); }
  return { code, number, ext };
}
function PhoneField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { code, number, ext } = parsePhone(value);
  const emit = (c: string, num: string, x: string) => {
    const base = num.trim() ? `${c} ${num.trim()}` : '';
    onChange(x.trim() ? `${base || c} x${x.trim()}` : base);
  };
  return (
    <div className="vp-field">
      <span>Phone</span>
      <div className="vp-phone">
        <select value={code} onChange={(e) => emit(e.target.value, number, ext)}>
          {COUNTRY_CODES.some((o) => o.c === code) ? null : <option value={code}>{code}</option>}
          {COUNTRY_CODES.map((o) => <option key={o.n} value={o.c}>{o.n}</option>)}
        </select>
        <input className="vp-phonenum" inputMode="tel" placeholder="Phone number" value={number} onChange={(e) => emit(code, e.target.value, ext)} />
        <input className="vp-phoneext" inputMode="numeric" placeholder="Ext." value={ext} onChange={(e) => emit(code, number, e.target.value.replace(/\D/g, ''))} />
      </div>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap');
.vp{--bg:#0A0A0F;--bg2:#111118;--surf:rgba(255,255,255,.04);--surf2:rgba(255,255,255,.07);--ink:#F0F0F5;--ink2:#C0C0D0;--muted:#8080A0;--muted2:#505068;--line:rgba(255,255,255,.08);--p:#7C5CFC;--p2:#A78BFA;--p3:#C4B5FD;--pbg:rgba(124,92,252,.12);--pd:#6344DF;--green:#34D399;--sans:'Outfit',system-ui,sans-serif;--serif:'Instrument Serif',Georgia,serif;
  min-height:100vh;background:var(--bg);color:var(--ink);font-family:var(--sans);-webkit-font-smoothing:antialiased;}
.vp *{box-sizing:border-box;}
.vp-loading{min-height:100vh;display:grid;place-items:center;color:var(--muted);}
.vp-gate{max-width:420px;margin:14vh auto;text-align:center;background:var(--surf);border:1px solid var(--line);border-radius:20px;padding:36px;backdrop-filter:blur(12px);}
.vp-gate h1{font-size:22px;font-weight:800;margin-bottom:10px;}
.vp-gate p{color:var(--muted);font-size:14.5px;line-height:1.6;margin-bottom:22px;}
.vp-link{color:var(--p2);}
.vp-nav{display:flex;align-items:center;justify-content:space-between;padding:16px 28px;background:rgba(10,10,15,.7);backdrop-filter:blur(24px);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:10;}
.vp-brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--ink);}
.vp-mk{width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,var(--p),var(--pd));display:grid;place-items:center;font-family:var(--serif);font-size:17px;color:#fff;}
.vp-brand b{font-size:18px;font-weight:700;letter-spacing:-.02em;}.vp-brand i{color:var(--p2);font-style:normal;}
.vp-navr{display:flex;align-items:center;gap:14px;}
.vp-navlink{color:var(--p2);font-size:13.5px;font-weight:600;text-decoration:none;}
.vp-navlink:hover{color:var(--p3);}
.vp-badge{font:600 11px/1 var(--sans);padding:5px 11px;border-radius:99px;text-transform:capitalize;}
.vp-badge.pending{background:rgba(251,191,36,.12);color:#FBBF24;}
.vp-badge.approved{background:rgba(52,211,153,.12);color:var(--green);}
.vp-badge.paused,.vp-badge.rejected{background:var(--surf2);color:var(--muted);}
.vp-signout{background:none;border:1px solid var(--line);color:var(--ink2);font:500 13px var(--sans);padding:8px 14px;border-radius:9px;cursor:pointer;}
.vp-signout:hover{border-color:var(--p2);color:var(--ink);}
.vp-wrap{max-width:760px;margin:0 auto;padding:44px 24px 100px;}
.vp-wrap h1{font-size:30px;font-weight:800;letter-spacing:-.02em;margin-bottom:8px;}
.vp-sub{color:var(--muted);font-size:15px;line-height:1.6;font-weight:300;margin-bottom:28px;}
.vp-msg{background:var(--pbg);border:1px solid rgba(124,92,252,.25);color:var(--p3);padding:11px 15px;border-radius:12px;font-size:13.5px;margin-bottom:20px;}
.vp-review{background:rgba(251,191,36,.07);border:1px solid rgba(251,191,36,.3);border-radius:18px;padding:20px 22px;margin-bottom:22px;}
.vp-review b{font-size:15.5px;font-weight:800;display:block;color:#FBD38D;}
.vp-review p{font-size:13.5px;color:var(--ink2);line-height:1.6;margin:8px 0 10px;}
.vp-review ul{list-style:none;margin:0 0 14px;padding:0;display:flex;flex-direction:column;gap:7px;}
.vp-review li{font-size:13.5px;color:var(--ink2);padding-left:24px;position:relative;}
.vp-review li::before{content:'✓';position:absolute;left:0;top:0;color:var(--green);font-weight:800;}
.vp-reviewcta{display:inline-block;font-size:13.5px;font-weight:700;color:#fff;background:var(--p);border-radius:10px;padding:11px 16px;text-decoration:none;}
.vp-reviewcta:hover{background:var(--pd);}
.vp-reviewcta:focus-visible{outline:2px solid var(--p3);outline-offset:2px;}
.vp-reviewhint{display:block;font-size:12px;color:var(--muted);margin-top:8px;}
.vp-titlerow{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;}
.vp-preview{flex-shrink:0;color:var(--p2);font-size:13px;font-weight:600;text-decoration:none;border:1px solid var(--line);border-radius:10px;padding:9px 14px;background:var(--surf);}
.vp-preview:hover{border-color:var(--p2);color:var(--p3);}
.vp-live{background:linear-gradient(120deg,rgba(52,211,153,.16),rgba(124,92,252,.08));border:1px solid rgba(52,211,153,.35);color:#DFFbef;border-radius:15px;padding:15px 18px;margin-bottom:22px;font-size:14.5px;font-weight:600;}
.vp-live a{color:var(--green);font-weight:700;text-decoration:none;}
.vp-live a:hover{text-decoration:underline;}
.vp-fieldlbl{display:flex;justify-content:space-between;align-items:baseline;gap:10px;}
.vp-fieldright{display:flex;align-items:center;gap:12px;flex-shrink:0;}
.vp-count{font-style:normal;font-size:11.5px;color:var(--muted2);font-weight:500;flex-shrink:0;}
.vp-why{font-size:12px;color:var(--muted);margin-top:6px;font-weight:300;}
.vp-genbtn{font-family:var(--sans);font-size:11.5px;font-weight:700;color:var(--p3);background:var(--pbg);border:1px solid rgba(124,92,252,.3);border-radius:99px;padding:5px 11px;cursor:pointer;}
.vp-genbtn:hover{background:rgba(124,92,252,.2);}
.vp-genbtn:disabled{opacity:.6;cursor:default;}
.vp-titleactions{display:flex;align-items:center;gap:12px;flex-shrink:0;flex-wrap:wrap;}
.vp-autosave{font-size:12px;color:var(--muted);font-weight:500;white-space:nowrap;}
.vp-vprop{background:linear-gradient(120deg,rgba(52,211,153,.1),rgba(124,92,252,.06));border:1px solid rgba(52,211,153,.28);border-radius:13px;padding:13px 16px;margin-bottom:20px;font-size:13.5px;line-height:1.6;color:var(--ink2);}
.vp-lblhint{font-weight:500;letter-spacing:0;text-transform:none;color:var(--muted);font-size:11.5px;margin-left:6px;}
.vp-cxstart{display:block;width:100%;font-family:var(--sans);font-size:13.5px;font-weight:700;color:var(--p3);background:rgba(124,92,252,.12);border:1px dashed rgba(124,92,252,.4);border-radius:12px;padding:12px 14px;margin-bottom:16px;cursor:pointer;}
.vp-cxstart:hover{background:rgba(124,92,252,.2);}
.vp-cx{background:linear-gradient(160deg,rgba(124,92,252,.14),rgba(52,211,153,.05)),var(--surf);border:1px solid rgba(124,92,252,.35);border-radius:18px;padding:22px 24px;margin-bottom:22px;}
.vp-cxhd{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}
.vp-cxhd b{font-size:16px;font-weight:800;}
.vp-cxx{background:none;border:none;color:var(--muted);font-size:16px;cursor:pointer;}
.vp-cxp{font-size:13.5px;color:var(--ink2);margin:0 0 16px;line-height:1.55;}
.vp-cxprev{background:var(--bg);border:1px solid var(--line);border-radius:13px;padding:16px;display:flex;flex-direction:column;gap:14px;}
.vp-cxrow{display:flex;flex-direction:column;gap:6px;}
.vp-cxrow>span{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--p2);}
.vp-cxrow b{font-size:14.5px;}
.vp-cxrow p{font-size:14px;color:var(--ink2);line-height:1.6;margin:0;}
.vp-cxoff{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:7px;}
.vp-cxoff li{font-size:13.5px;color:var(--ink2);}
.vp-cxoff em{font-style:normal;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--p3);background:var(--pbg);padding:2px 7px;border-radius:99px;margin-right:6px;}
.vp-cxacts{display:flex;gap:10px;align-items:center;margin-top:16px;flex-wrap:wrap;}
.vp-card{background:var(--surf);border:1px solid var(--line);border-radius:18px;padding:26px;margin-bottom:20px;backdrop-filter:blur(10px);}
.vp-lbl{font-size:12px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--p2);margin-bottom:14px;}
.vp-hint{color:var(--muted);font-size:13.5px;margin:0 0 16px;font-weight:300;}
.vp-fgrid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
@media(max-width:520px){.vp-fgrid{grid-template-columns:1fr;}}
.vp-field{display:flex;flex-direction:column;gap:7px;font-size:13px;font-weight:500;color:var(--ink2);}
.vp-field input,.vp-field textarea{font-family:var(--sans);padding:12px 14px;border-radius:11px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font-size:14.5px;outline:none;width:100%;resize:vertical;}
.vp-field input:focus,.vp-field textarea:focus{border-color:var(--p);box-shadow:0 0 0 3px var(--pbg);}
.vp-chips{display:flex;flex-wrap:wrap;gap:9px;}
.vp-chip{font-family:var(--sans);padding:9px 15px;border-radius:99px;border:1px solid var(--line);background:var(--bg);color:var(--ink2);font-size:13px;font-weight:500;cursor:pointer;}
.vp-chip:hover{border-color:var(--p2);}
.vp-chip.on{background:var(--pbg);border-color:var(--p);color:var(--p3);}
.vp-addown{display:flex;gap:9px;margin-top:12px;}
.vp-addown input{flex:1;font-family:var(--sans);padding:10px 13px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font-size:14px;outline:none;}
.vp-addown input:focus{border-color:var(--p);box-shadow:0 0 0 3px var(--pbg);}
.vp-phone{display:flex;gap:9px;}
.vp-phone select{font-family:var(--sans);padding:12px 12px;border-radius:11px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font-size:14px;outline:none;max-width:170px;}
.vp-phone select:focus{border-color:var(--p);}
.vp-phonenum{flex:1;}
.vp-phoneext{max-width:90px;}
.vp-banner{margin-bottom:20px;}
.vp-bannerimg{height:130px;border-radius:14px;overflow:hidden;border:1px solid var(--line);background:linear-gradient(120deg,#1b1533 0%,#241a4d 40%,#12244a 100%);}
.vp-bannerimg img{width:100%;height:100%;object-fit:cover;}
.vp-bannerph{height:100%;display:grid;place-items:center;color:var(--muted);font-size:13px;padding:0 20px;text-align:center;}
.vp-logo{display:flex;align-items:center;gap:18px;margin-bottom:20px;}
.vp-logobox{width:84px;height:84px;flex-shrink:0;border-radius:14px;border:1px solid var(--line);background:var(--bg);display:grid;place-items:center;overflow:hidden;color:var(--muted2);font-size:12px;letter-spacing:.12em;text-transform:uppercase;}
.vp-logobox img{width:100%;height:100%;object-fit:contain;}
.vp-logoactions{display:flex;flex-wrap:wrap;align-items:center;gap:10px;}
.vp-logobtn{position:relative;overflow:hidden;box-shadow:none;}
.vp-logobtn input{position:absolute;inset:0;opacity:0;cursor:pointer;font-size:0;}
.vp-cnt{font-weight:600;color:var(--muted);letter-spacing:0;text-transform:none;font-size:12px;margin-left:6px;}
.vp-cslist{display:flex;flex-direction:column;gap:12px;margin-bottom:18px;}
.vp-cscard{background:var(--bg2);border:1px solid var(--line);border-radius:13px;padding:15px 17px;}
.vp-cshead{display:flex;justify-content:space-between;align-items:center;gap:12px;}
.vp-cshead b{font-size:14.5px;}
.vp-cshead button{background:none;border:none;color:var(--muted);cursor:pointer;font-size:12.5px;}
.vp-cshead button:hover{color:#FCA5A5;}
.vp-cscard p{font-size:13px;color:var(--ink2);margin:8px 0 0;line-height:1.55;}
.vp-cscard p span{color:var(--muted);}
.vp-csform{display:flex;flex-direction:column;gap:10px;background:var(--bg2);border:1px solid var(--line);border-radius:13px;padding:16px;}
.vp-csform input,.vp-csform textarea{font-family:var(--sans);padding:11px 13px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font-size:14px;outline:none;resize:vertical;}
.vp-csform input:focus,.vp-csform textarea:focus{border-color:var(--p);}
.vp-csform .vp-btn{align-self:flex-start;}
.vp-certlist{display:flex;flex-direction:column;gap:9px;margin-bottom:16px;}
.vp-cert{display:flex;align-items:center;gap:12px;background:var(--bg2);border:1px solid var(--line);border-radius:11px;padding:11px 14px;}
.vp-certmain{flex:1;display:flex;flex-direction:column;gap:3px;}
.vp-cert b{font-size:14px;}
.vp-cert small{color:var(--muted);font-size:12px;}
.vp-cert a{color:var(--p2);font-size:12.5px;font-weight:600;}
.vp-cert button{background:none;border:none;color:var(--muted);cursor:pointer;font-size:12.5px;}
.vp-cert button:hover{color:#FCA5A5;}
.vp-csform .vp-fgrid input{font-family:var(--sans);padding:11px 13px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font-size:14px;outline:none;width:100%;}
.vp-datef{display:flex;align-items:center;gap:9px;font-size:12.5px;color:var(--muted);}
.vp-datef input{flex:1;}
.vp-fileline{display:block;padding:11px 13px;border:1.5px dashed rgba(124,92,252,.35);border-radius:10px;color:var(--p2);font-size:13px;cursor:pointer;position:relative;overflow:hidden;}
.vp-fileline input{position:absolute;inset:0;opacity:0;cursor:pointer;font-size:0;}
.vp-gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-bottom:16px;}
.vp-photo{background:var(--bg2);border:1px solid var(--line);border-radius:11px;overflow:hidden;}
.vp-photo img{width:100%;height:110px;object-fit:cover;display:block;}
.vp-photofoot{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:7px 10px;font-size:11.5px;color:var(--ink2);}
.vp-photofoot button{background:none;border:none;color:var(--muted);cursor:pointer;font-size:11.5px;}
.vp-photofoot button:hover{color:#FCA5A5;}
.vp-agreement{border-color:rgba(124,92,252,.45);background:rgba(124,92,252,.06);}
.vp-terms{margin:4px 0 12px;padding-left:18px;display:flex;flex-direction:column;gap:9px;font-size:13.5px;color:var(--ink2);line-height:1.55;}
.vp-terms b{color:var(--ink);}
.vp-accepted{background:rgba(52,211,153,.1);border:1px solid rgba(52,211,153,.3);color:var(--green);border-radius:12px;padding:11px 15px;font-size:13.5px;margin-bottom:20px;}
.vp-btn{font-family:var(--sans);border:none;cursor:pointer;font-size:14.5px;font-weight:600;border-radius:11px;padding:13px 22px;background:var(--p);color:#fff;box-shadow:0 4px 18px rgba(124,92,252,.35);}
.vp-btn:hover{background:var(--pd);}.vp-btn:disabled{opacity:.6;}
.vp-btn.sm{padding:11px 16px;font-size:13.5px;}
.vp-vform{display:grid;grid-template-columns:1fr 1.6fr auto;gap:10px;margin-bottom:18px;}
@media(max-width:600px){.vp-vform{grid-template-columns:1fr;}}
.vp-vform input{font-family:var(--sans);padding:11px 14px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font-size:14px;outline:none;}
.vp-vform input:focus{border-color:var(--p);}
.vp-vgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;}
.vp-vcard{background:var(--bg2);border:1px solid var(--line);border-radius:12px;overflow:hidden;}
.vp-viframe{position:relative;padding-top:56.25%;background:#000;}
.vp-viframe iframe{position:absolute;inset:0;width:100%;height:100%;border:none;}
.vp-vlink{display:block;padding:20px;color:var(--p2);font-size:13.5px;word-break:break-all;}
.vp-vfoot{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;font-size:12.5px;color:var(--ink2);}
.vp-vfoot button{background:none;border:none;color:var(--muted);cursor:pointer;font-size:12px;}
.vp-vfoot button:hover{color:#FCA5A5;}
.vp-drop{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:26px;border:1.5px dashed rgba(124,92,252,.35);border-radius:14px;color:var(--p2);cursor:pointer;background:var(--pbg);margin-bottom:16px;}
.vp-drop:hover{border-color:var(--p);}
.vp-drop input{display:none;}
.vp-files{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px;}
.vp-files li{display:flex;align-items:center;gap:12px;padding:11px 14px;border:1px solid var(--line);border-radius:10px;font-size:13.5px;background:var(--bg2);}
.vp-files li a{color:var(--p2);flex:1;}
.vp-files li span:first-child{flex:1;color:var(--ink2);}
.vp-fmeta{color:var(--muted);font-size:12px;}
.vp-files button{background:none;border:none;color:var(--muted);cursor:pointer;font-size:12.5px;}
.vp-files button:hover{color:#FCA5A5;}
.vp-files button.vp-ai{color:var(--p2);font-weight:600;}
.vp-files button.vp-ai:hover{color:var(--p3);}
.vp-files button.vp-ai:disabled{opacity:.5;cursor:default;}
.vp-draft{margin-top:18px;border:1px solid rgba(124,92,252,.35);background:var(--pbg);border-radius:14px;padding:20px;}
.vp-draft-list{list-style:none;margin:0 0 16px;padding:0;display:flex;flex-direction:column;gap:8px;font-size:13.5px;color:var(--ink2);line-height:1.5;}
.vp-draft-list b{color:var(--ink);}
.vp-draft-actions{display:flex;gap:10px;}
`;
