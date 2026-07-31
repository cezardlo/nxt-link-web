'use client';

import { useEffect, useRef, useState } from 'react';
import { IBM_Plex_Sans } from 'next/font/google';
import { Building2, User, Mail, Phone, Check, ArrowLeft, ImagePlus, ImageUp, type LucideIcon } from 'lucide-react';
import { MOTION_CSS, staggerStyle } from '@/components/motion/Motion';

// Public, low-friction vendor intake form. No login required to submit.
// Posts multipart/form-data (text fields + optional logo + up to 3 product
// images) to /api/apply/submit.
//
// Signed-in vendors (e.g. quick-signup accounts arriving from the portal's
// "finish your review application" card) get the form PRE-FILLED from their
// vendor profile — company, contact, email, phone, what they said they
// supply (fast-signup brief §4: never ask for the same data twice).
//
// Design System v1.0 reskin (2026-07-30 polish pass): this page (and its
// siblings /apply/login, /apply/status) were stranded on an old off-brand
// dark theme — "Outfit"/"Instrument Serif" fonts, #0A0A0F background, purple
// #7C5CFC accent — that predates the light warm-white + violet #6C5CE0
// system every other public/auth screen already uses. This is a visual-only
// reskin: every field, validator, fetch call, and the multipart submit body
// below are BYTE-IDENTICAL to before. Only the `Field` component gained an
// optional `icon` prop (new, additive) so the four identifying fields
// (company/contact/email/phone) can carry an inline Lucide icon per the
// design addendum — no field was added, removed, or renamed.

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

const PRICE_OPTIONS = ['under $5k', '$5-25k', '$25k+', 'Other'];

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

const REGIONS = ['El Paso', 'Juárez', 'New Mexico', 'West Texas', 'Cross-border', 'National', 'Other'];

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
  'Other',
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAX_PRODUCT_IMAGES = 3;

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans-apply',
  display: 'swap',
});

interface SubmitResponse {
  ok: boolean;
  stored?: boolean;
  degraded?: boolean;
  public_ref?: string;
  message?: string;
}

interface ImageItem {
  file: File;
  url: string;
}

export default function ApplyPage() {
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('');
  const [offeringTypes, setOfferingTypes] = useState<string[]>([]);
  const [stages, setStages] = useState<string[]>([]);
  const [customStage, setCustomStage] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [companySizeOther, setCompanySizeOther] = useState('');
  const [region, setRegion] = useState('');
  const [regionOther, setRegionOther] = useState('');
  const [problemSolved, setProblemSolved] = useState('');
  const [targetCustomer, setTargetCustomer] = useState('');
  const [targetCustomerOther, setTargetCustomerOther] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [priceOther, setPriceOther] = useState('');

  const [logo, setLogo] = useState<ImageItem | null>(null);
  const [images, setImages] = useState<ImageItem[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [agree, setAgree] = useState(false);

  const [result, setResult] = useState<{ publicRef: string; degraded: boolean } | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const imagesInputRef = useRef<HTMLInputElement>(null);

  // Anti-bot: honeypot field (humans never see/fill it) + time the form was opened.
  const [websiteUrl, setWebsiteUrl] = useState('');
  const startedAtRef = useRef(Date.now());

  // Signed-in vendors get the form pre-filled from their profile — the quick
  // signup already asked for company / email / supply, so we never ask twice.
  const [prefilled, setPrefilled] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch('/api/vendor/profile');
        if (r.status !== 200) return;
        const j = await r.json();
        const v = j?.vendor;
        if (!alive || !j?.ok || !v) return;
        const keep = (setter: (fn: (p: string) => string) => void, val: unknown) => {
          const s = String(val || '').trim();
          if (s) setter((p) => (p.trim() ? p : s));
        };
        const hasCompany = v.company_name && v.company_name !== 'New company';
        if (hasCompany) keep(setCompanyName, v.company_name);
        keep(setContactName, v.contact_name);
        keep(setEmail, v.email);
        keep(setPhone, v.phone);
        keep(setProblemSolved, v.description);
        const cats: string[] = Array.isArray(v.categories) ? v.categories : [];
        const catHit = CATEGORIES.find((c) => cats.some((x) => String(x).toLowerCase() === c.toLowerCase()));
        if (catHit) setCategory((p) => p || catHit);
        if (hasCompany || v.email) setPrefilled(true);
      } catch { /* not signed in — the blank form is the normal path */ }
    })();
    return () => { alive = false; };
  }, []);

  const emailValid = email.trim().length === 0 || EMAIL_RE.test(email.trim());

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (logo) URL.revokeObjectURL(logo.url);
    setLogo({ file, url: URL.createObjectURL(file) });
  }

  function removeLogo() {
    if (logo) URL.revokeObjectURL(logo.url);
    setLogo(null);
    if (logoInputRef.current) logoInputRef.current.value = '';
  }

  function handleImagesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;
    setImages((prev) => {
      const room = Math.max(0, MAX_PRODUCT_IMAGES - prev.length);
      const toAdd = picked.slice(0, room).map((file) => ({ file, url: URL.createObjectURL(file) }));
      return [...prev, ...toAdd];
    });
    if (imagesInputRef.current) imagesInputRef.current.value = '';
  }

  function removeImage(idx: number) {
    setImages((prev) => {
      const next = [...prev];
      const [removed] = next.splice(idx, 1);
      if (removed) URL.revokeObjectURL(removed.url);
      return next;
    });
  }

  function resolvedPriceRange(): string {
    if (priceRange === 'Other') return priceOther.trim();
    return priceRange;
  }
  function resolvedCompanySize(): string {
    if (companySize === 'Other') return companySizeOther.trim();
    return companySize;
  }
  function resolvedRegion(): string {
    if (region === 'Other') return regionOther.trim();
    return region;
  }
  function resolvedTargetCustomer(): string {
    if (targetCustomer === 'Other') return targetCustomerOther.trim();
    return targetCustomer;
  }

  function toggle(list: string[], value: string, setter: (next: string[]) => void) {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function addCustomStage() {
    const v = customStage.trim();
    if (!v || stages.includes(v)) { setCustomStage(''); return; }
    setStages((prev) => [...prev, v]);
    setCustomStage('');
  }

  function removeStage(value: string) {
    setStages((prev) => prev.filter((v) => v !== value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailTouched(true);
    setError('');

    if (!companyName.trim()) { setError('Company name is required.'); return; }
    if (!email.trim() || !EMAIL_RE.test(email.trim())) { setError('A valid email is required.'); return; }
    if (!category) { setError('Please choose a category.'); return; }
    if (!problemSolved.trim()) { setError('Please tell us what problem you solve.'); return; }
    if (!agree) { setError('Please accept the Terms of Service and Privacy Policy. / Por favor acepta los Términos de Servicio y el Aviso de Privacidad.'); return; }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('company_name', companyName.trim());
      fd.append('contact_name', contactName.trim());
      fd.append('email', email.trim());
      fd.append('phone', phone.trim());
      fd.append('category', category);
      for (const t of offeringTypes) fd.append('offering_types', t);
      for (const s of stages) fd.append('supply_chain_stages', s);
      fd.append('company_size', resolvedCompanySize());
      fd.append('region', resolvedRegion());
      fd.append('problem_solved', problemSolved.trim());
      fd.append('target_customer', resolvedTargetCustomer());
      fd.append('price_range', resolvedPriceRange());
      fd.append('website_url', websiteUrl);
      fd.append('started_at', String(startedAtRef.current));
      fd.append('terms_accepted', agree ? 'true' : 'false');
      if (logo) fd.append('logo', logo.file);
      for (const img of images) fd.append('images', img.file);

      const res = await fetch('/api/apply/submit', { method: 'POST', body: fd });
      const data: SubmitResponse = await res.json();

      if (!data.ok) {
        setError(data.message || 'Something went wrong. Please try again.');
        return;
      }

      // Backend always returns a usable reference, even when stored is false
      // and degraded is true (e.g. database not configured) — never a dead end.
      setResult({ publicRef: data.public_ref || '—', degraded: !!data.degraded });
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={`ap-root ${ibmPlexSans.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <TopNav />

      <main className="ap-main">
        {result ? (
          <ConfirmationCard publicRef={result.publicRef} />
        ) : (
          <>
            <header className="ap-hero nxm-in">
              <p className="ap-eyebrow">Vendor application</p>
              <h1>
                Tell us what you <em>solve</em>.
              </h1>
              <p className="ap-sub">
                A quick application — takes about two minutes. A human on our team reviews every
                submission personally.
              </p>
            </header>

            <form className="ap-card nxm-in" style={staggerStyle(1)} onSubmit={handleSubmit} noValidate>
              {prefilled && (
                <p className="ap-prefill">
                  <Check size={15} strokeWidth={2.5} aria-hidden="true" /> Pre-filled from your account — check it and submit. <i>Prellenado desde tu cuenta — revísalo y envíalo.</i>
                </p>
              )}
              <input
                type="text"
                name="website_url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
              />
              <div className="ap-grid">
                <Field label="Company name" required icon={Building2}>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Acme Logistics Systems"
                    required
                  />
                </Field>

                <Field label="Contact name" icon={User}>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Jane Rivera"
                  />
                </Field>

                <Field label="Email" required icon={Mail} error={emailTouched && !emailValid ? 'Enter a valid email address.' : undefined}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setEmailTouched(true)}
                    placeholder="jane@acmelogistics.com"
                    required
                    className={emailTouched && !emailValid ? 'ap-invalid' : ''}
                  />
                </Field>

                <Field label="Phone" icon={Phone}>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 555-5555"
                  />
                </Field>

                <Field label="Category" required>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} required>
                    <option value="" disabled>
                      Select a category
                    </option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Price range">
                  <select value={priceRange} onChange={(e) => setPriceRange(e.target.value)}>
                    <option value="">Select a range</option>
                    {PRICE_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  {priceRange === 'Other' && (
                    <input
                      type="text"
                      className="ap-mt"
                      value={priceOther}
                      onChange={(e) => setPriceOther(e.target.value)}
                      placeholder="Describe your pricing"
                    />
                  )}
                </Field>

                <Field label="Company size">
                  <select value={companySize} onChange={(e) => setCompanySize(e.target.value)}>
                    <option value="">Select a size</option>
                    {COMPANY_SIZES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {companySize === 'Other' && (
                    <input
                      type="text"
                      className="ap-mt"
                      value={companySizeOther}
                      onChange={(e) => setCompanySizeOther(e.target.value)}
                      placeholder="Describe your company size"
                    />
                  )}
                </Field>

                <Field label="Region">
                  <select value={region} onChange={(e) => setRegion(e.target.value)}>
                    <option value="">Select a region</option>
                    {REGIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  {region === 'Other' && (
                    <input
                      type="text"
                      className="ap-mt"
                      value={regionOther}
                      onChange={(e) => setRegionOther(e.target.value)}
                      placeholder="Describe your region"
                    />
                  )}
                </Field>
              </div>

              <Field label="What kind of offering is this?" hint="Select all that apply" full>
                <div className="ap-chips">
                  {OFFERING_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`ap-chip ${offeringTypes.includes(t) ? 'ap-chip-on' : ''}`}
                      aria-pressed={offeringTypes.includes(t)}
                      onClick={() => toggle(offeringTypes, t, setOfferingTypes)}
                    >
                      {offeringTypes.includes(t) && <Check size={13} strokeWidth={3} aria-hidden="true" />}
                      {t}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Where in the supply chain does this apply?" hint="Select all that apply" full>
                <div className="ap-chips">
                  {SUPPLY_CHAIN_STAGES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`ap-chip ${stages.includes(s) ? 'ap-chip-on' : ''}`}
                      aria-pressed={stages.includes(s)}
                      onClick={() => toggle(stages, s, setStages)}
                    >
                      {stages.includes(s) && <Check size={13} strokeWidth={3} aria-hidden="true" />}
                      {s}
                    </button>
                  ))}
                  {stages.filter((s) => !SUPPLY_CHAIN_STAGES.includes(s)).map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="ap-chip ap-chip-on ap-chip-custom"
                      onClick={() => removeStage(s)}
                    >
                      {s} ×
                    </button>
                  ))}
                </div>
                <div className="ap-addstage">
                  <input
                    type="text"
                    value={customStage}
                    onChange={(e) => setCustomStage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); addCustomStage(); }
                    }}
                    placeholder="Other — add your own stage"
                  />
                  <button type="button" className="ap-addbtn" onClick={addCustomStage}>
                    Add
                  </button>
                </div>
              </Field>

              <Field label="What problem do you solve?" required full>
                <textarea
                  value={problemSolved}
                  onChange={(e) => setProblemSolved(e.target.value)}
                  placeholder="In a couple of sentences, what does your product or service do?"
                  rows={4}
                  required
                />
              </Field>

              <Field label="Who do you serve best?" full>
                <select value={targetCustomer} onChange={(e) => setTargetCustomer(e.target.value)}>
                  <option value="">Select a customer type</option>
                  {TARGET_CUSTOMER_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                {targetCustomer === 'Other' && (
                  <input
                    type="text"
                    className="ap-mt"
                    value={targetCustomerOther}
                    onChange={(e) => setTargetCustomerOther(e.target.value)}
                    placeholder="Describe your ideal customer"
                  />
                )}
              </Field>

              <div className="ap-grid">
                <Field label="Logo" hint="Optional">
                  <label className="ap-filebtn">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleLogoChange}
                    />
                    <ImageUp size={15} strokeWidth={1.75} aria-hidden="true" /> Choose logo
                  </label>
                  {logo && (
                    <div className="ap-thumbrow">
                      <div className="ap-thumb">
                        <img src={logo.url} alt="Logo preview" />
                        <button type="button" className="ap-thumbx" onClick={removeLogo} aria-label="Remove logo">
                          ×
                        </button>
                      </div>
                    </div>
                  )}
                </Field>

                <Field label="Product images" hint={`Optional · up to ${MAX_PRODUCT_IMAGES}`}>
                  <label className={`ap-filebtn ${images.length >= MAX_PRODUCT_IMAGES ? 'ap-disabled' : ''}`}>
                    <input
                      ref={imagesInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      multiple
                      disabled={images.length >= MAX_PRODUCT_IMAGES}
                      onChange={handleImagesChange}
                    />
                    <ImagePlus size={15} strokeWidth={1.75} aria-hidden="true" /> Choose images
                  </label>
                  {images.length > 0 && (
                    <div className="ap-thumbrow">
                      {images.map((img, idx) => (
                        <div className="ap-thumb" key={img.url}>
                          <img src={img.url} alt={`Product ${idx + 1} preview`} />
                          <button
                            type="button"
                            className="ap-thumbx"
                            onClick={() => removeImage(idx)}
                            aria-label={`Remove product image ${idx + 1}`}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </Field>
              </div>

              <label className="ap-agree">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                />
                <span>
                  I agree to the <a href="/terms" target="_blank" rel="noopener">Terms of Service</a> and{' '}
                  <a href="/privacy" target="_blank" rel="noopener">Privacy Policy</a>.{' '}
                  <i>Acepto los <a href="/terms" target="_blank" rel="noopener">Términos de Servicio</a> y el{' '}
                  <a href="/privacy" target="_blank" rel="noopener">Aviso de Privacidad</a>.</i>
                </span>
              </label>

              {error && <p className="ap-error" role="alert" aria-live="polite">{error}</p>}

              <button type="submit" className="ap-submit nxm-press" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit application'}
              </button>

              <p className="ap-signin-hint">
                Already applied? <a href="/apply/login">Sign in</a> to check your status or make changes.
              </p>
            </form>
          </>
        )}
      </main>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  error,
  full,
  icon: Icon,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  full?: boolean;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className={`ap-field ${full ? 'ap-field-full' : ''} ${error ? 'ap-field-error' : ''}`}>
      <label>
        {label}
        {required && <span className="ap-req">*</span>}
        {hint && <span className="ap-hint">{hint}</span>}
      </label>
      {Icon ? (
        <div className="ap-inputicon-wrap">
          <span className="ap-fieldicon" aria-hidden="true"><Icon size={16} strokeWidth={1.75} /></span>
          {children}
        </div>
      ) : children}
      {error && <p className="ap-fielderror">{error}</p>}
    </div>
  );
}

function TopNav() {
  return (
    <nav className="ap-nav">
      <a className="ap-brand" href="/">
        <b>
          NXT<i>{'//'}</i>LINK
        </b>
      </a>
      <a className="ap-signin" href="/apply/login">
        Already applied? Sign in
      </a>
    </nav>
  );
}

function ConfirmationCard({ publicRef }: { publicRef: string }) {
  return (
    <div className="ap-card ap-confirm nxm-in">
      <div className="ap-check"><Check size={26} strokeWidth={2.5} aria-hidden="true" /></div>
      <h2>Application received</h2>
      <p className="ap-refline">
        Your reference: <b>{publicRef}</b>
      </p>
      <p className="ap-confirmsub">
        A human on the NXT//LINK team will review your application and follow up shortly.
      </p>

      <div className="ap-upsell">
        <p className="ap-upsell-title">Want to check status or update your application later?</p>
        <p className="ap-upsell-sub">Create an account to sign back in anytime — completely optional.</p>
        <a className="ap-upsell-btn nxm-press" href="/apply/login">
          Create account / sign in
        </a>
      </div>

      <a className="ap-back" href="/">
        <ArrowLeft size={14} strokeWidth={1.75} aria-hidden="true" /> Back to NXT//LINK
      </a>
    </div>
  );
}

const CSS = MOTION_CSS + `
.ap-root{min-height:100vh;background:var(--spec-warm-white,#F8F7FB);color:var(--spec-ink,#141320);font-family:var(--font-ibm-plex-sans-apply),'IBM Plex Sans',ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;-webkit-font-smoothing:antialiased;}
.ap-root *{box-sizing:border-box;}
.ap-root h1,.ap-root h2{font-family:var(--font-space-grotesk),'Space Grotesk',system-ui,sans-serif;}
.ap-root a:focus-visible,.ap-root button:focus-visible,.ap-root input:focus-visible,.ap-root select:focus-visible,.ap-root textarea:focus-visible{outline:2px solid var(--spec-violet,#6C5CE0);outline-offset:2px;}
.ap-nav{display:flex;align-items:center;justify-content:space-between;padding:20px 28px;max-width:920px;margin:0 auto;}
.ap-brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--spec-ink,#141320);}
.ap-brand b{font-family:var(--font-space-grotesk),'Space Grotesk',sans-serif;font-weight:700;font-size:17px;letter-spacing:-.01em;}
.ap-brand i{color:var(--spec-violet,#6C5CE0);font-style:normal;}
.ap-signin{color:var(--spec-text-2nd,#615F72);font-size:13.5px;text-decoration:none;font-weight:600;}
.ap-signin:hover{color:var(--spec-violet-deep,#4A3DB0);}
.ap-main{max-width:720px;margin:0 auto;padding:24px 20px 80px;}
.ap-hero{text-align:center;padding:36px 8px 30px;}
.ap-eyebrow{color:var(--spec-violet-deep,#4A3DB0);font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;margin:0 0 14px;}
.ap-hero h1{font-size:38px;font-weight:700;letter-spacing:-.02em;line-height:1.15;margin:0 0 14px;color:var(--spec-ink,#141320);}
.ap-hero h1 em{font-style:normal;color:var(--spec-violet,#6C5CE0);}
.ap-sub{color:var(--spec-text-2nd,#615F72);font-size:16px;line-height:1.6;max-width:480px;margin:0 auto;}
.ap-card{background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:20px;box-shadow:0 8px 30px rgba(74,61,176,.08);padding:32px;}
.ap-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px;}
.ap-field{display:flex;flex-direction:column;gap:8px;}
.ap-field-full{grid-column:1/-1;}
.ap-field label{font-size:13px;font-weight:600;color:var(--spec-text-2nd,#615F72);display:flex;align-items:center;gap:6px;}
.ap-req{color:var(--spec-violet,#6C5CE0);}
.ap-hint{color:#8A87A0;font-weight:400;font-size:12px;}
.ap-field input[type="text"],.ap-field input[type="email"],.ap-field input[type="tel"],.ap-field select,.ap-field textarea{
  width:100%;background:var(--spec-warm-white,#F8F7FB);border:1px solid var(--spec-border,#E2DFEC);border-radius:11px;padding:12px 14px;color:var(--spec-ink,#141320);font-size:14.5px;font-family:inherit;outline:none;transition:border-color var(--spec-duration-fast,150ms) var(--spec-ease,ease),box-shadow var(--spec-duration-fast,150ms) var(--spec-ease,ease),background var(--spec-duration-fast,150ms) var(--spec-ease,ease);
}
.ap-field input::placeholder,.ap-field textarea::placeholder{color:#8A87A0;}
.ap-field textarea{resize:vertical;line-height:1.5;}
.ap-field input:hover,.ap-field select:hover,.ap-field textarea:hover{border-color:#C7C2DE;}
.ap-field input:focus,.ap-field select:focus,.ap-field textarea:focus{border-color:var(--spec-violet,#6C5CE0);background:#fff;box-shadow:0 0 0 3px rgba(108,92,224,.12);}
.ap-field input.ap-invalid{border-color:var(--spec-error,#CE4B43);}
.ap-field-error input,.ap-field-error select{border-color:var(--spec-error,#CE4B43);}
.ap-inputicon-wrap{position:relative;}
.ap-fieldicon{position:absolute;left:13px;top:50%;transform:translateY(-50%);color:#8A87A0;display:flex;pointer-events:none;}
.ap-inputicon-wrap input{padding-left:38px !important;}
.ap-mt{margin-top:8px;}
.ap-chips{display:flex;flex-wrap:wrap;gap:8px;}
.ap-chip{display:inline-flex;align-items:center;gap:6px;font-family:inherit;background:#fff;border:1.5px solid var(--spec-border,#E2DFEC);color:var(--spec-text-2nd,#615F72);border-radius:99px;padding:8px 15px;font-size:13px;font-weight:600;cursor:pointer;transition:border-color var(--spec-duration-fast,150ms) var(--spec-ease,ease),background var(--spec-duration-fast,150ms) var(--spec-ease,ease),color var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.ap-chip:hover{border-color:var(--spec-lilac,#A99DF2);color:var(--spec-ink,#141320);}
.ap-chip:focus-visible{outline:2px solid var(--spec-violet,#6C5CE0);outline-offset:2px;}
.ap-chip-on{background:var(--spec-violet-bg,#F3F1FD);border-color:var(--spec-violet,#6C5CE0);color:var(--spec-violet-deep,#4A3DB0);}
.ap-chip-custom:hover{border-color:var(--spec-error,#CE4B43);color:var(--spec-error,#CE4B43);}
.ap-addstage{display:flex;gap:8px;margin-top:10px;}
.ap-addstage input{flex:1;background:var(--spec-warm-white,#F8F7FB);border:1px solid var(--spec-border,#E2DFEC);border-radius:10px;padding:10px 13px;color:var(--spec-ink,#141320);font-size:13.5px;font-family:inherit;outline:none;}
.ap-addstage input:focus{border-color:var(--spec-violet,#6C5CE0);background:#fff;box-shadow:0 0 0 3px rgba(108,92,224,.12);}
.ap-addbtn{background:#fff;border:1px solid var(--spec-border,#E2DFEC);color:var(--spec-text-2nd,#615F72);border-radius:10px;padding:0 18px;font-size:13.5px;font-weight:600;font-family:inherit;cursor:pointer;transition:border-color var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.ap-addbtn:hover{border-color:var(--spec-violet,#6C5CE0);color:var(--spec-violet-deep,#4A3DB0);}
.ap-fielderror{color:var(--spec-error,#CE4B43);font-size:12.5px;margin:0;}
.ap-error{background:var(--spec-error-bg,#FDF2F2);border:1px solid #F3C9C9;color:#B04A4A;border-radius:11px;padding:12px 14px;font-size:14px;margin:4px 0 18px;}
.ap-prefill{display:flex;align-items:center;gap:8px;background:var(--spec-success-bg,#E9F7F0);border:1px solid rgba(47,158,106,.3);color:#1F7A54;border-radius:11px;padding:11px 14px;font-size:13px;margin:0 0 18px;line-height:1.5;}
.ap-prefill i{color:#8A87A0;font-style:normal;}
.ap-agree{display:flex;align-items:flex-start;gap:10px;cursor:pointer;margin:6px 0 16px;}
.ap-agree input{width:16px;height:16px;margin-top:2px;flex-shrink:0;accent-color:var(--spec-violet,#6C5CE0);cursor:pointer;}
.ap-agree input:focus-visible{outline:2px solid var(--spec-violet,#6C5CE0);outline-offset:2px;}
.ap-agree span{color:#8A87A0;font-size:12.5px;line-height:1.55;}
.ap-agree span a{color:var(--spec-violet-deep,#4A3DB0);}
.ap-agree span i{color:#A5A3B5;font-style:normal;}
.ap-filebtn{display:inline-flex;align-items:center;gap:8px;background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:10px;padding:10px 16px;font-size:13.5px;font-weight:600;color:var(--spec-text-2nd,#615F72);cursor:pointer;width:fit-content;transition:border-color var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.ap-filebtn:hover{border-color:var(--spec-violet,#6C5CE0);color:var(--spec-violet-deep,#4A3DB0);}
.ap-filebtn.ap-disabled{opacity:.5;cursor:not-allowed;}
.ap-filebtn input{display:none;}
.ap-thumbrow{display:flex;flex-wrap:wrap;gap:10px;margin-top:10px;}
.ap-thumb{position:relative;width:64px;height:64px;border-radius:10px;overflow:hidden;border:1px solid var(--spec-border,#E2DFEC);background:var(--spec-warm-white,#F8F7FB);}
.ap-thumb img{width:100%;height:100%;object-fit:cover;display:block;}
.ap-thumbx{position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:50%;background:rgba(20,19,32,.72);border:none;color:#fff;font-size:13px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.ap-thumbx:hover{background:var(--spec-error,#CE4B43);}
.ap-submit{width:100%;padding:15px;min-height:50px;background:var(--spec-violet,#6C5CE0);color:#fff;border:none;border-radius:12px;font-size:15.5px;font-weight:700;font-family:inherit;cursor:pointer;transition:background var(--spec-duration-fast,150ms) var(--spec-ease,ease);margin-top:4px;}
.ap-submit:hover:not(:disabled){background:var(--spec-violet-deep,#4A3DB0);}
.ap-submit:disabled{opacity:.6;cursor:wait;}
.ap-signin-hint{text-align:center;color:#8A87A0;font-size:13.5px;margin:16px 0 0;}
.ap-signin-hint a{color:var(--spec-violet-deep,#4A3DB0);text-decoration:none;font-weight:600;}
.ap-signin-hint a:hover{text-decoration:underline;}
.ap-confirm{text-align:center;padding:44px 32px;}
.ap-check{width:60px;height:60px;border-radius:50%;background:var(--spec-success-bg,#E9F7F0);color:#1F7A54;display:flex;align-items:center;justify-content:center;margin:0 auto 22px;}
.ap-confirm h2{font-size:26px;font-weight:700;margin:0 0 12px;letter-spacing:-.01em;color:var(--spec-ink,#141320);}
.ap-refline{color:var(--spec-text-2nd,#615F72);font-size:16px;margin:0 0 10px;}
.ap-refline b{color:var(--spec-violet-deep,#4A3DB0);font-family:var(--font-space-grotesk),'Space Grotesk',sans-serif;font-size:17px;font-weight:700;}
.ap-confirmsub{color:#8A87A0;font-size:14.5px;line-height:1.6;max-width:420px;margin:0 auto 28px;}
.ap-upsell{background:var(--spec-warm-white,#F8F7FB);border:1px solid var(--spec-border,#E2DFEC);border-radius:16px;padding:22px;margin-bottom:26px;}
.ap-upsell-title{font-size:15px;font-weight:600;color:var(--spec-ink,#141320);margin:0 0 6px;}
.ap-upsell-sub{font-size:13.5px;color:#8A87A0;margin:0 0 16px;}
.ap-upsell-btn{display:inline-block;background:#fff;border:1px solid var(--spec-border,#E2DFEC);color:var(--spec-ink,#141320);padding:10px 20px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;transition:border-color var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.ap-upsell-btn:hover{border-color:var(--spec-violet,#6C5CE0);color:var(--spec-violet-deep,#4A3DB0);}
.ap-back{display:inline-flex;align-items:center;gap:6px;color:#8A87A0;font-size:13.5px;text-decoration:none;}
.ap-back:hover{color:var(--spec-text-2nd,#615F72);}
@media(max-width:640px){
  .ap-grid{grid-template-columns:1fr;}
  .ap-hero h1{font-size:30px;}
  .ap-card{padding:24px;}
}
`;
