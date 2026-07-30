'use client';

// Vendor onboarding — v2 "hub + four focused sections" card flow.
//
// Replaces the v1 single 12-card line (Slice S1) per Cesar's explicit
// rejection of that look ("content floats left in a huge empty white void;
// tiny disconnected Save & exit; lonely Next button; the single card line
// feels endless") and CESAR'S PORTAL REDESIGN BLUEPRINT (workplace/plans/
// vendor-onboarding-uber-flow-2026-07-29.md).
//
// Structure: an entry hub (welcome + 4 section tiles, each showing its own
// completion state) + a persistent calm checklist (sidebar on desktop,
// collapsible strip on mobile — plain items, green check when done, violet
// highlight on the active one; no % ring, no lock icons, no "unlocks" copy).
// Each of the first 3 sections opens its own short card-flow. Section 4
// (Agreement & Activation) recaps what was built, then presents the vendor
// terms as a scannable table + a single checkbox + the Activate CTA.
//
// Data + reuse contract (unchanged from Slice S1):
// - No new data. Every field already exists on vendor_profiles / vendor_*
//   tables and is saved through the SAME endpoints the portal page
//   (src/app/vendor/portal/page.tsx) uses — see useVendorOnboardingProfile.ts.
// - No AI in the flow (guardrail) — "Use a template" inserts a static string,
//   no API call.
// - CategoryPicker is embedded exactly as-is (a future slice reworks its
//   search/chip UI; this rebuild must not touch that shared component).
// - The vendor-agreement click-wrap is recorded through the SAME endpoint
//   the portal's "I accept the NXT//LINK vendor terms" button already calls
//   (POST /api/vendor/agreement) — this flow never invents a second legal
//   record, only a friendlier presentation of the same one.

import { useEffect, useMemo, useRef, useState } from 'react';
import { IBM_Plex_Sans } from 'next/font/google';
import {
  Image as LogoIcon, Building2, Building, Phone, Quote, FileText, Factory, Users,
  Boxes, MapPin, Award, Check, X, ShieldCheck, Camera, Video as VideoIcon,
  Handshake, ChevronRight, ChevronDown, ExternalLink, Warehouse, ShoppingCart,
  UtensilsCrossed, Car, Snowflake, ArrowLeftRight, HardHat, Truck, Pill, Plane,
  Wrench, Home, Landmark, type LucideIcon,
} from 'lucide-react';
import CategoryChipPicker from './CategoryChipPicker';
import LanguageToggle, { useLang } from '@/components/LanguageToggle';
import {
  SECTION_ORDER, STOREFRONT_STEPS, CAPABILITIES_STEPS, TRUST_STEPS, AGREEMENT_STEPS,
  stepsForSection, clampStepIndex, computeSectionStatus, countSectionsDone, showServiceAreasQuestion,
  type SectionKey, type StepId,
} from './steps';
import { useVendorOnboardingProfile, type OnboardingVendor } from './useVendorOnboardingProfile';

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans-vo2',
  display: 'swap',
});

// Mirrors the taxonomy lists in src/app/vendor/portal/page.tsx (not exported
// there, and that page stays untouched — see file header).
const AREAS = ['El Paso', 'Juárez', 'New Mexico', 'West Texas', 'Cross-border', 'National'];
const INDUSTRIES = [
  'Warehousing & 3PL', 'Manufacturing', 'Retail & E-commerce', 'Food & Beverage', 'Automotive',
  'Cold Chain', 'Import / Export & Customs', 'Construction', 'Distribution Centers',
  'Pharma & Healthcare', 'Aerospace & Defense', 'General Industrial',
];
const CLIENT_SIZES = [
  'Small businesses (1–50 people)', 'Mid-size companies (51–500)', 'Large companies (500+)', 'Enterprise / Fortune 500',
];

// Icon maps for the 2026-07-30 "more visual and interactive" pass — pure
// presentation, no effect on stored values (still plain strings in
// vendor.industries / vendor.client_types).
const INDUSTRY_ICON: Record<string, LucideIcon> = {
  'Warehousing & 3PL': Warehouse,
  'Manufacturing': Factory,
  'Retail & E-commerce': ShoppingCart,
  'Food & Beverage': UtensilsCrossed,
  'Automotive': Car,
  'Cold Chain': Snowflake,
  'Import / Export & Customs': ArrowLeftRight,
  'Construction': HardHat,
  'Distribution Centers': Truck,
  'Pharma & Healthcare': Pill,
  'Aerospace & Defense': Plane,
  'General Industrial': Wrench,
};
const CLIENT_SIZE_ICON: Record<string, LucideIcon> = {
  'Small businesses (1–50 people)': Home,
  'Mid-size companies (51–500)': Building,
  'Large companies (500+)': Building2,
  'Enterprise / Fortune 500': Landmark,
};

type Lang = 'en' | 'es';
type View = { mode: 'hub' } | { mode: 'section'; section: SectionKey; stepId: StepId };

// Full (unfiltered) step order per section — used only to find a sane
// fallback card if the currently-shown one disappears mid-flow (Capabilities
// dropping "service_areas" for a software-only vendor).
const FULL_ORDER: Record<SectionKey, StepId[]> = {
  storefront: STOREFRONT_STEPS,
  capabilities: CAPABILITIES_STEPS,
  trust: TRUST_STEPS,
  agreement: AGREEMENT_STEPS,
};

const SECTION_ICON: Record<SectionKey, LucideIcon> = {
  storefront: Building2, capabilities: Boxes, trust: ShieldCheck, agreement: Handshake,
};
const STEP_ICON: Partial<Record<StepId, LucideIcon>> = {
  name_logo: LogoIcon, location_areas: MapPin, tagline_about: Quote, contact: Phone,
  industries: Factory, client_size: Users, categories: Boxes,
  proof: ShieldCheck, videos: VideoIcon, awards: Award,
};

const TR: Record<string, { en: string; es: string }> = {
  doc_title: { en: 'Set up your storefront — NXT//LINK', es: 'Configura tu tienda — NXT//LINK' },
  loading: { en: 'Loading…', es: 'Cargando…' },
  redirecting: { en: 'One moment…', es: 'Un momento…' },
  signin_h: { en: 'Sign in to set up your storefront', es: 'Inicia sesión para configurar tu tienda' },
  signin_body: { en: 'Create or access your vendor account to build your profile.', es: 'Crea o accede a tu cuenta de proveedor para construir tu perfil.' },
  signin_cta: { en: 'Go to sign in', es: 'Ir a iniciar sesión' },
  exit: { en: 'Save & exit', es: 'Guardar y salir' },
  back: { en: 'Back', es: 'Atrás' },
  next: { en: 'Next', es: 'Siguiente' },
  done: { en: 'Done', es: 'Listo' },
  overview: { en: 'Overview', es: 'Resumen' },
  saved: { en: 'Saved', es: 'Guardado' },
  save_error: { en: 'Could not save — check your connection.', es: 'No se pudo guardar — revisa tu conexión.' },
  step_of: { en: 'Step {n} of {total}', es: 'Paso {n} de {total}' },

  // Hub
  hub_h: { en: 'Let’s build your storefront', es: 'Construyamos tu tienda' },
  hub_sub: { en: 'This is what buyers see. Nothing you enter here is ever lost.', es: 'Esto es lo que ven los compradores. Nada de lo que ingreses aquí se pierde.' },
  hub_progress: { en: '{n} of 4 sections done', es: '{n} de 4 secciones completas' },
  status_not_started: { en: 'Not started', es: 'No iniciado' },
  status_progress: { en: '{done} of {total} done', es: '{done} de {total} completos' },
  status_complete: { en: 'Complete', es: 'Completo' },
  checklist_title: { en: 'Your progress', es: 'Tu progreso' },
  strip_summary: { en: '{n} of 4 sections done', es: '{n} de 4 secciones completas' },

  sec_storefront_label: { en: 'Storefront', es: 'Tienda' },
  sec_storefront_blurb: { en: 'Name, logo, location, and how buyers reach you', es: 'Nombre, logo, ubicación y cómo te contactan los compradores' },
  sec_capabilities_label: { en: 'Capabilities', es: 'Capacidades' },
  sec_capabilities_blurb: { en: 'Industries, client sizes, and what you sell', es: 'Industrias, tamaños de clientes y qué vendes' },
  sec_trust_label: { en: 'Trust & Proof', es: 'Confianza y pruebas' },
  sec_trust_blurb: { en: 'Certifications, case studies, photos, and more', es: 'Certificaciones, casos de éxito, fotos y más' },
  sec_agreement_label: { en: 'Agreement & Activation', es: 'Acuerdo y activación' },
  sec_agreement_blurb: { en: 'Review the terms and activate your storefront', es: 'Revisa los términos y activa tu tienda' },

  // Storefront cards
  h_name_logo: { en: 'What’s your company called?', es: '¿Cómo se llama tu empresa?' },
  company_label: { en: 'Company name', es: 'Nombre de la empresa' },
  logo_upload: { en: 'Upload logo', es: 'Subir logo' },
  logo_replace: { en: 'Replace logo', es: 'Reemplazar logo' },
  logo_uploading: { en: 'Uploading…', es: 'Subiendo…' },
  logo_remove: { en: 'Remove', es: 'Quitar' },
  h_location: { en: 'Where is your business located?', es: '¿Dónde está ubicada tu empresa?' },
  loc_region_ep: { en: 'El Paso, United States', es: 'El Paso, Estados Unidos' },
  loc_region_jz: { en: 'Ciudad Juárez, Mexico', es: 'Ciudad Juárez, México' },
  loc_region_lc: { en: 'Las Cruces, United States', es: 'Las Cruces, Estados Unidos' },
  loc_region_chi: { en: 'Chihuahua, Mexico', es: 'Chihuahua, México' },
  loc_other: { en: 'Somewhere else', es: 'Otro lugar' },
  ph_location_other: { en: 'e.g. "Houston, United States"', es: 'ej. "Houston, Estados Unidos"' },
  h_tagline: { en: 'Sum up your company in one line', es: 'Resume tu empresa en una línea' },
  ph_tagline: { en: 'e.g. "Forklift service across the Borderplex since 2009."', es: 'ej. "Servicio de montacargas en la frontera desde 2009."' },
  h_about: { en: 'What does your company do?', es: '¿Qué hace tu empresa?' },
  ph_about: { en: 'e.g. "We sell, rent, and repair forklifts in El Paso and Juárez."', es: 'ej. "Vendemos, rentamos y reparamos montacargas en El Paso y Juárez."' },
  use_template: { en: 'Use a template', es: 'Usar una plantilla' },
  h_contact: { en: 'How can buyers reach you?', es: '¿Cómo pueden contactarte los compradores?' },
  contact_name_label: { en: 'Contact name', es: 'Nombre de contacto' },
  website_label: { en: 'Website (optional)', es: 'Sitio web (opcional)' },
  phone_label: { en: 'Phone', es: 'Teléfono' },

  // Capabilities cards
  h_industries: { en: 'Which industries do you serve?', es: '¿A qué industrias atiendes?' },
  sub_industries: { en: 'Pick every one that fits — buyers filter by this.', es: 'Elige todas las que apliquen — los compradores filtran por esto.' },
  add_industry_ph: { en: 'Add another industry…', es: 'Agrega otra industria…' },
  h_client_size: { en: 'What size companies do you serve?', es: '¿De qué tamaño son las empresas que atiendes?' },
  h_categories: { en: 'What do you sell?', es: '¿Qué vendes?' },
  sub_categories: { en: 'Search, or tap a popular category below.', es: 'Busca, o toca una categoría popular abajo.' },
  h_service_areas: { en: 'Where do you provide service?', es: '¿Dónde das servicio?' },

  // Trust & Proof cards
  h_proof: { en: 'Show buyers you’re the real deal', es: 'Demuestra que eres de confianza' },
  sub_proof: { en: 'Certifications, case studies, and photos build trust fast.', es: 'Certificaciones, casos de éxito y fotos generan confianza rápido.' },
  proof_added: { en: 'Added', es: 'Agregado' },
  h_certifications: { en: 'Certifications', es: 'Certificaciones' },
  certs_empty: { en: 'No certifications yet.', es: 'Aún no hay certificaciones.' },
  certs_cta: { en: 'Add certifications in your portal', es: 'Agrega certificaciones en tu portal' },
  h_case_studies: { en: 'Case studies', es: 'Casos de éxito' },
  cases_empty: { en: 'No case studies yet.', es: 'Aún no hay casos de éxito.' },
  cases_cta: { en: 'Add case studies in your portal', es: 'Agrega casos de éxito en tu portal' },
  h_photos: { en: 'Photo gallery', es: 'Galería de fotos' },
  photos_empty: { en: 'No photos yet.', es: 'Aún no hay fotos.' },
  photos_cta: { en: 'Add photos in your portal', es: 'Agrega fotos en tu portal' },
  h_videos: { en: 'Showcase videos', es: 'Videos de tu trabajo' },
  sub_videos: { en: 'Paste a YouTube or Vimeo link.', es: 'Pega un enlace de YouTube o Vimeo.' },
  video_title_ph: { en: 'Title (optional)', es: 'Título (opcional)' },
  video_url_ph: { en: 'https://youtube.com/watch?v=…', es: 'https://youtube.com/watch?v=…' },
  video_add: { en: 'Add video', es: 'Agregar video' },
  video_remove: { en: 'Remove', es: 'Quitar' },
  videos_empty: { en: 'No videos yet.', es: 'Aún no hay videos.' },
  h_awards: { en: 'Any awards or certifications to highlight?', es: '¿Algún premio o certificación que destacar?' },
  sub_awards: { en: 'Optional — you can add this anytime.', es: 'Opcional — puedes agregarlo cuando quieras.' },
  add_award_ph: { en: 'Add an award or recognition…', es: 'Agrega un premio o reconocimiento…' },
  add_btn: { en: 'Add', es: 'Agregar' },

  // Agreement & Activation
  h_recap: { en: 'You’re almost there', es: 'Ya casi terminas' },
  sub_recap: { en: 'Here’s what you’ve built so far.', es: 'Esto es lo que has construido hasta ahora.' },
  stat_listings: { en: 'Listings', es: 'Publicaciones' },
  stat_categories: { en: 'Categories selected', es: 'Categorías seleccionadas' },
  stat_proof: { en: 'Proof items', es: 'Elementos de prueba' },
  h_terms: { en: 'Review the vendor terms', es: 'Revisa los términos de proveedor' },
  terms_row_pay: { en: 'What you pay', es: 'Lo que pagas' },
  terms_row_protected: { en: 'Protected period', es: 'Período protegido' },
  terms_row_stay: { en: 'Stay on platform', es: 'Permanece en la plataforma' },
  terms_row_accurate: { en: 'Accurate listings', es: 'Publicaciones precisas' },
  terms_disclaimer: { en: 'Plain-language business terms, not final legal wording — a lawyer reviews the full agreement before real commerce.', es: 'Términos de negocio en lenguaje sencillo, no es el texto legal final — un abogado revisa el acuerdo completo antes del comercio real.' },
  terms_full_link: { en: 'Read the full terms', es: 'Leer los términos completos' },
  reassure_main: { en: 'No subscription or monthly commitment. You only pay when a qualifying deal is completed.', es: 'Sin suscripción ni compromiso mensual. Solo pagas cuando se completa un trato que califica.' },
  reassure_sub: { en: 'Introduced-customer and protected-period terms may continue as described in the Vendor Agreement.', es: 'Los términos de cliente presentado y del período de protección pueden continuar según se describe en el Acuerdo de Proveedor.' },
  accept_checkbox: { en: 'I accept the NXT//LINK vendor terms', es: 'Acepto los términos de proveedor de NXT//LINK' },
  activate_btn: { en: 'Activate My Storefront', es: 'Activar mi tienda' },
  activate_error: { en: 'Could not record your acceptance — check your connection and try again.', es: 'No se pudo registrar tu aceptación — revisa tu conexión e intenta de nuevo.' },
  accepted_h: { en: 'You’re all set!', es: '¡Listo!' },
  accepted_on: { en: 'NXT//LINK vendor terms accepted on {date}.', es: 'Términos de proveedor de NXT//LINK aceptados el {date}.' },
  accepted_review: { en: 'A human on our team reviews every new company — your listings go live the moment you’re approved.', es: 'Una persona de nuestro equipo revisa cada empresa nueva — tus publicaciones salen en vivo en cuanto te aprueben.' },
  accepted_live: { en: 'You can publish listings and receive leads.', es: 'Puedes publicar tus listados y recibir prospectos.' },
  go_portal: { en: 'Go to my portal', es: 'Ir a mi portal' },
  preview_storefront: { en: 'Preview storefront', es: 'Ver mi tienda' },
};

export default function VendorOnboardingPage() {
  const hook = useVendorOnboardingProfile();
  const {
    checking, signedIn, vendor, set, toggle, persist, savedAt, saveError,
    logoUrl, logoBusy, uploadLogo, removeLogo, softwareOnly,
    certifications, photos, caseStudies, videos, videoBusy, addVideo, removeVideo,
    listingCount, proofCount, agreement, agreementBusy, acceptTerms,
  } = hook;
  const [lang, switchLang] = useLang('en');
  const t = (k: string) => (TR[k] ? (lang === 'es' ? TR[k].es : TR[k].en) : k);
  const tf = (k: string, vals: Record<string, string | number>) => {
    let s = t(k);
    for (const [key, v] of Object.entries(vals)) s = s.replace(`{${key}}`, String(v));
    return s;
  };

  const [view, setView] = useState<View>({ mode: 'hub' });
  const [direction, setDirection] = useState<'fwd' | 'back'>('fwd');
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => { document.title = t('doc_title'); }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const opts = useMemo(() => ({ softwareOnly }), [softwareOnly]);

  // If the currently-shown card disappears mid-flow (a software-only vendor
  // dropping the "service areas" card), move to the nearest still-visible
  // card instead of getting stuck — same guard v1 used.
  useEffect(() => {
    if (view.mode !== 'section') return;
    const steps = stepsForSection(view.section, opts);
    if (steps.includes(view.stepId)) return;
    const order = FULL_ORDER[view.section];
    const fromHere = order.slice(order.indexOf(view.stepId));
    const fallback = fromHere.find((s) => steps.includes(s)) || steps[steps.length - 1];
    if (fallback) setView({ mode: 'section', section: view.section, stepId: fallback });
    else setView({ mode: 'hub' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, opts]);

  useEffect(() => {
    if (!savedAt) return;
    setShowSaved(true);
    const timer = setTimeout(() => setShowSaved(false), 1800);
    return () => clearTimeout(timer);
  }, [savedAt]);

  // Suspended/banned vendors get the real explanation on the portal page —
  // no need to duplicate that gate here.
  useEffect(() => {
    if (vendor && (vendor.moderation_status === 'suspended' || vendor.moderation_status === 'banned')) {
      window.location.href = '/vendor/portal';
    }
  }, [vendor]);

  if (checking) {
    return (
      <div className={`vo ${ibmPlexSans.variable}`}>
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div className="vo-center">{t('loading')}</div>
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className={`vo ${ibmPlexSans.variable}`}>
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div className="vo-gate">
          <h1>{t('signin_h')}</h1>
          <p>{t('signin_body')}</p>
          <a className="vo-btn" href="/vendor-login">{t('signin_cta')}</a>
        </div>
      </div>
    );
  }

  if (!vendor || vendor.moderation_status === 'suspended' || vendor.moderation_status === 'banned') {
    return (
      <div className={`vo ${ibmPlexSans.variable}`}>
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div className="vo-center">{t('redirecting')}</div>
      </div>
    );
  }

  const status = computeSectionStatus({
    companyName: vendor.company_name || '',
    tagline: vendor.tagline || '',
    description: vendor.description || '',
    industries: vendor.industries || [],
    categories: vendor.categories || [],
    clientSizeCount: (vendor.client_types || []).filter((c) => CLIENT_SIZES.includes(c)).length,
    proofCount,
    agreementAccepted: !!agreement?.accepted,
  });
  const doneCount = countSectionsDone(status);
  const inReview = vendor.status !== 'approved';

  function enterSection(section: SectionKey) {
    const steps = stepsForSection(section, opts);
    setDirection('fwd');
    setView({ mode: 'section', section, stepId: steps[0] });
  }
  function backToHub() {
    persist(true);
    setView({ mode: 'hub' });
  }
  function goNext() {
    if (view.mode !== 'section') return;
    const steps = stepsForSection(view.section, opts);
    const i = Math.max(0, steps.indexOf(view.stepId));
    if (i >= steps.length - 1) { backToHub(); return; }
    persist(true);
    setDirection('fwd');
    setView({ mode: 'section', section: view.section, stepId: steps[clampStepIndex(i + 1, steps.length)] });
  }
  function goBack() {
    if (view.mode !== 'section') return;
    const steps = stepsForSection(view.section, opts);
    const i = Math.max(0, steps.indexOf(view.stepId));
    if (i <= 0) { backToHub(); return; }
    persist(true);
    setDirection('back');
    setView({ mode: 'section', section: view.section, stepId: steps[clampStepIndex(i - 1, steps.length)] });
  }
  async function onExit() {
    await persist(true).catch(() => {});
    window.location.href = '/vendor/portal';
  }

  const touchStart = useRef<{ x: number; y: number } | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    const el = e.target as HTMLElement;
    if (el.closest('input,textarea,select,button,[data-no-swipe]')) { touchStart.current = null; return; }
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  function onTouchEnd(e: React.TouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) goNext(); else goBack();
  }

  const checklistItems = SECTION_ORDER.map((key) => ({
    key,
    label: t(`sec_${key}_label`),
    done: status[key],
    active: view.mode === 'section' && view.section === key,
  }));

  return (
    <div className={`vo ${ibmPlexSans.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="vo-shell">
        <aside className="vo-sidebar" aria-label={t('checklist_title')}>
          <div className="vo-sidebar-mark">NXT<span>//</span>LINK</div>
          <nav aria-label={t('checklist_title')}>
            <ul className="vo-checklist">
              {checklistItems.map((it) => (
                <li key={it.key}>
                  <button
                    type="button"
                    className={'vo-check-item' + (it.done ? ' done' : '') + (it.active ? ' active' : '')}
                    aria-current={it.active ? 'step' : undefined}
                    onClick={() => enterSection(it.key)}
                  >
                    <span className="vo-check-dot" aria-hidden="true">{it.done && <CheckDraw />}</span>
                    <span>{it.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <main className="vo-main">
          <header className="vo-top">
            <a className="vo-exit" href="/vendor/portal" onClick={(e) => { e.preventDefault(); onExit(); }}>{t('exit')}</a>
            <LanguageToggle lang={lang} onChange={switchLang} variant="light" />
          </header>

          <details className="vo-stripmobile">
            <summary>
              <span>{tf('strip_summary', { n: doneCount })}</span>
              <ChevronDown size={16} strokeWidth={2} aria-hidden="true" />
            </summary>
            <ul className="vo-checklist">
              {checklistItems.map((it) => (
                <li key={it.key}>
                  <button
                    type="button"
                    className={'vo-check-item' + (it.done ? ' done' : '') + (it.active ? ' active' : '')}
                    onClick={() => enterSection(it.key)}
                  >
                    <span className="vo-check-dot" aria-hidden="true">{it.done && <CheckDraw />}</span>
                    <span>{it.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </details>

          {view.mode === 'hub' ? (
            <div className="vo-hubwrap">
              <h1 className="vo-hub-h">{t('hub_h')}</h1>
              <p className="vo-hub-sub">{t('hub_sub')}</p>
              <p className="vo-hub-progress">{tf('hub_progress', { n: doneCount })}</p>
              {status.storefront && (
                <a className="vo-hub-preview" href={`/marketplace/vendor/${vendor.id}`} target="_blank" rel="noreferrer">
                  <ExternalLink size={14} strokeWidth={1.75} aria-hidden="true" />
                  {t('preview_storefront')}
                </a>
              )}
              <div className="vo-hub-grid">
                {SECTION_ORDER.map((key) => {
                  const Icon = SECTION_ICON[key];
                  const total = stepsForSection(key, opts).length;
                  const s = status[key];
                  return (
                    <button key={key} type="button" className={'vo-hub-card' + (s ? ' done' : '')} onClick={() => enterSection(key)}>
                      <span className="vo-hub-card-icon"><Icon size={20} strokeWidth={1.75} aria-hidden="true" /></span>
                      <span className="vo-hub-card-body">
                        <b>{t(`sec_${key}_label`)}</b>
                        <span className="vo-hub-card-blurb">{t(`sec_${key}_blurb`)}</span>
                        <span className={'vo-hub-card-status' + (s ? ' done' : '')}>
                          {s ? (<><CheckDraw />{t('status_complete')}</>) : (
                            key === 'agreement' ? t('status_not_started') : tf('status_progress', { done: 0, total })
                          )}
                        </span>
                      </span>
                      <ChevronRight size={18} strokeWidth={1.75} className="vo-hub-card-chevron" aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <SectionFlow
              view={view} opts={opts} lang={lang} t={t} tf={tf}
              vendor={vendor} set={set} toggle={toggle}
              logo={{ logoUrl, logoBusy, uploadLogo, removeLogo }}
              trust={{ certifications, photos, caseStudies, videos, videoBusy, addVideo, removeVideo }}
              agreementData={{
                listingCount, proofCount, agreement, agreementBusy, acceptTerms, inReview, vendorId: vendor.id,
              }}
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
              direction={direction}
              backToOverview={backToHub}
              onExit={onExit}
              onGoNext={goNext}
              onGoBack={goBack}
              saveError={saveError}
              showSaved={showSaved}
              savedLabel={t('saved')}
            />
          )}
        </main>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// One section's card-flow: header (Overview link + progress dots), the
// current card, and the footer (Back / Saved flash / Next-or-Done).
function SectionFlow({
  view, opts, lang, t, tf, vendor, set, toggle, logo, trust, agreementData,
  onTouchStart, onTouchEnd, direction, backToOverview, onGoNext, onGoBack,
  saveError, showSaved, savedLabel,
}: {
  view: Extract<View, { mode: 'section' }>;
  opts: { softwareOnly: boolean };
  lang: Lang;
  t: (k: string) => string;
  tf: (k: string, vals: Record<string, string | number>) => string;
  vendor: OnboardingVendor;
  set: <K extends keyof OnboardingVendor>(k: K, v: OnboardingVendor[K]) => void;
  toggle: (list: string[], v: string, key: 'categories' | 'service_areas' | 'industries' | 'client_types') => void;
  logo: { logoUrl: string | null; logoBusy: boolean; uploadLogo: (f: File) => void; removeLogo: () => void };
  trust: {
    certifications: { id: string; name: string; issuer: string | null }[];
    photos: { id: string; caption: string | null; image_url: string | null }[];
    caseStudies: { id: string; title: string }[];
    videos: { id: string; title: string | null; url: string }[];
    videoBusy: boolean;
    addVideo: (title: string, url: string) => Promise<boolean>;
    removeVideo: (id: string) => void;
  };
  agreementData: {
    listingCount: number; proofCount: number;
    agreement: { accepted: boolean; accepted_at: string | null } | null;
    agreementBusy: boolean; acceptTerms: () => Promise<boolean>; inReview: boolean; vendorId: string;
  };
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  direction: 'fwd' | 'back';
  backToOverview: () => void;
  onExit: () => void;
  onGoNext: () => void;
  onGoBack: () => void;
  saveError: boolean;
  showSaved: boolean;
  savedLabel: string;
}) {
  const steps = stepsForSection(view.section, opts);
  const index = Math.max(0, steps.indexOf(view.stepId));
  const isLast = index === steps.length - 1;
  const isTermsCard = view.section === 'agreement' && view.stepId === 'terms';
  const accepted = !!agreementData.agreement?.accepted;
  const Icon = STEP_ICON[view.stepId];

  return (
    <>
      <div className="vo-sectionhead">
        <button type="button" className="vo-overview-link" onClick={backToOverview}>
          &larr; {t('overview')}
        </button>
        <div className="vo-dots" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={index + 1}
          aria-label={tf('step_of', { n: index + 1, total: steps.length })}>
          {steps.map((s, i) => (
            <span key={s} className={'vo-dot' + (i < index ? ' done' : i === index ? ' current' : '')} />
          ))}
        </div>
      </div>

      <div className="vo-viewport" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div key={view.stepId} className={'vo-card ' + (direction === 'fwd' ? 'vo-in-fwd' : 'vo-in-back')}>
          {Icon && <span className="vo-cardicon" aria-hidden="true"><Icon size={20} strokeWidth={1.75} /></span>}
          {renderCard({
            section: view.section, step: view.stepId, headingId: `vo-h-${view.stepId}`,
            t, tf, lang, vendor, set, toggle, logo, trust, agreementData, Icon,
            softwareOnly: opts.softwareOnly,
          })}
        </div>
      </div>

      <footer className="vo-foot">
        {saveError && <p className="vo-error">{t('save_error')}</p>}
        <div className="vo-ctarow">
          <button type="button" className="vo-back" onClick={onGoBack}>{t('back')}</button>
          <span className={'vo-savedflash' + (showSaved ? ' show' : '')} aria-live="polite">
            {showSaved && <><Check size={13} strokeWidth={2.5} aria-hidden="true" />{savedLabel}</>}
          </span>
          {isTermsCard ? (
            accepted && <button type="button" className="vo-btn" onClick={backToOverview}>{t('done')}</button>
          ) : (
            <button type="button" className="vo-btn" onClick={onGoNext}>{isLast ? t('done') : t('next')}</button>
          )}
        </div>
      </footer>
    </>
  );
}

// ---------------------------------------------------------------------------
function renderCard(props: {
  section: SectionKey; step: StepId; headingId: string;
  t: (k: string) => string; tf: (k: string, vals: Record<string, string | number>) => string;
  lang: Lang; vendor: OnboardingVendor;
  set: <K extends keyof OnboardingVendor>(k: K, v: OnboardingVendor[K]) => void;
  toggle: (list: string[], v: string, key: 'categories' | 'service_areas' | 'industries' | 'client_types') => void;
  logo: { logoUrl: string | null; logoBusy: boolean; uploadLogo: (f: File) => void; removeLogo: () => void };
  trust: {
    certifications: { id: string; name: string; issuer: string | null }[];
    photos: { id: string; caption: string | null; image_url: string | null }[];
    caseStudies: { id: string; title: string }[];
    videos: { id: string; title: string | null; url: string }[];
    videoBusy: boolean;
    addVideo: (title: string, url: string) => Promise<boolean>;
    removeVideo: (id: string) => void;
  };
  agreementData: {
    listingCount: number; proofCount: number;
    agreement: { accepted: boolean; accepted_at: string | null } | null;
    agreementBusy: boolean; acceptTerms: () => Promise<boolean>; inReview: boolean; vendorId: string;
  };
  Icon?: LucideIcon;
  softwareOnly: boolean;
}) {
  const { step, headingId, t, tf, lang, vendor, set, toggle, logo, trust, agreementData } = props;

  switch (step) {
    // ---- Storefront -------------------------------------------------
    case 'name_logo':
      return (
        <>
          <h2 id={headingId} className="vo-h">{t('h_name_logo')}</h2>
          <div className="vo-logobox">
            {logo.logoUrl ? <img src={logo.logoUrl} alt="" /> : <LogoIcon size={26} strokeWidth={1.5} aria-hidden="true" />}
          </div>
          <label className="vo-filebtn">
            {logo.logoBusy ? t('logo_uploading') : logo.logoUrl ? t('logo_replace') : t('logo_upload')}
            <input
              type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" disabled={logo.logoBusy}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) logo.uploadLogo(f); e.target.value = ''; }}
            />
          </label>
          {logo.logoUrl && <button type="button" className="vo-textbtn" onClick={logo.removeLogo}>{t('logo_remove')}</button>}
          <div className="vo-fields" style={{ marginTop: 20 }}>
            <TextField label={t('company_label')} value={vendor.company_name || ''} onChange={(v) => set('company_name', v)} />
          </div>
        </>
      );

    case 'location_areas':
      return (
        <LocationAreasCard
          headingId={headingId} t={t} lang={lang}
          city={vendor.city || ''} onCityChange={(v) => set('city', v)}
          showAreas={showServiceAreasQuestion({ softwareOnly: props.softwareOnly })}
          serviceAreas={vendor.service_areas || []}
          onToggleArea={(v) => toggle(vendor.service_areas || [], v, 'service_areas')}
        />
      );

    case 'tagline_about': {
      const filled = templateFor(lang, vendor);
      const aboutHeadingId = `${headingId}-2`;
      return (
        <>
          <h2 id={headingId} className="vo-h">{t('h_tagline')}</h2>
          <input
            className="vo-bigfield" aria-labelledby={headingId} maxLength={160}
            value={vendor.tagline || ''} placeholder={t('ph_tagline')}
            onChange={(e) => set('tagline', e.target.value)}
          />
          <h3 id={aboutHeadingId} className="vo-h2">{t('h_about')}</h3>
          <textarea
            className="vo-bigfield vo-textarea" aria-labelledby={aboutHeadingId} rows={4}
            value={vendor.description || ''} placeholder={t('ph_about')}
            onChange={(e) => set('description', e.target.value)}
          />
          <button type="button" className="vo-textbtn" style={{ marginTop: 12 }} onClick={() => set('description', filled)}>
            {t('use_template')}
          </button>
        </>
      );
    }

    case 'contact':
      return (
        <>
          <h2 id={headingId} className="vo-h">{t('h_contact')}</h2>
          <div className="vo-fields">
            <TextField label={t('contact_name_label')} value={vendor.contact_name || ''} onChange={(v) => set('contact_name', v)} />
            <TextField label={t('website_label')} value={vendor.website || ''} onChange={(v) => set('website', v)} />
            <TextField label={t('phone_label')} value={vendor.phone || ''} onChange={(v) => set('phone', v)} inputMode="tel" />
          </div>
        </>
      );

    // ---- Capabilities -------------------------------------------------
    case 'industries':
      return (
        <>
          <h2 id={headingId} className="vo-h">{t('h_industries')}</h2>
          <p className="vo-sub">{t('sub_industries')}</p>
          <div role="group" aria-labelledby={headingId}>
            <ChipGroup
              options={Array.from(new Set([...INDUSTRIES, ...(vendor.industries || [])]))}
              selected={vendor.industries || []}
              onToggle={(v) => toggle(vendor.industries || [], v, 'industries')}
              icons={INDUSTRY_ICON}
            />
            <AddYourOwn
              placeholder={t('add_industry_ph')} addLabel={t('add_btn')} existing={vendor.industries || []}
              onAdd={(v) => set('industries', [...(vendor.industries || []), v])}
              listId="vo-industry-suggestions"
              suggestions={INDUSTRIES.filter((i) => !(vendor.industries || []).includes(i))}
            />
          </div>
        </>
      );

    case 'client_size':
      return (
        <>
          <h2 id={headingId} className="vo-h">{t('h_client_size')}</h2>
          <div role="group" aria-labelledby={headingId}>
            <IconCardGroup options={CLIENT_SIZES} selected={vendor.client_types || []} onToggle={(v) => toggle(vendor.client_types || [], v, 'client_types')} icons={CLIENT_SIZE_ICON} />
          </div>
        </>
      );

    case 'categories':
      return (
        <>
          <h2 id={headingId} className="vo-h">{t('h_categories')}</h2>
          <p className="vo-sub">{t('sub_categories')}</p>
          <div data-no-swipe className="vo-catwrap">
            <CategoryChipPicker selected={vendor.categories || []} onToggle={(v) => toggle(vendor.categories || [], v, 'categories')} lang={lang} />
          </div>
        </>
      );

    // ---- Trust & Proof --------------------------------------------------
    case 'proof':
      return (
        <>
          <h2 id={headingId} className="vo-h">{t('h_proof')}</h2>
          <p className="vo-sub">{t('sub_proof')}</p>
          <ul className="vo-prooftiles" aria-labelledby={headingId}>
            <li>
              <ProofTile
                href="/vendor/portal" Icon={ShieldCheck} label={t('h_certifications')} cta={t('certs_cta')}
                count={trust.certifications.length} emptyText={t('certs_empty')} addedLabel={t('proof_added')}
              />
            </li>
            <li>
              <ProofTile
                href="/vendor/portal" Icon={FileText} label={t('h_case_studies')} cta={t('cases_cta')}
                count={trust.caseStudies.length} emptyText={t('cases_empty')} addedLabel={t('proof_added')}
              />
            </li>
            <li>
              <ProofTile
                href="/vendor/portal" Icon={Camera} label={t('h_photos')} cta={t('photos_cta')}
                count={trust.photos.length} emptyText={t('photos_empty')} addedLabel={t('proof_added')}
              />
            </li>
          </ul>
        </>
      );

    case 'videos':
      return <VideosCard t={t} videos={trust.videos} videoBusy={trust.videoBusy} addVideo={trust.addVideo} removeVideo={trust.removeVideo} headingId={headingId} />;

    case 'awards':
      return (
        <>
          <h2 id={headingId} className="vo-h">{t('h_awards')}</h2>
          <p className="vo-sub">{t('sub_awards')}</p>
          {(vendor.achievements || []).length > 0 && (
            <div className="vo-chips">
              {(vendor.achievements || []).map((a) => (
                <button key={a} type="button" className="vo-chip on" onClick={() => set('achievements', (vendor.achievements || []).filter((x) => x !== a))}>
                  {a}<X size={12} strokeWidth={2} aria-hidden="true" />
                </button>
              ))}
            </div>
          )}
          <AddYourOwn
            placeholder={t('add_award_ph')} addLabel={t('add_btn')} existing={vendor.achievements || []}
            onAdd={(v) => set('achievements', [...(vendor.achievements || []), v])}
          />
        </>
      );

    // ---- Agreement & Activation -----------------------------------------
    case 'recap': {
      const categoriesCount = (vendor.categories || []).length;
      return (
        <>
          <h2 id={headingId} className="vo-h">{t('h_recap')}</h2>
          <p className="vo-sub">{t('sub_recap')}</p>
          <div className="vo-statrow">
            <StatTile value={agreementData.listingCount} label={t('stat_listings')} />
            <StatTile value={categoriesCount} label={t('stat_categories')} />
            <StatTile value={agreementData.proofCount} label={t('stat_proof')} />
          </div>
        </>
      );
    }

    case 'terms':
      return <TermsCard t={t} tf={tf} headingId={headingId} agreementData={agreementData} />;

    default:
      return null;
  }
}

function templateFor(lang: Lang, vendor: OnboardingVendor): string {
  const company = (vendor.company_name || '').trim() || (lang === 'es' ? '[Empresa]' : '[Company]');
  const industry = (vendor.industries || [])[0] || (lang === 'es' ? '[industria]' : '[industry]');
  const region = (vendor.city || '').trim() || (lang === 'es' ? 'el Borderplex' : 'the Borderplex');
  const service = (vendor.categories || [])[0] || (lang === 'es' ? '[servicio]' : '[service]');
  return lang === 'es'
    ? `${company} ofrece ${service} para ${industry} en ${region}. Con [X] años de experiencia…`
    : `${company} provides ${service} for ${industry} in ${region}. With [X] years of experience…`;
}

function VideosCard({ t, videos, videoBusy, addVideo, removeVideo, headingId }: {
  t: (k: string) => string;
  videos: { id: string; title: string | null; url: string }[];
  videoBusy: boolean;
  addVideo: (title: string, url: string) => Promise<boolean>;
  removeVideo: (id: string) => void;
  headingId: string;
}) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const submit = async () => {
    if (!url.trim()) return;
    const ok = await addVideo(title, url);
    if (ok) { setTitle(''); setUrl(''); }
  };
  return (
    <>
      <h2 id={headingId} className="vo-h">{t('h_videos')}</h2>
      <p className="vo-sub">{t('sub_videos')}</p>
      <div className="vo-videoform">
        <label className="sr-only" htmlFor="vo-video-title">{t('video_title_ph')}</label>
        <input id="vo-video-title" placeholder={t('video_title_ph')} value={title} onChange={(e) => setTitle(e.target.value)} />
        <label className="sr-only" htmlFor="vo-video-url">{t('video_url_ph')}</label>
        <input id="vo-video-url" placeholder={t('video_url_ph')} value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
        <button type="button" className="vo-textbtn" disabled={videoBusy} onClick={submit}>{t('video_add')}</button>
      </div>
      {videos.length > 0 ? (
        <ul className="vo-summarylist">
          {videos.map((v) => (
            <li key={v.id} className="vo-videorow">
              <a href={v.url} target="_blank" rel="noreferrer">{v.title || v.url}</a>
              <button type="button" className="vo-textbtn sm" onClick={() => removeVideo(v.id)}>{t('video_remove')}</button>
            </li>
          ))}
        </ul>
      ) : <p className="vo-summaryempty">{t('videos_empty')}</p>}
    </>
  );
}

function TermsCard({ t, tf, headingId, agreementData }: {
  t: (k: string) => string;
  tf: (k: string, vals: Record<string, string | number>) => string;
  headingId: string;
  agreementData: {
    agreement: { accepted: boolean; accepted_at: string | null; summary?: string; terms?: { title: string; body: string }[] } | null;
    agreementBusy: boolean; acceptTerms: () => Promise<boolean>; inReview: boolean; vendorId: string;
  };
}) {
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState(false);
  const { agreement, agreementBusy, acceptTerms, inReview, vendorId } = agreementData;

  const rows = useMemo(() => {
    const terms = agreement?.terms || [];
    const map: { title: string; rowKey: string }[] = [
      { title: 'Commission on NXT//LINK deals', rowKey: 'terms_row_pay' },
      { title: 'Protected period', rowKey: 'terms_row_protected' },
      { title: 'No going around the platform', rowKey: 'terms_row_stay' },
      { title: 'Accurate listings', rowKey: 'terms_row_accurate' },
    ];
    return map
      .map((m) => {
        const term = terms.find((x) => x.title === m.title);
        return term ? { label: t(m.rowKey), body: term.body } : null;
      })
      .filter((r): r is { label: string; body: string } => !!r);
  }, [agreement, t]);

  if (agreement?.accepted) {
    return (
      <>
        <h2 id={headingId} className="vo-h">{t('accepted_h')}</h2>
        <div className="vo-accepted">
          <span className="vo-check-dot lg" aria-hidden="true"><CheckDraw /></span>
          <div>
            {agreement.accepted_at && <p>{tf('accepted_on', { date: new Date(agreement.accepted_at).toLocaleDateString() })}</p>}
            <p>{inReview ? t('accepted_review') : t('accepted_live')}</p>
          </div>
        </div>
        <a className="vo-btn vo-previewbtn" href={`/marketplace/vendor/${vendorId}`} target="_blank" rel="noreferrer">
          <ExternalLink size={15} strokeWidth={1.75} aria-hidden="true" />
          {t('preview_storefront')}
        </a>
      </>
    );
  }

  async function onActivate() {
    setError(false);
    const ok = await acceptTerms();
    if (!ok) setError(true);
  }

  return (
    <>
      <h2 id={headingId} className="vo-h">{t('h_terms')}</h2>
      <div className="vo-table-wrap">
        <table className="vo-table">
          <tbody>
            {rows.length > 0 ? rows.map((r) => (
              <tr key={r.label}>
                <th scope="row">{r.label}</th>
                <td>{r.body}</td>
              </tr>
            )) : (
              <tr><td colSpan={2}>{t('loading')}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="vo-terms-disclaimer">
        {t('terms_disclaimer')} <a href="/terms" target="_blank" rel="noreferrer">{t('terms_full_link')}</a>
      </p>
      <p className="vo-reassure-main">{t('reassure_main')}</p>
      <p className="vo-reassure-sub">{t('reassure_sub')}</p>
      <label className="vo-checkboxrow">
        <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
        <span>{t('accept_checkbox')}</span>
      </label>
      {error && <p className="vo-error">{t('activate_error')}</p>}
      <button type="button" className="vo-btn vo-activate" disabled={!checked || agreementBusy} onClick={onActivate}>
        {t('activate_btn')}
      </button>
    </>
  );
}

function StatTile({ value, label }: { value: number; label: string }) {
  return (
    <div className="vo-stat">
      <span className="vo-stat-value">{value}</span>
      <span className="vo-stat-label">{label}</span>
    </div>
  );
}

// A small self-drawing checkmark for "done" states — reduced-motion safe via
// the global `@media (prefers-reduced-motion: reduce)` rule in globals.css,
// which collapses every animation/transition duration app-wide (including
// this one) to near-zero.
function CheckDraw() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8.5 6.5 12 13 4.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="vo-checkdraw" />
    </svg>
  );
}

function TextField({ label, value, onChange, inputMode }: {
  label: string; value: string; onChange: (v: string) => void; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
}) {
  return (
    <label className="vo-field">
      <span>{label}</span>
      <input value={value} inputMode={inputMode} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function ChipGroup({ options, selected, onToggle, icons }: {
  options: string[]; selected: string[]; onToggle: (v: string) => void; icons?: Record<string, LucideIcon>;
}) {
  return (
    <div className="vo-chips">
      {options.map((o) => {
        const on = selected.includes(o);
        const Icon = icons?.[o];
        return (
          <button key={o} type="button" className={'vo-chip' + (on ? ' on' : '')} aria-pressed={on} onClick={() => onToggle(o)}>
            {Icon && <Icon size={15} strokeWidth={1.75} aria-hidden="true" />}
            <span>{o}</span>
            {on && <Check size={13} strokeWidth={2.5} className="vo-chip-check" aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}

// Client-size / company-scale picker as icon cards (bigger tap targets, a
// building-scale icon per option) instead of plain text chips — the same
// selected-state contract (violet fill + check) as ChipGroup, just a
// roomier layout for a 4-option single-purpose card.
function IconCardGroup({ options, selected, onToggle, icons }: {
  options: string[]; selected: string[]; onToggle: (v: string) => void; icons: Record<string, LucideIcon>;
}) {
  return (
    <div className="vo-iconcards">
      {options.map((o) => {
        const on = selected.includes(o);
        const Icon = icons[o];
        return (
          <button key={o} type="button" className={'vo-iconcard' + (on ? ' on' : '')} aria-pressed={on} onClick={() => onToggle(o)}>
            {Icon && <span className="vo-iconcard-icon"><Icon size={22} strokeWidth={1.75} aria-hidden="true" /></span>}
            <span className="vo-iconcard-label">{o}</span>
            {on && <span className="vo-iconcard-check" aria-hidden="true"><Check size={13} strokeWidth={2.5} /></span>}
          </button>
        );
      })}
    </div>
  );
}

// `suggestions` (+ `listId`) are optional — when passed, they wire up a
// native <datalist> so typing shows rules-based autocomplete options (e.g.
// the known industry vocabulary). No AI involved, same static-list pattern
// as the "Use a template" button. Free typing always still works.
function AddYourOwn({ placeholder, addLabel, existing, onAdd, suggestions, listId }: {
  placeholder: string; addLabel: string; existing: string[]; onAdd: (v: string) => void;
  suggestions?: string[]; listId?: string;
}) {
  const [v, setV] = useState('');
  const add = () => {
    const val = v.trim();
    if (!val) return;
    if (!existing.some((x) => x.toLowerCase() === val.toLowerCase())) onAdd(val);
    setV('');
  };
  return (
    <div className="vo-addown">
      <input
        value={v} placeholder={placeholder} list={suggestions ? listId : undefined}
        onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
      />
      {suggestions && suggestions.length > 0 && (
        <datalist id={listId}>
          {suggestions.map((s) => <option key={s} value={s} />)}
        </datalist>
      )}
      <button type="button" className="vo-textbtn" onClick={add}>{addLabel}</button>
    </div>
  );
}

// Paired card: "where is your business located?" (button-first — tap a
// common Borderplex region, or "Somewhere else" to reveal free text) plus,
// for vendors with a physical service area, "where do you provide service?"
// underneath as the card's second question (2026-07-30 pairing rule: up to
// two closely related questions may share one card). Buttons store whichever
// language's label the vendor is currently reading (same as any other free
// text in this flow — content isn't auto-translated when the UI toggles),
// and re-match against EITHER language on re-render so a value picked in one
// language still highlights correctly after a language switch.
const LOCATION_REGIONS = ['loc_region_ep', 'loc_region_jz', 'loc_region_lc', 'loc_region_chi'] as const;

function LocationAreasCard({ headingId, t, lang, city, onCityChange, showAreas, serviceAreas, onToggleArea }: {
  headingId: string;
  t: (k: string) => string;
  lang: Lang;
  city: string;
  onCityChange: (v: string) => void;
  showAreas: boolean;
  serviceAreas: string[];
  onToggleArea: (v: string) => void;
}) {
  const trimmed = city.trim().toLowerCase();
  const matchedKey = LOCATION_REGIONS.find((key) => {
    const pair = TR[key];
    return trimmed.length > 0 && (trimmed === pair.en.toLowerCase() || trimmed === pair.es.toLowerCase());
  });
  const [otherOpen, setOtherOpen] = useState(!matchedKey && city.trim().length > 0);

  return (
    <>
      <h2 id={headingId} className="vo-h">{t('h_location')}</h2>
      <div className="vo-chips" role="group" aria-labelledby={headingId}>
        {LOCATION_REGIONS.map((key) => {
          const label = lang === 'es' ? TR[key].es : TR[key].en;
          const on = key === matchedKey && !otherOpen;
          return (
            <button
              key={key} type="button" className={'vo-chip' + (on ? ' on' : '')} aria-pressed={on}
              onClick={() => { onCityChange(label); setOtherOpen(false); }}
            >
              <span>{label}</span>
              {on && <Check size={13} strokeWidth={2.5} className="vo-chip-check" aria-hidden="true" />}
            </button>
          );
        })}
        <button
          type="button" className={'vo-chip' + (otherOpen ? ' on' : '')} aria-pressed={otherOpen}
          onClick={() => { setOtherOpen(true); if (matchedKey) onCityChange(''); }}
        >
          <span>{t('loc_other')}</span>
          {otherOpen && <Check size={13} strokeWidth={2.5} className="vo-chip-check" aria-hidden="true" />}
        </button>
      </div>
      {otherOpen && (
        <input
          className="vo-bigfield" style={{ marginTop: 12 }} aria-label={t('h_location')} maxLength={160}
          value={city} placeholder={t('ph_location_other')}
          onChange={(e) => onCityChange(e.target.value)}
        />
      )}

      {showAreas && (
        <>
          <h3 id={`${headingId}-2`} className="vo-h2">{t('h_service_areas')}</h3>
          <div role="group" aria-labelledby={`${headingId}-2`}>
            <ChipGroup options={AREAS} selected={serviceAreas} onToggle={onToggleArea} />
          </div>
        </>
      )}
    </>
  );
}

// One Trust & Proof tile: a full-tile link out to the richer portal editor
// for a proof type this flow doesn't re-implement (file uploads / multi-field
// forms). The visible label stays short; `cta` (e.g. "Add certifications in
// your portal") is the link's accessible name so screen-reader users get the
// full context without a visible second line per tile.
function ProofTile({ href, Icon, label, cta, count, emptyText, addedLabel }: {
  href: string; Icon: LucideIcon; label: string; cta: string;
  count: number; emptyText: string; addedLabel: string;
}) {
  return (
    <a className="vo-prooftile" href={href} aria-label={cta}>
      <span className="vo-prooftile-icon" aria-hidden="true"><Icon size={18} strokeWidth={1.75} /></span>
      <span className="vo-prooftile-body">
        <b>{label}</b>
        <span className={'vo-prooftile-status' + (count > 0 ? ' done' : '')}>
          {count > 0 ? `${addedLabel} · ${count}` : emptyText}
        </span>
      </span>
      <ExternalLink size={14} strokeWidth={2} className="vo-prooftile-arrow" aria-hidden="true" />
    </a>
  );
}

const CSS = `
.vo{--bg:#F8F7FB;--surf:#fff;--ink:#141320;--muted:#615F72;--muted2:#8A87A0;--line:#E2DFEC;--p:#6C5CE0;--pd:#4A3DB0;--pbg:rgba(108,92,224,.1);--green:#2F9E6A;--sans:var(--font-ibm-plex-sans-vo2),'IBM Plex Sans',system-ui,sans-serif;--serif:var(--font-space-grotesk),'Space Grotesk',Georgia,serif;--shadow:0 4px 12px rgba(124,58,237,.08);
  height:100dvh;display:flex;flex-direction:column;background:var(--bg);color:var(--ink);font-family:var(--sans);-webkit-font-smoothing:antialiased;overflow:hidden;}
.vo *{box-sizing:border-box;}
.vo a:focus-visible,.vo button:focus-visible,.vo input:focus-visible,.vo textarea:focus-visible{outline:2px solid var(--p);outline-offset:2px;}
.vo .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}
.vo-center{flex:1;display:grid;place-items:center;color:var(--muted);font-size:14px;}
.vo-gate{max-width:400px;margin:auto;text-align:center;background:var(--surf);border:1px solid var(--line);border-radius:20px;padding:32px;box-shadow:var(--shadow);}
.vo-gate h1{font-family:var(--serif);font-size:22px;font-weight:700;margin:0 0 8px;}
.vo-gate p{color:var(--muted);font-size:14px;line-height:1.6;margin:0 0 20px;}

.vo-shell{flex:1;min-height:0;display:flex;}
.vo-sidebar{display:none;width:240px;flex-shrink:0;flex-direction:column;gap:20px;padding:24px 20px;border-right:1px solid var(--line);background:var(--surf);overflow-y:auto;}
.vo-sidebar-mark{font-family:var(--serif);font-weight:700;font-size:15px;letter-spacing:-.01em;}
.vo-sidebar-mark span{color:var(--p);}
.vo-checklist{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px;}
.vo-check-item{width:100%;display:flex;align-items:center;gap:10px;background:none;border:none;text-align:left;font-family:var(--sans);font-size:14px;font-weight:600;color:var(--muted);padding:10px 8px;border-radius:10px;cursor:pointer;min-height:44px;}
.vo-check-item:hover{background:var(--bg);}
.vo-check-item.active{color:var(--pd);background:var(--pbg);}
.vo-check-item.done{color:var(--ink);}
.vo-check-dot{width:20px;height:20px;flex-shrink:0;border-radius:50%;border:1.5px solid #C7C2DE;display:grid;place-items:center;color:#fff;}
.vo-check-item.done .vo-check-dot{background:var(--green);border-color:transparent;}
.vo-check-dot.lg{width:28px;height:28px;}
.vo-checkdraw{stroke-dasharray:20;stroke-dashoffset:20;animation:vo-draw 420ms ease-out forwards;}
@keyframes vo-draw{to{stroke-dashoffset:0;}}

.vo-stripmobile{display:block;border-bottom:1px solid var(--line);background:var(--surf);flex-shrink:0;}
.vo-stripmobile summary{list-style:none;display:flex;align-items:center;justify-content:space-between;padding:12px 16px;font-size:13.5px;font-weight:600;color:var(--muted);cursor:pointer;min-height:44px;}
.vo-stripmobile summary::-webkit-details-marker{display:none;}
.vo-stripmobile[open] summary{color:var(--ink);}
.vo-stripmobile .vo-checklist{padding:0 12px 12px;}

.vo-main{flex:1;min-width:0;display:flex;flex-direction:column;overflow:hidden;}
.vo-top{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;flex-shrink:0;}
.vo-exit{font-size:13px;font-weight:500;color:var(--muted);text-decoration:none;padding:8px;border-radius:8px;}
.vo-exit:hover{color:var(--ink);}

.vo-hubwrap{flex:1;overflow-y:auto;padding:8px 24px 32px;max-width:680px;margin:0 auto;width:100%;}
.vo-hub-h{font-family:var(--serif);font-size:28px;font-weight:700;letter-spacing:-.02em;margin:8px 0 8px;}
.vo-hub-sub{font-size:15px;color:var(--muted);line-height:1.5;margin:0 0 16px;max-width:520px;}
.vo-hub-progress{font-size:13px;font-weight:600;color:var(--pd);margin:0 0 8px;}
.vo-hub-preview{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--pd);text-decoration:none;padding:6px 0;margin:0 0 16px;min-height:44px;}
.vo-hub-preview:hover{color:var(--p);text-decoration:underline;}
.vo-hub-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
.vo-hub-card{display:flex;align-items:flex-start;gap:12px;text-align:left;background:var(--surf);border:1px solid var(--line);border-radius:16px;padding:20px;cursor:pointer;box-shadow:var(--shadow);transition:transform 150ms ease,box-shadow 150ms ease,border-color var(--spec-duration-reveal,220ms) var(--spec-ease,ease),background var(--spec-duration-reveal,220ms) var(--spec-ease,ease);}
.vo-hub-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(124,58,237,.1);}
.vo-hub-card.done{border-color:rgba(47,158,106,.35);background:#F5FBF8;}
.vo-hub-card-icon{width:40px;height:40px;border-radius:12px;background:var(--bg);color:var(--ink);display:grid;place-items:center;flex-shrink:0;}
.vo-hub-card-body{display:flex;flex-direction:column;gap:4px;flex:1;min-width:0;}
.vo-hub-card-body b{font-size:15px;font-weight:700;}
.vo-hub-card-blurb{font-size:12.5px;color:var(--muted);line-height:1.4;}
.vo-hub-card-status{display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:600;color:var(--muted2);margin-top:4px;}
.vo-hub-card-status.done{color:var(--green);}
.vo-hub-card-chevron{color:var(--muted2);flex-shrink:0;margin-top:2px;}

.vo-sectionhead{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:0 20px 8px;flex-shrink:0;flex-wrap:wrap;}
.vo-overview-link{background:none;border:none;font-family:var(--sans);font-size:13px;font-weight:600;color:var(--muted);cursor:pointer;padding:8px 4px;min-height:44px;}
.vo-overview-link:hover{color:var(--pd);}
.vo-dots{display:flex;gap:6px;}
.vo-dot{flex:1;max-width:40px;height:4px;border-radius:99px;background:var(--line);transition:background var(--spec-duration-reveal,220ms) var(--spec-ease,ease),opacity var(--spec-duration-reveal,220ms) var(--spec-ease,ease);}
.vo-dot.done{background:var(--p);opacity:.5;}
.vo-dot.current{background:var(--p);}
.vo-cardicon{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:12px;background:var(--pbg);color:var(--pd);margin-bottom:14px;flex-shrink:0;}

.vo-viewport{flex:1;min-height:0;display:flex;overflow:hidden;padding:0 20px;}
.vo-card{flex:1;min-height:0;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;max-width:520px;margin:0 auto;width:100%;overflow-y:auto;padding:16px 0;}
.vo-in-fwd{animation:voInFwd 200ms cubic-bezier(0,0,.2,1);}
.vo-in-back{animation:voInBack 200ms cubic-bezier(0,0,.2,1);}
@keyframes voInFwd{from{opacity:0;transform:translateX(24px);}to{opacity:1;transform:translateX(0);}}
@keyframes voInBack{from{opacity:0;transform:translateX(-24px);}to{opacity:1;transform:translateX(0);}}
.vo-h{font-family:var(--serif);font-size:28px;font-weight:700;letter-spacing:-.02em;line-height:1.2;margin:0 0 8px;}
.vo-h2{font-family:var(--sans);font-size:15px;font-weight:700;color:var(--ink);margin:28px 0 8px;}
.vo-sub{font-size:15px;font-weight:400;color:var(--muted);line-height:1.5;margin:0 0 24px;max-width:440px;}
.vo-fields{display:flex;flex-direction:column;gap:16px;width:100%;margin-top:8px;}
.vo-field{display:flex;flex-direction:column;gap:8px;font-size:13px;font-weight:600;color:var(--muted);width:100%;}
.vo-field input{font-family:var(--sans);padding:14px 16px;border-radius:12px;border:1px solid var(--line);background:var(--surf);color:var(--ink);font-size:16px;font-weight:400;outline:none;min-height:48px;width:100%;}
.vo-field input:focus{border-color:var(--p);box-shadow:0 0 0 3px var(--pbg);}
.vo-bigfield{font-family:var(--sans);width:100%;padding:16px;border-radius:12px;border:1px solid var(--line);background:var(--surf);color:var(--ink);font-size:16px;font-weight:400;outline:none;margin-top:8px;resize:none;}
.vo-bigfield::placeholder{color:var(--muted2);}
.vo-bigfield:focus{border-color:var(--p);box-shadow:0 0 0 3px var(--pbg);}
.vo-textarea{line-height:1.6;}
.vo-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;}
.vo-chip{font-family:var(--sans);display:inline-flex;align-items:center;gap:6px;padding:11px 16px;min-height:44px;border-radius:99px;border:1px solid var(--line);background:var(--surf);color:var(--ink);font-size:14px;font-weight:400;cursor:pointer;transition:transform var(--spec-duration-fast,150ms) var(--spec-ease,ease),border-color var(--spec-duration-fast,150ms) var(--spec-ease,ease),background var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.vo-chip:hover{border-color:var(--p);}
.vo-chip:active{transform:scale(.96);}
.vo-chip.on{background:var(--pbg);border-color:var(--p);color:var(--pd);font-weight:600;animation:voChipIn var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.vo-chip-check{color:var(--p);flex-shrink:0;}
@keyframes voChipIn{from{opacity:.4;transform:scale(.92);}to{opacity:1;transform:scale(1);}}
.vo-addown{display:flex;gap:8px;margin-top:16px;}
.vo-addown input{flex:1;font-family:var(--sans);padding:12px 14px;min-height:44px;border-radius:10px;border:1px solid var(--line);background:var(--surf);color:var(--ink);font-size:14px;outline:none;}
.vo-addown input:focus{border-color:var(--p);}
.vo-textbtn{font-family:var(--sans);background:none;border:1px solid var(--line);color:var(--pd);font-size:13px;font-weight:600;padding:11px 16px;min-height:44px;border-radius:10px;cursor:pointer;}
.vo-textbtn:hover{border-color:var(--p);background:var(--pbg);}
.vo-textbtn.sm{padding:6px 12px;min-height:32px;font-size:12px;}
.vo-textbtn:disabled{opacity:.5;cursor:default;}
.vo-logobox{width:96px;height:96px;border-radius:20px;border:1px solid var(--line);background:var(--surf);display:grid;place-items:center;overflow:hidden;color:var(--muted2);margin-bottom:20px;}
.vo-logobox img{width:100%;height:100%;object-fit:contain;}
.vo-filebtn{position:relative;overflow:hidden;display:inline-block;font-family:var(--sans);background:var(--surf);border:1px solid var(--line);color:var(--ink);font-size:14px;font-weight:600;padding:12px 20px;min-height:48px;border-radius:12px;cursor:pointer;margin-bottom:10px;}
.vo-filebtn:hover{border-color:var(--p);}
.vo-filebtn input{position:absolute;inset:0;opacity:0;cursor:pointer;font-size:0;}
.vo-catwrap{width:100%;margin-top:4px;}
.vo-iconcards{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px;width:100%;}
.vo-iconcard{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:10px;padding:16px;min-height:88px;border-radius:14px;border:1px solid var(--line);background:var(--surf);color:var(--ink);font-family:var(--sans);font-size:13.5px;font-weight:600;text-align:left;cursor:pointer;transition:transform var(--spec-duration-fast,150ms) var(--spec-ease,ease),border-color var(--spec-duration-fast,150ms) var(--spec-ease,ease),background var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.vo-iconcard:hover{border-color:var(--p);}
.vo-iconcard:active{transform:scale(.97);}
.vo-iconcard.on{background:var(--pbg);border-color:var(--p);color:var(--pd);animation:voChipIn var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.vo-iconcard-icon{width:36px;height:36px;border-radius:10px;background:var(--bg);color:var(--ink);display:grid;place-items:center;}
.vo-iconcard.on .vo-iconcard-icon{background:#fff;color:var(--p);}
.vo-iconcard-label{line-height:1.3;}
.vo-iconcard-check{position:absolute;top:10px;right:10px;width:18px;height:18px;color:var(--p);display:grid;place-items:center;}

.vo-catpicker{width:100%;}
.vo-catchips{margin-bottom:4px;}
.vo-catsearch-row{position:relative;display:flex;align-items:center;margin-top:8px;}
.vo-catsearch-icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--muted2);pointer-events:none;}
.vo-catsearch-input{width:100%;font-family:var(--sans);padding:13px 16px 13px 40px;min-height:48px;border-radius:12px;border:1px solid var(--line);background:var(--surf);color:var(--ink);font-size:16px;outline:none;}
.vo-catsearch-input:focus{border-color:var(--p);box-shadow:0 0 0 3px var(--pbg);}
.vo-catsuggest{margin-top:8px;}
.vo-catsuglist{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:var(--surf);}
.vo-catsugbtn{width:100%;display:flex;align-items:center;gap:8px;font-family:var(--sans);font-size:14px;color:var(--ink);background:none;border:none;text-align:left;padding:12px 14px;min-height:44px;cursor:pointer;}
.vo-catsugbtn:hover,.vo-catsugbtn:focus-visible{background:var(--bg);}
.vo-catsugbtn svg{color:var(--p);flex-shrink:0;}
.vo-catnoresults{font-size:13.5px;color:var(--muted);padding:10px 2px;margin:0;}
.vo-catpopular{margin-top:20px;}
.vo-catpopular-h{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--muted2);margin:0 0 8px;}

.vo-prooftiles{list-style:none;margin:0 0 8px;padding:0;display:flex;flex-direction:column;gap:8px;width:100%;}
.vo-prooftile{display:flex;align-items:center;gap:12px;padding:14px 16px;border:1px solid var(--line);border-radius:12px;background:var(--surf);text-decoration:none;color:var(--ink);min-height:48px;}
.vo-prooftile:hover{border-color:var(--p);}
.vo-prooftile-icon{width:36px;height:36px;border-radius:10px;background:var(--bg);color:var(--ink);display:grid;place-items:center;flex-shrink:0;}
.vo-prooftile-body{display:flex;flex-direction:column;gap:2px;flex:1;min-width:0;}
.vo-prooftile-body b{font-size:14px;font-weight:600;}
.vo-prooftile-status{font-size:12.5px;color:var(--muted);}
.vo-prooftile-status.done{color:var(--green);font-weight:600;}
.vo-prooftile-arrow{color:var(--muted2);flex-shrink:0;}
.vo-summarylist{list-style:none;margin:0 0 16px;padding:0;display:flex;flex-direction:column;gap:8px;width:100%;}
.vo-summarylist li{font-size:14px;padding:12px 14px;border:1px solid var(--line);border-radius:10px;background:var(--surf);}
.vo-videorow{display:flex;align-items:center;justify-content:space-between;gap:12px;}
.vo-videorow a{color:var(--ink);text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.vo-videorow a:hover{color:var(--pd);}
.vo-summaryempty{font-size:14px;color:var(--muted);margin:0 0 16px;}
.vo-deeplink{display:inline-flex;align-items:center;gap:6px;font-size:13.5px;font-weight:600;color:var(--pd);text-decoration:none;padding:4px 0;min-height:44px;}
.vo-deeplink:hover{color:var(--p);}
.vo-photogrid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;width:100%;margin-bottom:16px;}
.vo-photothumb{aspect-ratio:1;border-radius:10px;overflow:hidden;background:var(--bg);border:1px solid var(--line);}
.vo-photothumb img{width:100%;height:100%;object-fit:cover;}
.vo-videoform{display:flex;flex-direction:column;gap:8px;width:100%;margin-bottom:16px;}
.vo-videoform input{font-family:var(--sans);padding:12px 14px;min-height:44px;border-radius:10px;border:1px solid var(--line);background:var(--surf);color:var(--ink);font-size:14px;outline:none;}
.vo-videoform input:focus{border-color:var(--p);}

.vo-statrow{display:flex;gap:24px;flex-wrap:wrap;margin-top:8px;}
.vo-stat{display:flex;flex-direction:column;gap:2px;}
.vo-stat-value{font-family:var(--serif);font-size:32px;font-weight:700;color:var(--ink);line-height:1;}
.vo-stat-label{font-size:12.5px;color:var(--muted);font-weight:500;}

.vo-table-wrap{width:100%;overflow-x:auto;border:1px solid var(--line);border-radius:14px;margin-bottom:16px;}
.vo-table{width:100%;border-collapse:collapse;font-size:13.5px;}
.vo-table tr+tr th,.vo-table tr+tr td{border-top:1px solid var(--line);}
.vo-table th{text-align:left;font-weight:700;color:var(--ink);padding:14px 16px;white-space:nowrap;vertical-align:top;width:38%;background:var(--bg);}
.vo-table td{padding:14px 16px;color:var(--muted);line-height:1.55;vertical-align:top;}
.vo-terms-disclaimer{font-size:12px;color:var(--muted2);line-height:1.6;margin:0 0 20px;}
.vo-terms-disclaimer a{color:var(--pd);}
.vo-reassure-main{font-size:14px;font-weight:600;color:var(--ink);margin:0 0 4px;}
.vo-reassure-sub{font-size:12.5px;color:var(--muted);margin:0 0 20px;line-height:1.5;}
.vo-checkboxrow{display:flex;align-items:flex-start;gap:10px;font-size:14px;font-weight:600;color:var(--ink);padding:8px 0;cursor:pointer;min-height:44px;}
.vo-checkboxrow input{width:20px;height:20px;flex-shrink:0;margin-top:1px;accent-color:var(--p);}
.vo-activate{margin-top:16px;width:100%;}
.vo-accepted{display:flex;gap:12px;align-items:flex-start;background:#E9F7F0;border:1px solid rgba(47,158,106,.3);border-radius:14px;padding:16px 18px;}
.vo-accepted p{margin:0 0 4px;font-size:13.5px;color:#1F7A54;line-height:1.5;}
.vo-previewbtn{margin-top:16px;gap:8px;}

.vo-foot{flex-shrink:0;padding:16px 20px calc(16px + env(safe-area-inset-bottom));border-top:1px solid var(--line);background:rgba(248,247,251,.92);backdrop-filter:blur(16px);}
.vo-error{color:#CE4B43;font-size:13px;margin:0 0 10px;text-align:center;}
.vo-ctarow{display:flex;align-items:center;justify-content:space-between;gap:12px;max-width:520px;margin:0 auto;}
.vo-back{font-family:var(--sans);background:none;border:none;color:var(--muted);font-size:14px;font-weight:600;padding:14px 12px;min-height:48px;border-radius:10px;cursor:pointer;transition:color 150ms ease,transform 100ms ease;}
.vo-back:hover{color:var(--ink);}
.vo-back:active{transform:scale(.98);}
.vo-savedflash{display:inline-flex;align-items:center;gap:5px;font-size:12.5px;font-weight:600;color:var(--green);opacity:0;transition:opacity 200ms ease-out;flex-shrink:0;}
.vo-savedflash.show{opacity:1;}
.vo-btn{font-family:var(--sans);border:none;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;font-size:15px;font-weight:600;border-radius:12px;padding:14px 28px;min-height:48px;min-width:112px;background:var(--p);color:#fff;box-shadow:var(--shadow);transition:background 150ms ease;}
.vo-btn:hover{background:var(--pd);}
.vo-btn:active{transform:scale(.98);}
.vo-btn:disabled{opacity:.45;cursor:default;}

@media(min-width:900px){.vo-sidebar{display:flex;}.vo-stripmobile{display:none;}}
@media(max-width:480px){.vo-h{font-size:24px;}.vo-hub-h{font-size:24px;}.vo-hub-grid{grid-template-columns:1fr;}.vo-top{padding:14px 16px;}.vo-sectionhead{padding:0 16px 8px;}.vo-viewport{padding:0 16px;}.vo-foot{padding:14px 16px calc(14px + env(safe-area-inset-bottom));}.vo-hubwrap{padding:8px 16px 24px;}.vo-photogrid{grid-template-columns:repeat(3,1fr);}}
`;
