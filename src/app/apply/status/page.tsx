'use client';

// /apply/status — signed-in vendor: check application status and edit YOUR
// own submission (private intake system; admin never exposed here). This is
// a brand-new, standalone flow — unrelated to the older /vendor-signup,
// /vendor-login, /vendor/portal system (which uses a different table,
// vendor_profiles) — do not merge with that flow.
//
// Design System v1.0 reskin (2026-07-30 polish pass): matches the same fix
// applied to /apply and /apply/login — was on the off-brand dark "Outfit"
// theme (#0A0A0F bg, #7C5CFC purple), now light warm-white + brand violet.
//
// 2026-08-04 vendor-application batch:
// - FULL EN/ES bilingual (LanguageToggle + page dictionary, the shared
//   pattern) — the application read-back and its status are the two things a
//   vendor must always be able to see, in either language (items 3 + 7).
// - Status shown in PLAIN LANGUAGE with a one-line "what happens next"
//   explainer, using the real vendor_applications.status values
//   (pending / approved / rejected) — no parallel status system.
// - Locations + "who do you serve best" are multi-select chip groups (item
//   6), mirroring the /apply form; values round-trip through the new
//   `regions` / `target_customers` columns with legacy fallback.

import { useEffect, useRef, useState } from 'react';
import { IBM_Plex_Sans } from 'next/font/google';
import { Building2, User, Phone, Clock, CheckCircle2, XCircle, ImageUp, ImagePlus, LogOut, MapPin, type LucideIcon } from 'lucide-react';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser-auth';
import { clearLocalCart } from '@/components/cart/useCart';
import LanguageToggle, { useLang } from '@/components/LanguageToggle';
import { MOTION_CSS, staggerStyle } from '@/components/motion/Motion';

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans-applystatus',
  display: 'swap',
});

const CATEGORIES = [
  'TMS',
  'WMS',
  'Telematics/ELD',
  'Forklifts',
  'Customs/Cross-Border',
  'Cold Chain',
  'Robotics',
  'Other',
];

const OFFERING_TYPES = ['Product', 'Software / platform', 'Service', 'Innovation / frontier tool'];

const SUPPLY_CHAIN_STAGES = [
  'Sourcing / Procurement',
  'Inbound / Receiving',
  'Warehousing / Storage',
  'Inventory Management',
  'Order Fulfillment / Picking',
  'Yard / Dock',
  'Transportation / Fleet',
  'Last-Mile Delivery',
  'Customs / Cross-Border',
  'Cold Chain',
  'Reverse Logistics / Returns',
  'Supply Chain Planning / Visibility',
];

const COMPANY_SIZES = ['1-10 employees', '11-50 employees', '51-200 employees', '201-500 employees', '500+ employees', 'Other'];

const REGIONS = ['El Paso', 'Juárez', 'New Mexico', 'West Texas', 'Cross-border', 'National'];

const TARGET_CUSTOMER_TYPES = [
  'Small warehouses (<50k sqft)',
  'Mid-size warehouses',
  'Large distribution centers',
  'Manufacturers',
  '3PL providers',
  'Retailers',
  'Cross-border operations',
  'Startups',
  'Enterprise',
];

const MAX_PRODUCT_IMAGES = 3;

type Status = 'pending' | 'approved' | 'rejected';

interface Application {
  id: string;
  public_ref: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  category: string;
  offering_types: string[];
  supply_chain_stages: string[];
  company_size: string;
  region: string;
  regions: string[] | null;
  problem_solved: string;
  target_customer: string;
  target_customers: string[] | null;
  price_range: string;
  status: Status;
  logo_url: string | null;
  image_urls: string[];
  product_image_paths: string[];
}

/** Resolve a stored free-text value against a fixed option list: returns the
 * select's value (the exact match, or "Other" if it's a non-empty custom
 * value) and the text to prefill the "Other" input with. */
function resolveOptionValue(stored: string, options: string[]): { select: string; other: string } {
  if (!stored) return { select: '', other: '' };
  if (options.includes(stored)) return { select: stored, other: '' };
  return { select: 'Other', other: stored };
}

interface MyResponse {
  ok: boolean;
  stored: boolean;
  application: Application | null;
  message?: string;
}

type AuthState = 'checking' | 'signed-out' | 'signed-in';
type Lang = 'en' | 'es';

const TR: Record<string, { en: string; es: string }> = {
  doc_title: { en: 'My application — NXT//LINK', es: 'Mi solicitud — NXT//LINK' },
  loading: { en: 'Loading…', es: 'Cargando…' },
  loading_app: { en: 'Loading your application…', es: 'Cargando su solicitud…' },
  load_error: { en: 'Could not load your application.', es: 'No se pudo cargar su solicitud.' },
  gate_h: { en: 'Sign in to view your status', es: 'Inicie sesión para ver su estado' },
  gate_sub: { en: 'Sign in to check your application status and make changes.', es: 'Inicie sesión para revisar el estado de su solicitud y hacer cambios.' },
  gate_cta: { en: 'Sign in', es: 'Iniciar sesión' },
  empty_h: { en: 'You haven’t applied yet', es: 'Aún no ha aplicado' },
  empty_sub: { en: 'Submit a quick application to get started — it only takes a couple of minutes.', es: 'Envíe una solicitud rápida para empezar — solo toma un par de minutos.' },
  empty_cta: { en: 'Apply now', es: 'Aplicar ahora' },
  sign_out: { en: 'Sign out', es: 'Cerrar sesión' },
  reference: { en: 'Reference:', es: 'Referencia:' },
  fallback_title: { en: 'Your application', es: 'Su solicitud' },

  // Plain-language status (item 7) — the real vendor_applications.status
  // values, explained so a non-technical vendor knows exactly where they are.
  status_pending: { en: 'Submitted — in review', es: 'Enviada — en revisión' },
  status_approved: { en: 'Approved', es: 'Aprobada' },
  status_rejected: { en: 'Not approved this time', es: 'No aprobada esta vez' },
  status_pending_next: { en: 'A person on our team is reviewing your application — you can still update anything below.', es: 'Una persona de nuestro equipo está revisando su solicitud — aún puede actualizar cualquier dato abajo.' },
  status_approved_next: { en: 'You’re approved — your storefront can go live. Our team will reach out with next steps.', es: 'Está aprobado — su tienda puede salir en vivo. Nuestro equipo le contactará con los siguientes pasos.' },
  status_rejected_next: { en: 'Your application wasn’t approved this time. You can update it below and our team will take another look.', es: 'Su solicitud no fue aprobada esta vez. Puede actualizarla abajo y nuestro equipo la revisará de nuevo.' },

  sec_details: { en: 'Company details', es: 'Datos de la empresa' },
  f_company: { en: 'Company name', es: 'Nombre de la empresa' },
  f_contact: { en: 'Contact name', es: 'Nombre de contacto' },
  f_email: { en: 'Email', es: 'Correo electrónico' },
  f_phone: { en: 'Phone', es: 'Teléfono' },
  f_category: { en: 'Category', es: 'Categoría' },
  f_price: { en: 'Price range', es: 'Rango de precio' },
  f_price_ph: { en: 'e.g. $5-25k', es: 'p. ej. $5-25k' },
  f_size: { en: 'Company size', es: 'Tamaño de la empresa' },
  select_category: { en: 'Select a category', es: 'Seleccione una categoría' },
  select_size: { en: 'Select a size', es: 'Seleccione un tamaño' },
  size_other_ph: { en: 'Describe your company size', es: 'Describa el tamaño de su empresa' },
  f_locations: { en: 'Which locations do you serve?', es: '¿Qué ubicaciones atiende?' },
  select_all: { en: 'Select all that apply', es: 'Seleccione todas las que apliquen' },
  custom_region_ph: { en: 'Other location — add your own', es: 'Otra ubicación — agréguela' },
  f_offering: { en: 'What kind of offering is this?', es: '¿Qué tipo de oferta es?' },
  f_stages: { en: 'Where in the supply chain does this apply?', es: '¿En qué parte de la cadena de suministro aplica?' },
  custom_stage_ph: { en: 'Other — add your own stage', es: 'Otra — agregue su propia etapa' },
  f_problem: { en: 'What problem do you solve?', es: '¿Qué problema resuelve?' },
  f_customers: { en: 'Who do you serve best?', es: '¿A quién atiende mejor?' },
  custom_customer_ph: { en: 'Other customer type — add your own', es: 'Otro tipo de cliente — agréguelo' },
  add: { en: 'Add', es: 'Agregar' },

  save: { en: 'Save changes', es: 'Guardar cambios' },
  saving: { en: 'Saving…', es: 'Guardando…' },
  saved: { en: 'Changes saved.', es: 'Cambios guardados.' },
  save_error: { en: 'Could not save your changes.', es: 'No se pudieron guardar los cambios.' },

  sec_logo: { en: 'Logo', es: 'Logotipo' },
  no_logo: { en: 'No logo', es: 'Sin logotipo' },
  replace_logo: { en: 'Replace logo', es: 'Reemplazar logotipo' },
  uploading: { en: 'Uploading…', es: 'Subiendo…' },
  logo_error: { en: 'Could not upload logo.', es: 'No se pudo subir el logotipo.' },
  sec_images: { en: 'Product images', es: 'Imágenes de producto' },
  add_image: { en: 'Add image', es: 'Agregar imagen' },
  image_error: { en: 'Could not upload image.', es: 'No se pudo subir la imagen.' },
  image_remove_error: { en: 'Could not remove image.', es: 'No se pudo quitar la imagen.' },
  remove_image_aria: { en: 'Remove product image', es: 'Quitar imagen de producto' },
  product_alt: { en: 'Product', es: 'Producto' },
  logo_alt: { en: 'Company logo', es: 'Logotipo de la empresa' },
};

export default function ApplyStatusPage() {
  const [lang, switchLang] = useLang('en');
  const t = (k: string) => (TR[k] ? (lang === 'es' ? TR[k].es : TR[k].en) : k);
  const [authState, setAuthState] = useState<AuthState>('checking');
  const [loading, setLoading] = useState(false);
  const [application, setApplication] = useState<Application | null>(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => { document.title = t('doc_title'); }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const supabase = createBrowserSupabaseClient();
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;

        if (!data.session) {
          setAuthState('signed-out');
          return;
        }
        setAuthState('signed-in');

        setLoading(true);
        const res = await fetch('/api/apply/my');
        const json: MyResponse = await res.json();
        if (cancelled) return;

        if (!json.ok) {
          setLoadError(json.message || 'error');
        } else {
          setApplication(json.application);
        }
      } catch {
        if (!cancelled) setLoadError('error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSignOut() {
    try {
      const supabase = createBrowserSupabaseClient();
      await supabase.auth.signOut();
    } finally {
      clearLocalCart();
      window.location.href = '/apply/login';
    }
  }

  return (
    <div className={`ays-root ${ibmPlexSans.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <TopNav
        t={t}
        status={application?.status}
        onSignOut={authState === 'signed-in' ? handleSignOut : undefined}
        lang={lang}
        onLangChange={switchLang}
      />

      <main className="ays-main">
        {authState === 'checking' && <div className="ays-loading">{t('loading')}</div>}

        {authState === 'signed-out' && <SignInGate t={t} />}

        {authState === 'signed-in' && loading && <div className="ays-loading">{t('loading_app')}</div>}

        {authState === 'signed-in' && !loading && loadError && (
          <div className="ays-card ays-errorcard">
            <p className="ays-error">{t('load_error')}</p>
          </div>
        )}

        {authState === 'signed-in' && !loading && !loadError && application === null && <EmptyState t={t} />}

        {authState === 'signed-in' && !loading && !loadError && application !== null && (
          <ApplicationPanel key={application.id} application={application} onApplicationChange={setApplication} t={t} />
        )}
      </main>
    </div>
  );
}

function SignInGate({ t }: { t: (k: string) => string }) {
  return (
    <div className="ays-card ays-gate nxm-in">
      <h1>{t('gate_h')}</h1>
      <p className="ays-sub">{t('gate_sub')}</p>
      <a className="ays-btn nxm-press" href="/apply/login">
        {t('gate_cta')}
      </a>
    </div>
  );
}

function EmptyState({ t }: { t: (k: string) => string }) {
  return (
    <div className="ays-card ays-gate nxm-in">
      <h1>{t('empty_h')}</h1>
      <p className="ays-sub">{t('empty_sub')}</p>
      <a className="ays-btn nxm-press" href="/apply">
        {t('empty_cta')}
      </a>
    </div>
  );
}

function StatusBadge({ status, t }: { status: Status; t: (k: string) => string }) {
  const label = t(`status_${status}`);
  const cls = status === 'pending' ? 'ays-badge-pending' : status === 'approved' ? 'ays-badge-approved' : 'ays-badge-rejected';
  const Icon = status === 'pending' ? Clock : status === 'approved' ? CheckCircle2 : XCircle;
  return (
    <span className={`ays-badge ${cls}`}>
      <Icon size={13} strokeWidth={2.25} aria-hidden="true" />
      {label}
    </span>
  );
}

function TopNav({ t, status, onSignOut, lang, onLangChange }: {
  t: (k: string) => string;
  status?: Status;
  onSignOut?: () => void;
  lang: Lang;
  onLangChange: (l: Lang) => void;
}) {
  return (
    <nav className="ays-nav">
      <a className="ays-brand" href="/">
        <b>
          NXT<i>{'//'}</i>LINK
        </b>
      </a>
      <div className="ays-navright">
        {status && <StatusBadge status={status} t={t} />}
        <LanguageToggle lang={lang} onChange={onLangChange} variant="light" />
        {onSignOut && (
          <button type="button" className="ays-signout" onClick={onSignOut}>
            <LogOut size={14} strokeWidth={1.75} aria-hidden="true" /> {t('sign_out')}
          </button>
        )}
      </div>
    </nav>
  );
}

interface EditableFields {
  company_name: string;
  contact_name: string;
  phone: string;
  category: string;
  offering_types: string[];
  supply_chain_stages: string[];
  problem_solved: string;
  price_range: string;
  regions: string[];
  target_customers: string[];
}

function ApplicationPanel({
  application,
  onApplicationChange,
  t,
}: {
  application: Application;
  onApplicationChange: (app: Application) => void;
  t: (k: string) => string;
}) {
  const [fields, setFields] = useState<EditableFields>({
    company_name: application.company_name || '',
    contact_name: application.contact_name || '',
    phone: application.phone || '',
    category: application.category || '',
    offering_types: application.offering_types || [],
    supply_chain_stages: application.supply_chain_stages || [],
    problem_solved: application.problem_solved || '',
    price_range: application.price_range || '',
    // Multi-value with legacy fallback: older rows only have the single
    // `region` / `target_customer` text value.
    regions: (application.regions && application.regions.length ? application.regions : application.region ? [application.region] : []),
    target_customers: (application.target_customers && application.target_customers.length ? application.target_customers : application.target_customer ? [application.target_customer] : []),
  });

  const initSize = resolveOptionValue(application.company_size || '', COMPANY_SIZES);
  const [companySize, setCompanySize] = useState(initSize.select);
  const [companySizeOther, setCompanySizeOther] = useState(initSize.other);

  const [customStage, setCustomStage] = useState('');
  const [customRegion, setCustomRegion] = useState('');
  const [customCustomer, setCustomCustomer] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [saveNotice, setSaveNotice] = useState(false);

  const [logoUrl, setLogoUrl] = useState<string | null>(application.logo_url);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [imageUrls, setImageUrls] = useState<string[]>(application.image_urls || []);
  const [imagePaths, setImagePaths] = useState<string[]>(application.product_image_paths || []);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [removingIdx, setRemovingIdx] = useState<number | null>(null);
  const imagesInputRef = useRef<HTMLInputElement>(null);

  function setField<K extends keyof EditableFields>(key: K, value: EditableFields[K]) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function toggleIn(key: 'offering_types' | 'supply_chain_stages' | 'regions' | 'target_customers', value: string) {
    setFields((prev) => ({
      ...prev,
      [key]: prev[key].includes(value) ? prev[key].filter((v) => v !== value) : [...prev[key], value],
    }));
  }

  function addCustom(key: 'supply_chain_stages' | 'regions' | 'target_customers', raw: string, clear: () => void) {
    const v = raw.trim();
    if (!v || fields[key].includes(v)) { clear(); return; }
    setFields((prev) => ({ ...prev, [key]: key === 'regions' ? [...prev[key], v].slice(0, 8) : [...prev[key], v] }));
    clear();
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(false);
    setSaveNotice(false);
    const resolved = {
      ...fields,
      company_size: companySize === 'Other' ? companySizeOther.trim() : companySize,
    };
    try {
      const res = await fetch('/api/apply/my', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resolved),
      });
      const json = await res.json();
      if (!json.ok) {
        setSaveError(true);
        return;
      }
      setSaveNotice(true);
      onApplicationChange({
        ...application,
        ...resolved,
        region: resolved.regions[0] || '',
        target_customer: resolved.target_customers[0] || '',
      });
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoBusy(true);
    setLogoError(false);
    try {
      const fd = new FormData();
      fd.append('kind', 'logo');
      fd.append('file', file);
      const res = await fetch('/api/apply/my/media', { method: 'POST', body: fd });
      const json = await res.json();
      if (!json.ok) {
        setLogoError(true);
        return;
      }
      setLogoUrl(json.logo_url || null);
    } catch {
      setLogoError(true);
    } finally {
      setLogoBusy(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  }

  async function handleAddImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageBusy(true);
    setImageError(false);
    try {
      const fd = new FormData();
      fd.append('kind', 'image');
      fd.append('file', file);
      const res = await fetch('/api/apply/my/media', { method: 'POST', body: fd });
      const json = await res.json();
      if (!json.ok) {
        setImageError(true);
        return;
      }
      setImageUrls((prev) => [...prev, json.image_url as string]);
      setImagePaths((prev) => [...prev, json.path as string]);
    } catch {
      setImageError(true);
    } finally {
      setImageBusy(false);
      if (imagesInputRef.current) imagesInputRef.current.value = '';
    }
  }

  async function handleRemoveImage(idx: number) {
    const path = imagePaths[idx];
    if (!path) return;
    setRemovingIdx(idx);
    setImageError(false);
    try {
      const res = await fetch(`/api/apply/my/media?kind=image&path=${encodeURIComponent(path)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.ok) {
        setImageError(true);
        return;
      }
      setImageUrls((prev) => prev.filter((_, i) => i !== idx));
      setImagePaths((prev) => prev.filter((_, i) => i !== idx));
    } catch {
      setImageError(true);
    } finally {
      setRemovingIdx(null);
    }
  }

  return (
    <>
      <header className="ays-hero nxm-in">
        <h1>{application.company_name || t('fallback_title')}</h1>
        <p className="ays-ref">
          {t('reference')} <b>{application.public_ref}</b>
        </p>
        <div className="ays-statusrow">
          <StatusBadge status={application.status} t={t} />
          <p className="ays-statusnext">{t(`status_${application.status}_next`)}</p>
        </div>
      </header>

      <div className="ays-card nxm-in" style={staggerStyle(1)}>
        <h2 className="ays-sectiontitle">{t('sec_details')}</h2>
        <form onSubmit={handleSave}>
          <div className="ays-grid">
            <Field label={t('f_company')} icon={Building2}>
              <input
                type="text"
                value={fields.company_name}
                onChange={(e) => setField('company_name', e.target.value)}
              />
            </Field>

            <Field label={t('f_contact')} icon={User}>
              <input
                type="text"
                value={fields.contact_name}
                onChange={(e) => setField('contact_name', e.target.value)}
              />
            </Field>

            <Field label={t('f_email')}>
              <input type="email" value={application.email} disabled />
            </Field>

            <Field label={t('f_phone')} icon={Phone}>
              <input type="tel" value={fields.phone} onChange={(e) => setField('phone', e.target.value)} />
            </Field>

            <Field label={t('f_category')}>
              <select value={fields.category} onChange={(e) => setField('category', e.target.value)}>
                <option value="" disabled>
                  {t('select_category')}
                </option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={t('f_price')}>
              <input
                type="text"
                value={fields.price_range}
                onChange={(e) => setField('price_range', e.target.value)}
                placeholder={t('f_price_ph')}
              />
            </Field>

            <Field label={t('f_size')}>
              <select value={companySize} onChange={(e) => setCompanySize(e.target.value)}>
                <option value="">{t('select_size')}</option>
                {COMPANY_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {companySize === 'Other' && (
                <input
                  type="text"
                  className="ays-mt"
                  value={companySizeOther}
                  onChange={(e) => setCompanySizeOther(e.target.value)}
                  placeholder={t('size_other_ph')}
                />
              )}
            </Field>
          </div>

          <Field label={t('f_locations')} hint={t('select_all')} full>
            <div className="ays-chips">
              {REGIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`ays-chip ${fields.regions.includes(r) ? 'ays-chip-on' : ''}`}
                  aria-pressed={fields.regions.includes(r)}
                  onClick={() => toggleIn('regions', r)}
                >
                  <MapPin size={12} strokeWidth={2} aria-hidden="true" />
                  {r}
                </button>
              ))}
              {fields.regions.filter((r) => !REGIONS.includes(r)).map((r) => (
                <button
                  key={r}
                  type="button"
                  className="ays-chip ays-chip-on ays-chip-custom"
                  onClick={() => toggleIn('regions', r)}
                >
                  {r} ×
                </button>
              ))}
            </div>
            <div className="ays-addstage">
              <input
                type="text"
                value={customRegion}
                onChange={(e) => setCustomRegion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); addCustom('regions', customRegion, () => setCustomRegion('')); }
                }}
                placeholder={t('custom_region_ph')}
              />
              <button type="button" className="ays-addbtn" onClick={() => addCustom('regions', customRegion, () => setCustomRegion(''))}>
                {t('add')}
              </button>
            </div>
          </Field>

          <Field label={t('f_offering')} full>
            <div className="ays-chips">
              {OFFERING_TYPES.map((o) => (
                <button
                  key={o}
                  type="button"
                  className={`ays-chip ${fields.offering_types.includes(o) ? 'ays-chip-on' : ''}`}
                  aria-pressed={fields.offering_types.includes(o)}
                  onClick={() => toggleIn('offering_types', o)}
                >
                  {o}
                </button>
              ))}
            </div>
          </Field>

          <Field label={t('f_stages')} full>
            <div className="ays-chips">
              {SUPPLY_CHAIN_STAGES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`ays-chip ${fields.supply_chain_stages.includes(s) ? 'ays-chip-on' : ''}`}
                  aria-pressed={fields.supply_chain_stages.includes(s)}
                  onClick={() => toggleIn('supply_chain_stages', s)}
                >
                  {s}
                </button>
              ))}
              {fields.supply_chain_stages.filter((s) => !SUPPLY_CHAIN_STAGES.includes(s)).map((s) => (
                <button
                  key={s}
                  type="button"
                  className="ays-chip ays-chip-on ays-chip-custom"
                  onClick={() => toggleIn('supply_chain_stages', s)}
                >
                  {s} ×
                </button>
              ))}
            </div>
            <div className="ays-addstage">
              <input
                type="text"
                value={customStage}
                onChange={(e) => setCustomStage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); addCustom('supply_chain_stages', customStage, () => setCustomStage('')); }
                }}
                placeholder={t('custom_stage_ph')}
              />
              <button type="button" className="ays-addbtn" onClick={() => addCustom('supply_chain_stages', customStage, () => setCustomStage(''))}>
                {t('add')}
              </button>
            </div>
          </Field>

          <Field label={t('f_problem')} full>
            <textarea
              value={fields.problem_solved}
              onChange={(e) => setField('problem_solved', e.target.value)}
              rows={4}
            />
          </Field>

          <Field label={t('f_customers')} hint={t('select_all')} full>
            <div className="ays-chips">
              {TARGET_CUSTOMER_TYPES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`ays-chip ${fields.target_customers.includes(c) ? 'ays-chip-on' : ''}`}
                  aria-pressed={fields.target_customers.includes(c)}
                  onClick={() => toggleIn('target_customers', c)}
                >
                  {c}
                </button>
              ))}
              {fields.target_customers.filter((c) => !TARGET_CUSTOMER_TYPES.includes(c)).map((c) => (
                <button
                  key={c}
                  type="button"
                  className="ays-chip ays-chip-on ays-chip-custom"
                  onClick={() => toggleIn('target_customers', c)}
                >
                  {c} ×
                </button>
              ))}
            </div>
            <div className="ays-addstage">
              <input
                type="text"
                value={customCustomer}
                onChange={(e) => setCustomCustomer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); addCustom('target_customers', customCustomer, () => setCustomCustomer('')); }
                }}
                placeholder={t('custom_customer_ph')}
              />
              <button type="button" className="ays-addbtn" onClick={() => addCustom('target_customers', customCustomer, () => setCustomCustomer(''))}>
                {t('add')}
              </button>
            </div>
          </Field>

          {saveError && <p className="ays-error" role="alert" aria-live="polite">{t('save_error')}</p>}
          {saveNotice && <p className="ays-notice" role="status">{t('saved')}</p>}

          <button type="submit" className="ays-btn ays-savebtn nxm-press" disabled={saving}>
            {saving ? t('saving') : t('save')}
          </button>
        </form>
      </div>

      <div className="ays-card nxm-in" style={staggerStyle(2)}>
        <h2 className="ays-sectiontitle">{t('sec_logo')}</h2>
        <div className="ays-logorow">
          <div className="ays-logobox">
            {logoUrl ? <img src={logoUrl} alt={t('logo_alt')} /> : <span className="ays-logoph">{t('no_logo')}</span>}
          </div>
          <label className={`ays-filebtn ${logoBusy ? 'ays-disabled' : ''}`}>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              disabled={logoBusy}
              onChange={handleLogoChange}
            />
            <ImageUp size={15} strokeWidth={1.75} aria-hidden="true" /> {logoBusy ? t('uploading') : t('replace_logo')}
          </label>
        </div>
        {logoError && <p className="ays-error" role="alert">{t('logo_error')}</p>}
      </div>

      <div className="ays-card nxm-in" style={staggerStyle(3)}>
        <h2 className="ays-sectiontitle">{t('sec_images')}</h2>
        <div className="ays-thumbrow">
          {imageUrls.map((url, idx) => (
            <div className="ays-thumb" key={imagePaths[idx] || url}>
              <img src={url} alt={`${t('product_alt')} ${idx + 1}`} />
              <button
                type="button"
                className="ays-thumbx"
                onClick={() => handleRemoveImage(idx)}
                disabled={removingIdx === idx}
                aria-label={`${t('remove_image_aria')} ${idx + 1}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        {imageUrls.length < MAX_PRODUCT_IMAGES && (
          <label className={`ays-filebtn ${imageBusy ? 'ays-disabled' : ''}`}>
            <input
              ref={imagesInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              disabled={imageBusy}
              onChange={handleAddImage}
            />
            <ImagePlus size={15} strokeWidth={1.75} aria-hidden="true" /> {imageBusy ? t('uploading') : t('add_image')}
          </label>
        )}
        {imageError && <p className="ays-error" role="alert">{t('image_error')}</p>}
      </div>
    </>
  );
}

function Field({
  label,
  full,
  hint,
  icon: Icon,
  children,
}: {
  label: string;
  full?: boolean;
  hint?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className={`ays-field ${full ? 'ays-field-full' : ''}`}>
      <label>
        {label}
        {hint && <span className="ays-hint">{hint}</span>}
      </label>
      {Icon ? (
        <div className="ays-inputicon-wrap">
          <span className="ays-fieldicon" aria-hidden="true"><Icon size={16} strokeWidth={1.75} /></span>
          {children}
        </div>
      ) : children}
    </div>
  );
}

const CSS = MOTION_CSS + `
.ays-root{min-height:100vh;background:var(--spec-warm-white,#F8F7FB);color:var(--spec-ink,#141320);font-family:var(--font-ibm-plex-sans-applystatus),'IBM Plex Sans',system-ui,sans-serif;-webkit-font-smoothing:antialiased;}
.ays-root *{box-sizing:border-box;}
.ays-root h1,.ays-root h2{font-family:var(--font-space-grotesk),'Space Grotesk',system-ui,sans-serif;}
.ays-root a:focus-visible,.ays-root button:focus-visible,.ays-root input:focus-visible,.ays-root select:focus-visible,.ays-root textarea:focus-visible{outline:2px solid var(--spec-violet,#6C5CE0);outline-offset:2px;}
.ays-nav{display:flex;align-items:center;justify-content:space-between;padding:20px 28px;max-width:920px;margin:0 auto;}
.ays-brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--spec-ink,#141320);}
.ays-brand b{font-family:var(--font-space-grotesk),'Space Grotesk',sans-serif;font-weight:700;font-size:17px;letter-spacing:-.01em;}
.ays-brand i{color:var(--spec-violet,#6C5CE0);font-style:normal;}
.ays-navright{display:flex;align-items:center;gap:14px;flex-wrap:wrap;}
.ays-signout{display:inline-flex;align-items:center;gap:6px;background:#fff;border:1px solid var(--spec-border,#E2DFEC);color:var(--spec-text-2nd,#615F72);border-radius:10px;padding:8px 14px;font:600 13px inherit;cursor:pointer;transition:border-color var(--spec-duration-fast,150ms) var(--spec-ease,ease),color var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.ays-signout:hover{border-color:var(--spec-violet,#6C5CE0);color:var(--spec-violet-deep,#4A3DB0);}
.ays-badge{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;font:600 12.5px inherit;letter-spacing:.01em;}
.ays-badge-pending{background:var(--spec-warning-bg,#FBF3E7);border:1px solid #EFD9AE;color:#8A5D14;}
.ays-badge-approved{background:var(--spec-success-bg,#E9F7F0);border:1px solid rgba(47,158,106,.3);color:#1F7A54;}
.ays-badge-rejected{background:var(--spec-error-bg,#FDF2F2);border:1px solid #F3C9C9;color:#B04A4A;}
.ays-main{max-width:720px;margin:0 auto;padding:24px 20px 80px;}
.ays-loading{text-align:center;color:#8A87A0;padding:80px 20px;font-size:15px;}
.ays-hero{text-align:center;padding:20px 8px 30px;}
.ays-hero h1{font-size:32px;font-weight:700;letter-spacing:-.02em;margin:0 0 10px;color:var(--spec-ink,#141320);}
.ays-ref{color:var(--spec-text-2nd,#615F72);font-size:14.5px;margin:0;}
.ays-ref b{color:var(--spec-violet-deep,#4A3DB0);font-family:var(--font-space-grotesk),'Space Grotesk',sans-serif;font-weight:700;font-size:15px;}
.ays-statusrow{margin-top:16px;display:flex;flex-direction:column;align-items:center;gap:8px;}
.ays-statusnext{margin:0;font-size:13.5px;line-height:1.55;color:var(--spec-text-2nd,#615F72);max-width:460px;}
.ays-card{background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:20px;box-shadow:0 8px 30px rgba(74,61,176,.08);padding:30px 32px;margin-bottom:24px;}
.ays-gate{text-align:center;padding:52px 34px;max-width:440px;margin:8vh auto 0;}
.ays-gate h1{font-size:26px;font-weight:700;margin:0 0 12px;letter-spacing:-.01em;color:var(--spec-ink,#141320);}
.ays-sub{color:var(--spec-text-2nd,#615F72);font-size:14.5px;line-height:1.6;margin:0 0 26px;}
.ays-sectiontitle{font-size:16px;font-weight:700;margin:0 0 20px;letter-spacing:-.01em;color:var(--spec-ink,#141320);}
.ays-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px;}
.ays-field{display:flex;flex-direction:column;gap:8px;}
.ays-field-full{grid-column:1/-1;margin-bottom:18px;}
.ays-field label{font-size:13px;font-weight:600;color:var(--spec-text-2nd,#615F72);display:flex;align-items:center;gap:8px;}
.ays-hint{color:#8A87A0;font-weight:400;font-size:12px;}
.ays-field input,.ays-field select,.ays-field textarea{
  width:100%;background:var(--spec-warm-white,#F8F7FB);border:1px solid var(--spec-border,#E2DFEC);border-radius:11px;padding:12px 14px;color:var(--spec-ink,#141320);font-size:14.5px;font-family:inherit;outline:none;transition:border-color var(--spec-duration-fast,150ms) var(--spec-ease,ease),background var(--spec-duration-fast,150ms) var(--spec-ease,ease),box-shadow var(--spec-duration-fast,150ms) var(--spec-ease,ease);
}
.ays-field input:disabled{opacity:.55;cursor:not-allowed;}
.ays-mt{margin-top:8px;}
.ays-field textarea{resize:vertical;line-height:1.5;}
.ays-field input:hover,.ays-field select:hover,.ays-field textarea:hover{border-color:#C7C2DE;}
.ays-field input:focus,.ays-field select:focus,.ays-field textarea:focus{border-color:var(--spec-violet,#6C5CE0);background:#fff;box-shadow:0 0 0 3px rgba(108,92,224,.12);}
.ays-inputicon-wrap{position:relative;}
.ays-fieldicon{position:absolute;left:13px;top:50%;transform:translateY(-50%);color:#8A87A0;display:flex;pointer-events:none;}
.ays-inputicon-wrap input{padding-left:38px !important;}
.ays-chips{display:flex;flex-wrap:wrap;gap:8px;}
.ays-chip{display:inline-flex;align-items:center;gap:6px;font-family:inherit;background:#fff;border:1.5px solid var(--spec-border,#E2DFEC);color:var(--spec-text-2nd,#615F72);border-radius:99px;padding:8px 15px;font-size:13px;font-weight:600;cursor:pointer;transition:border-color var(--spec-duration-fast,150ms) var(--spec-ease,ease),background var(--spec-duration-fast,150ms) var(--spec-ease,ease),color var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.ays-chip:hover{border-color:var(--spec-lilac,#A99DF2);color:var(--spec-ink,#141320);}
.ays-chip-on{background:var(--spec-violet-bg,#F3F1FD);border-color:var(--spec-violet,#6C5CE0);color:var(--spec-violet-deep,#4A3DB0);}
.ays-chip-custom:hover{border-color:var(--spec-error,#CE4B43);color:var(--spec-error,#CE4B43);}
.ays-addstage{display:flex;gap:8px;margin-top:10px;}
.ays-addstage input{flex:1;background:var(--spec-warm-white,#F8F7FB);border:1px solid var(--spec-border,#E2DFEC);border-radius:10px;padding:10px 13px;color:var(--spec-ink,#141320);font-size:13.5px;font-family:inherit;outline:none;}
.ays-addstage input:focus{border-color:var(--spec-violet,#6C5CE0);background:#fff;box-shadow:0 0 0 3px rgba(108,92,224,.12);}
.ays-addbtn{background:#fff;border:1px solid var(--spec-border,#E2DFEC);color:var(--spec-text-2nd,#615F72);border-radius:10px;padding:0 18px;font-size:13.5px;font-weight:600;font-family:inherit;cursor:pointer;transition:border-color var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.ays-addbtn:hover{border-color:var(--spec-violet,#6C5CE0);color:var(--spec-violet-deep,#4A3DB0);}
.ays-error{background:var(--spec-error-bg,#FDF2F2);border:1px solid #F3C9C9;color:#B04A4A;border-radius:11px;padding:12px 14px;font-size:14px;margin:4px 0 18px;}
.ays-notice{background:var(--spec-success-bg,#E9F7F0);border:1px solid rgba(47,158,106,.3);color:#1F7A54;border-radius:11px;padding:12px 14px;font-size:14px;margin:4px 0 18px;}
.ays-btn{display:inline-flex;align-items:center;justify-content:center;background:var(--spec-violet,#6C5CE0);color:#fff;border:none;border-radius:12px;padding:13px 22px;min-height:48px;font:700 15px inherit;cursor:pointer;text-decoration:none;transition:background var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.ays-btn:hover:not(:disabled){background:var(--spec-violet-deep,#4A3DB0);}
.ays-btn:disabled{opacity:.6;cursor:not-allowed;}
.ays-savebtn{width:100%;margin-top:4px;}
.ays-logorow{display:flex;align-items:center;gap:20px;}
.ays-logobox{width:72px;height:72px;border-radius:14px;overflow:hidden;background:var(--spec-warm-white,#F8F7FB);border:1px solid var(--spec-border,#E2DFEC);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.ays-logobox img{width:100%;height:100%;object-fit:cover;display:block;}
.ays-logoph{color:#A5A3B5;font-size:11px;text-align:center;padding:4px;}
.ays-filebtn{display:inline-flex;align-items:center;gap:8px;background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:10px;padding:10px 16px;font-size:13.5px;font-weight:600;color:var(--spec-text-2nd,#615F72);cursor:pointer;width:fit-content;transition:border-color var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.ays-filebtn:hover{border-color:var(--spec-violet,#6C5CE0);color:var(--spec-violet-deep,#4A3DB0);}
.ays-filebtn.ays-disabled{opacity:.5;cursor:not-allowed;}
.ays-filebtn input{display:none;}
.ays-thumbrow{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px;}
.ays-thumb{position:relative;width:80px;height:80px;border-radius:12px;overflow:hidden;border:1px solid var(--spec-border,#E2DFEC);background:var(--spec-warm-white,#F8F7FB);}
.ays-thumb img{width:100%;height:100%;object-fit:cover;display:block;}
.ays-thumbx{position:absolute;top:3px;right:3px;width:20px;height:20px;border-radius:50%;background:rgba(20,19,32,.72);border:none;color:#fff;font-size:14px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.ays-thumbx:hover:not(:disabled){background:var(--spec-error,#CE4B43);}
.ays-thumbx:disabled{opacity:.5;cursor:not-allowed;}
.ays-errorcard{padding:32px;}
@media(max-width:640px){
  .ays-grid{grid-template-columns:1fr;}
  .ays-card{padding:24px;}
  .ays-hero h1{font-size:26px;}
}
`;
