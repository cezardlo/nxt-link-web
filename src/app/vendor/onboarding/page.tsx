'use client';

// Vendor onboarding — Uber-driver-signup-style card flow (Slice S1, the
// SHELL). Presents the EXISTING vendor profile fields (src/app/vendor/portal
// /page.tsx) as a full-screen, one-concept-per-card guided flow instead of
// the "monster page" of scrolling sections. This is a NEW, parallel route —
// the portal page is untouched and still fully functional; Cesar reviews
// this on his phone before it replaces anything.
//
// Scope (see workplace/plans/vendor-onboarding-uber-flow-2026-07-29.md, S1):
// - No new data. Every field here already exists on vendor_profiles and is
//   saved through the SAME /api/vendor/profile PATCH the portal uses (see
//   useVendorOnboardingProfile.ts for why that's a mirrored copy, not an
//   import, of the portal's persist()/autosave logic).
// - No AI in the flow (guardrail) — the portal's "Write it for me" AI
//   description button is deliberately NOT reproduced here.
// - CategoryPicker is embedded exactly as-is (S3 will redo category search;
//   this slice must not touch that shared component).
// - The checklist / ProfileStrengthMeter / AI chat do not appear here
//   (progressive disclosure) — the closing card just links back to the
//   portal for now (S5 will replace that with the real "you're online"
//   dashboard).

import { useEffect, useMemo, useRef, useState } from 'react';
import { IBM_Plex_Sans } from 'next/font/google';
import {
  Image as LogoIcon, Building2, Phone, Quote, FileText, Factory, Users, Target,
  Boxes, MapPin, Award, PartyPopper, Check, X, type LucideIcon,
} from 'lucide-react';
import CategoryPicker from '@/components/CategoryPicker';
import LanguageToggle, { useLang } from '@/components/LanguageToggle';
import { ALL_STEPS, clampStepIndex, getVisibleContentSteps, getVisibleSteps, type StepId } from './steps';
import { useVendorOnboardingProfile, type OnboardingVendor } from './useVendorOnboardingProfile';

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans-vob',
  display: 'swap',
});

// Mirrors the taxonomy lists in src/app/vendor/portal/page.tsx (not exported
// there, and that page stays untouched for this slice — see file header).
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
const CLIENT_SIZES = [
  'Small businesses (1–50 people)', 'Mid-size companies (51–500)', 'Large companies (500+)', 'Enterprise / Fortune 500',
];

type Lang = 'en' | 'es';
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
  saved: { en: 'Saved', es: 'Guardado' },
  save_error: { en: 'Could not save — check your connection.', es: 'No se pudo guardar — revisa tu conexión.' },
  step_of: { en: 'Step {n} of {total}', es: 'Paso {n} de {total}' },

  h_logo: { en: 'Add your logo', es: 'Agrega tu logo' },
  sub_logo: { en: 'Buyers trust a real logo. You can add this anytime.', es: 'Los compradores confían más con un logo real. Puedes agregarlo cuando quieras.' },
  logo_upload: { en: 'Upload logo', es: 'Subir logo' },
  logo_replace: { en: 'Replace logo', es: 'Reemplazar logo' },
  logo_uploading: { en: 'Uploading…', es: 'Subiendo…' },
  logo_remove: { en: 'Remove', es: 'Quitar' },

  h_identity: { en: 'Tell us about your company', es: 'Cuéntanos sobre tu empresa' },
  company_label: { en: 'Company name', es: 'Nombre de la empresa' },
  contact_label: { en: 'Contact name', es: 'Nombre de contacto' },

  h_reach: { en: 'How can buyers reach you?', es: '¿Cómo pueden contactarte los compradores?' },
  website_label: { en: 'Website', es: 'Sitio web' },
  phone_label: { en: 'Phone', es: 'Teléfono' },
  city_label: { en: 'City', es: 'Ciudad' },

  h_tagline: { en: 'Sum up your company in one line', es: 'Resume tu empresa en una línea' },
  ph_tagline: { en: 'e.g. "Forklift service across the Borderplex since 2009."', es: 'ej. "Servicio de montacargas en la frontera desde 2009."' },

  h_description: { en: 'What does your company do?', es: '¿Qué hace tu empresa?' },
  ph_description: { en: 'e.g. "We sell, rent, and repair forklifts in El Paso and Juárez."', es: 'ej. "Vendemos, rentamos y reparamos montacargas en El Paso y Juárez."' },

  h_industries: { en: 'Which industries do you serve?', es: '¿A qué industrias atiendes?' },
  sub_industries: { en: 'Pick every one that fits — buyers filter by this.', es: 'Elige todas las que apliquen — los compradores filtran por esto.' },
  add_industry_ph: { en: 'Add another industry…', es: 'Agrega otra industria…' },

  h_client_size: { en: 'What size companies do you serve?', es: '¿De qué tamaño son las empresas que atiendes?' },

  h_client_types: { en: 'Who are you looking for?', es: '¿A qué clientes buscas?' },

  h_categories: { en: 'What do you sell?', es: '¿Qué vendes?' },
  sub_categories: { en: 'Search or browse — pick everything that applies.', es: 'Busca o explora — elige todo lo que aplique.' },

  h_service_areas: { en: 'Where do you provide service?', es: '¿Dónde das servicio?' },

  h_awards: { en: 'Any awards or certifications to highlight?', es: '¿Algún premio o certificación que destacar?' },
  sub_awards: { en: 'Optional — you can add this anytime.', es: 'Opcional — puedes agregarlo cuando quieras.' },
  add_award_ph: { en: 'Add an award or recognition…', es: 'Agrega un premio o reconocimiento…' },
  add_btn: { en: 'Add', es: 'Agregar' },

  h_summary: { en: 'You’re all set for now', es: 'Por ahora, listo' },
  sub_summary: { en: 'Your changes are saved. Keep building your storefront — add photos, certifications, and more from your portal.', es: 'Tus cambios están guardados. Sigue construyendo tu tienda — agrega fotos, certificaciones y más desde tu portal.' },
  summary_cta: { en: 'Go to my portal', es: 'Ir a mi portal' },
};

const ICONS: Record<StepId, LucideIcon> = {
  logo: LogoIcon, identity: Building2, reach: Phone, tagline: Quote, description: FileText,
  industries: Factory, client_size: Users, client_types: Target, categories: Boxes,
  service_areas: MapPin, awards: Award, summary: PartyPopper,
};

export default function VendorOnboardingPage() {
  const {
    checking, signedIn, vendor, set, toggle, persist, autosaving, savedAt, saveError,
    logoUrl, logoBusy, uploadLogo, removeLogo, softwareOnly,
  } = useVendorOnboardingProfile();
  const [lang, switchLang] = useLang('en');
  const t = (k: string) => (TR[k] ? (lang === 'es' ? TR[k].es : TR[k].en) : k);

  const [stepId, setStepId] = useState<StepId>('logo');
  const [direction, setDirection] = useState<'fwd' | 'back'>('fwd');
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => { document.title = t('doc_title'); }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const steps = useMemo(() => getVisibleSteps({ softwareOnly }), [softwareOnly]);
  const contentSteps = useMemo(() => getVisibleContentSteps({ softwareOnly }), [softwareOnly]);

  // If the current card disappears mid-flow (e.g. the vendor picks an
  // all-software category set, dropping the "service areas" card), move
  // forward to the next still-visible card instead of getting stuck.
  useEffect(() => {
    if (steps.includes(stepId)) return;
    const fromHere = ALL_STEPS.slice(ALL_STEPS.indexOf(stepId));
    const fallback = fromHere.find((s) => steps.includes(s)) || steps[steps.length - 1] || 'summary';
    setStepId(fallback);
  }, [steps, stepId]);

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

  const index = Math.max(0, steps.indexOf(stepId));
  const dotIndex = contentSteps.indexOf(stepId);

  function goTo(next: StepId, dir: 'fwd' | 'back') {
    persist(true); // don't wait on the 1200ms debounce right before navigating away from a field
    setDirection(dir);
    setStepId(next);
  }
  function goNext() {
    goTo(steps[clampStepIndex(index + 1, steps.length)], 'fwd');
  }
  function goBack() {
    goTo(steps[clampStepIndex(index - 1, steps.length)], 'back');
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
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy)) return; // too small, or mostly vertical scroll
    if (dx < 0) goNext(); else goBack();
  }

  if (checking) {
    return (
      <div className={`vob ${ibmPlexSans.variable}`}>
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div className="vob-center">{t('loading')}</div>
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className={`vob ${ibmPlexSans.variable}`}>
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div className="vob-gate">
          <h1>{t('signin_h')}</h1>
          <p>{t('signin_body')}</p>
          <a className="vob-btn" href="/vendor-login">{t('signin_cta')}</a>
        </div>
      </div>
    );
  }

  if (!vendor || vendor.moderation_status === 'suspended' || vendor.moderation_status === 'banned') {
    return (
      <div className={`vob ${ibmPlexSans.variable}`}>
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div className="vob-center">{t('redirecting')}</div>
      </div>
    );
  }

  const Icon = ICONS[stepId];
  const headingId = `vob-h-${stepId}`;

  return (
    <div className={`vob ${ibmPlexSans.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <header className="vob-top">
        <a className="vob-exit" href="/vendor/portal" onClick={(e) => { e.preventDefault(); onExit(); }}>{t('exit')}</a>
        <LanguageToggle lang={lang} onChange={switchLang} variant="light" />
      </header>

      {stepId !== 'summary' && (
        <div
          className="vob-dots" role="progressbar" aria-valuemin={1} aria-valuemax={contentSteps.length}
          aria-valuenow={Math.min(dotIndex + 1, contentSteps.length)}
          aria-label={t('step_of').replace('{n}', String(dotIndex + 1)).replace('{total}', String(contentSteps.length))}
        >
          {contentSteps.map((s, i) => (
            <span key={s} className={'vob-dot' + (i < dotIndex ? ' done' : i === dotIndex ? ' current' : '')} />
          ))}
        </div>
      )}

      <div className="vob-viewport" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div key={stepId} className={'vob-card ' + (direction === 'fwd' ? 'vob-in-fwd' : 'vob-in-back')}>
          <div className="vob-icon"><Icon size={22} strokeWidth={1.75} aria-hidden="true" /></div>
          {renderCard(stepId, headingId, t, lang, vendor, set, toggle, {
            logoUrl, logoBusy, uploadLogo, removeLogo,
          })}
        </div>
      </div>

      <footer className="vob-foot">
        {saveError && <p className="vob-error">{t('save_error')}</p>}
        <div className="vob-ctarow">
          <button type="button" className="vob-back" onClick={goBack} disabled={index === 0}>{t('back')}</button>
          <span className={'vob-savedflash' + (showSaved ? ' show' : '')} aria-live="polite">
            {showSaved && <><Check size={13} strokeWidth={2.5} aria-hidden="true" />{t('saved')}</>}
          </span>
          {stepId === 'summary' ? (
            <a className="vob-btn" href="/vendor/portal">{t('summary_cta')}</a>
          ) : (
            <button type="button" className="vob-btn" onClick={goNext}>{t('next')}</button>
          )}
        </div>
      </footer>
    </div>
  );
}

// One switch, one place that knows which existing field(s) each card wraps.
function renderCard(
  step: StepId, headingId: string, t: (k: string) => string, lang: Lang,
  vendor: OnboardingVendor, set: <K extends keyof OnboardingVendor>(k: K, v: OnboardingVendor[K]) => void,
  toggle: (list: string[], v: string, key: 'categories' | 'service_areas' | 'industries' | 'client_types') => void,
  logo: { logoUrl: string | null; logoBusy: boolean; uploadLogo: (f: File) => void; removeLogo: () => void },
) {
  switch (step) {
    case 'logo':
      return (
        <>
          <h2 id={headingId} className="vob-h">{t('h_logo')}</h2>
          <p className="vob-sub">{t('sub_logo')}</p>
          <div className="vob-logobox">
            {logo.logoUrl ? <img src={logo.logoUrl} alt="" /> : <LogoIcon size={28} strokeWidth={1.5} aria-hidden="true" />}
          </div>
          <label className="vob-filebtn">
            {logo.logoBusy ? t('logo_uploading') : logo.logoUrl ? t('logo_replace') : t('logo_upload')}
            <input
              type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" disabled={logo.logoBusy}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) logo.uploadLogo(f); e.target.value = ''; }}
            />
          </label>
          {logo.logoUrl && <button type="button" className="vob-textbtn" onClick={logo.removeLogo}>{t('logo_remove')}</button>}
        </>
      );

    case 'identity':
      return (
        <>
          <h2 id={headingId} className="vob-h">{t('h_identity')}</h2>
          <div className="vob-fields">
            <TextField label={t('company_label')} value={vendor.company_name || ''} onChange={(v) => set('company_name', v)} />
            <TextField label={t('contact_label')} value={vendor.contact_name || ''} onChange={(v) => set('contact_name', v)} />
          </div>
        </>
      );

    case 'reach':
      return (
        <>
          <h2 id={headingId} className="vob-h">{t('h_reach')}</h2>
          <div className="vob-fields">
            <TextField label={t('website_label')} value={vendor.website || ''} onChange={(v) => set('website', v)} />
            <TextField label={t('phone_label')} value={vendor.phone || ''} onChange={(v) => set('phone', v)} inputMode="tel" />
            <TextField label={t('city_label')} value={vendor.city || ''} onChange={(v) => set('city', v)} />
          </div>
        </>
      );

    case 'tagline':
      return (
        <>
          <h2 id={headingId} className="vob-h">{t('h_tagline')}</h2>
          <input
            className="vob-bigfield" aria-labelledby={headingId} maxLength={160}
            value={vendor.tagline || ''} placeholder={t('ph_tagline')}
            onChange={(e) => set('tagline', e.target.value)}
          />
        </>
      );

    case 'description':
      return (
        <>
          <h2 id={headingId} className="vob-h">{t('h_description')}</h2>
          <textarea
            className="vob-bigfield vob-textarea" aria-labelledby={headingId} rows={5}
            value={vendor.description || ''} placeholder={t('ph_description')}
            onChange={(e) => set('description', e.target.value)}
          />
        </>
      );

    case 'industries':
      return (
        <>
          <h2 id={headingId} className="vob-h">{t('h_industries')}</h2>
          <p className="vob-sub">{t('sub_industries')}</p>
          <div role="group" aria-labelledby={headingId}>
            <ChipGroup
              options={Array.from(new Set([...INDUSTRIES, ...(vendor.industries || [])]))}
              selected={vendor.industries || []}
              onToggle={(v) => toggle(vendor.industries || [], v, 'industries')}
            />
            <AddYourOwn
              placeholder={t('add_industry_ph')} addLabel={t('add_btn')} existing={vendor.industries || []}
              onAdd={(v) => set('industries', [...(vendor.industries || []), v])}
            />
          </div>
        </>
      );

    case 'client_size':
      return (
        <>
          <h2 id={headingId} className="vob-h">{t('h_client_size')}</h2>
          <div role="group" aria-labelledby={headingId}>
            <ChipGroup options={CLIENT_SIZES} selected={vendor.client_types || []} onToggle={(v) => toggle(vendor.client_types || [], v, 'client_types')} />
          </div>
        </>
      );

    case 'client_types':
      return (
        <>
          <h2 id={headingId} className="vob-h">{t('h_client_types')}</h2>
          <div role="group" aria-labelledby={headingId}>
            <ChipGroup
              options={Array.from(new Set([...CLIENT_TYPES, ...((vendor.client_types || []).filter((v) => !CLIENT_SIZES.includes(v)))]))}
              selected={vendor.client_types || []}
              onToggle={(v) => toggle(vendor.client_types || [], v, 'client_types')}
            />
          </div>
        </>
      );

    case 'categories':
      return (
        <>
          <h2 id={headingId} className="vob-h">{t('h_categories')}</h2>
          <p className="vob-sub">{t('sub_categories')}</p>
          <div data-no-swipe className="vob-catwrap">
            <CategoryPicker selected={vendor.categories || []} onToggle={(v) => toggle(vendor.categories || [], v, 'categories')} lang={lang} />
          </div>
        </>
      );

    case 'service_areas':
      return (
        <>
          <h2 id={headingId} className="vob-h">{t('h_service_areas')}</h2>
          <div role="group" aria-labelledby={headingId}>
            <ChipGroup options={AREAS} selected={vendor.service_areas || []} onToggle={(v) => toggle(vendor.service_areas || [], v, 'service_areas')} />
          </div>
        </>
      );

    case 'awards':
      return (
        <>
          <h2 id={headingId} className="vob-h">{t('h_awards')}</h2>
          <p className="vob-sub">{t('sub_awards')}</p>
          {(vendor.achievements || []).length > 0 && (
            <div className="vob-chips">
              {(vendor.achievements || []).map((a) => (
                <button key={a} type="button" className="vob-chip on" onClick={() => set('achievements', (vendor.achievements || []).filter((x) => x !== a))}>
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

    case 'summary':
      return (
        <>
          <h2 id={headingId} className="vob-h">{t('h_summary')}</h2>
          <p className="vob-sub">{t('sub_summary')}</p>
        </>
      );

    default:
      return null;
  }
}

function TextField({ label, value, onChange, inputMode }: {
  label: string; value: string; onChange: (v: string) => void; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
}) {
  return (
    <label className="vob-field">
      <span>{label}</span>
      <input value={value} inputMode={inputMode} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function ChipGroup({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="vob-chips">
      {options.map((o) => (
        <button key={o} type="button" className={'vob-chip' + (selected.includes(o) ? ' on' : '')} aria-pressed={selected.includes(o)} onClick={() => onToggle(o)}>
          {o}
        </button>
      ))}
    </div>
  );
}

function AddYourOwn({ placeholder, addLabel, existing, onAdd }: { placeholder: string; addLabel: string; existing: string[]; onAdd: (v: string) => void }) {
  const [v, setV] = useState('');
  const add = () => {
    const val = v.trim();
    if (!val) return;
    if (!existing.some((x) => x.toLowerCase() === val.toLowerCase())) onAdd(val);
    setV('');
  };
  return (
    <div className="vob-addown">
      <input value={v} placeholder={placeholder} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
      <button type="button" className="vob-textbtn" onClick={add}>{addLabel}</button>
    </div>
  );
}

const CSS = `
.vob{--bg:#F8F7FB;--surf:#fff;--ink:#141320;--muted:#615F72;--muted2:#8A87A0;--line:#E2DFEC;--p:#6C5CE0;--pd:#4A3DB0;--pbg:rgba(108,92,224,.1);--green:#2F9E6A;--sans:var(--font-ibm-plex-sans-vob),'IBM Plex Sans',system-ui,sans-serif;--serif:var(--font-space-grotesk),'Space Grotesk',Georgia,serif;--shadow:0 4px 12px rgba(124,58,237,.08);
  height:100dvh;display:flex;flex-direction:column;background:var(--bg);color:var(--ink);font-family:var(--sans);-webkit-font-smoothing:antialiased;overflow:hidden;}
.vob *{box-sizing:border-box;}
.vob a:focus-visible,.vob button:focus-visible,.vob input:focus-visible,.vob textarea:focus-visible{outline:2px solid var(--p);outline-offset:2px;}
.vob-center{flex:1;display:grid;place-items:center;color:var(--muted);font-size:14px;}
.vob-gate{max-width:400px;margin:auto;text-align:center;background:var(--surf);border:1px solid var(--line);border-radius:20px;padding:32px;box-shadow:var(--shadow);}
.vob-gate h1{font-family:var(--serif);font-size:22px;font-weight:700;margin:0 0 8px;}
.vob-gate p{color:var(--muted);font-size:14px;line-height:1.6;margin:0 0 20px;}
.vob-top{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;flex-shrink:0;}
.vob-exit{font-size:13px;font-weight:500;color:var(--muted);text-decoration:none;padding:8px;border-radius:8px;}
.vob-exit:hover{color:var(--ink);}
.vob-dots{display:flex;gap:6px;padding:0 20px 8px;flex-shrink:0;}
.vob-dot{flex:1;max-width:40px;height:4px;border-radius:99px;background:var(--line);}
.vob-dot.done{background:var(--p);opacity:.5;}
.vob-dot.current{background:var(--p);}
.vob-viewport{flex:1;min-height:0;display:flex;overflow:hidden;padding:0 20px;}
.vob-card{flex:1;min-height:0;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;max-width:520px;margin:0 auto;width:100%;overflow-y:auto;padding:16px 0;}
.vob-in-fwd{animation:vobInFwd 200ms cubic-bezier(0,0,.2,1);}
.vob-in-back{animation:vobInBack 200ms cubic-bezier(0,0,.2,1);}
@keyframes vobInFwd{from{opacity:0;transform:translateX(24px);}to{opacity:1;transform:translateX(0);}}
@keyframes vobInBack{from{opacity:0;transform:translateX(-24px);}to{opacity:1;transform:translateX(0);}}
.vob-icon{width:52px;height:52px;border-radius:16px;background:var(--pbg);color:var(--p);display:grid;place-items:center;margin-bottom:24px;flex-shrink:0;}
.vob-h{font-family:var(--serif);font-size:28px;font-weight:700;letter-spacing:-.02em;line-height:1.2;margin:0 0 8px;}
.vob-sub{font-size:15px;font-weight:400;color:var(--muted);line-height:1.5;margin:0 0 24px;max-width:440px;}
.vob-fields{display:flex;flex-direction:column;gap:16px;width:100%;margin-top:8px;}
.vob-field{display:flex;flex-direction:column;gap:8px;font-size:13px;font-weight:600;color:var(--muted);width:100%;}
.vob-field input{font-family:var(--sans);padding:14px 16px;border-radius:12px;border:1px solid var(--line);background:var(--surf);color:var(--ink);font-size:16px;font-weight:400;outline:none;min-height:48px;width:100%;}
.vob-field input:focus{border-color:var(--p);box-shadow:0 0 0 3px var(--pbg);}
.vob-bigfield{font-family:var(--sans);width:100%;padding:16px;border-radius:12px;border:1px solid var(--line);background:var(--surf);color:var(--ink);font-size:16px;font-weight:400;outline:none;margin-top:8px;resize:none;}
.vob-bigfield::placeholder{color:var(--muted2);}
.vob-bigfield:focus{border-color:var(--p);box-shadow:0 0 0 3px var(--pbg);}
.vob-textarea{line-height:1.6;}
.vob-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;}
.vob-chip{font-family:var(--sans);padding:11px 16px;min-height:44px;border-radius:99px;border:1px solid var(--line);background:var(--surf);color:var(--ink);font-size:14px;font-weight:400;cursor:pointer;}
.vob-chip:hover{border-color:var(--p);}
.vob-chip.on{background:var(--pbg);border-color:var(--p);color:var(--pd);font-weight:600;}
.vob-addown{display:flex;gap:8px;margin-top:16px;}
.vob-addown input{flex:1;font-family:var(--sans);padding:12px 14px;min-height:44px;border-radius:10px;border:1px solid var(--line);background:var(--surf);color:var(--ink);font-size:14px;outline:none;}
.vob-addown input:focus{border-color:var(--p);}
.vob-textbtn{font-family:var(--sans);background:none;border:1px solid var(--line);color:var(--pd);font-size:13px;font-weight:600;padding:11px 16px;min-height:44px;border-radius:10px;cursor:pointer;}
.vob-textbtn:hover{border-color:var(--p);background:var(--pbg);}
.vob-logobox{width:96px;height:96px;border-radius:20px;border:1px solid var(--line);background:var(--surf);display:grid;place-items:center;overflow:hidden;color:var(--muted2);margin-bottom:20px;}
.vob-logobox img{width:100%;height:100%;object-fit:contain;}
.vob-filebtn{position:relative;overflow:hidden;display:inline-block;font-family:var(--sans);background:var(--surf);border:1px solid var(--line);color:var(--ink);font-size:14px;font-weight:600;padding:12px 20px;min-height:48px;border-radius:12px;cursor:pointer;margin-bottom:10px;}
.vob-filebtn:hover{border-color:var(--p);}
.vob-filebtn input{position:absolute;inset:0;opacity:0;cursor:pointer;font-size:0;}
.vob-catwrap{width:100%;margin-top:4px;}
.vob-foot{flex-shrink:0;padding:16px 20px calc(16px + env(safe-area-inset-bottom));border-top:1px solid var(--line);background:rgba(248,247,251,.92);backdrop-filter:blur(16px);}
.vob-error{color:#CE4B43;font-size:13px;margin:0 0 10px;text-align:center;}
.vob-ctarow{display:flex;align-items:center;justify-content:space-between;gap:12px;max-width:520px;margin:0 auto;}
.vob-back{font-family:var(--sans);background:none;border:none;color:var(--muted);font-size:14px;font-weight:600;padding:14px 12px;min-height:48px;border-radius:10px;cursor:pointer;}
.vob-back:hover:not(:disabled){color:var(--ink);}
.vob-back:disabled{opacity:0;pointer-events:none;}
.vob-savedflash{display:inline-flex;align-items:center;gap:5px;font-size:12.5px;font-weight:600;color:var(--green);opacity:0;transition:opacity 200ms ease-out;flex-shrink:0;}
.vob-savedflash.show{opacity:1;}
.vob-btn{font-family:var(--sans);border:none;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;font-size:15px;font-weight:600;border-radius:12px;padding:14px 28px;min-height:48px;min-width:112px;background:var(--p);color:#fff;box-shadow:var(--shadow);transition:background 150ms ease;}
.vob-btn:hover{background:var(--pd);}
.vob-btn:active{transform:scale(.98);}
@media(max-width:480px){.vob-h{font-size:24px;}.vob-top{padding:14px 16px;}.vob-dots{padding:0 16px 8px;}.vob-viewport{padding:0 16px;}.vob-foot{padding:14px 16px calc(14px + env(safe-area-inset-bottom));}}
`;
