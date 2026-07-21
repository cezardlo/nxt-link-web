'use client';

// /apply/status — signed-in vendor: check application status and edit YOUR
// own submission (private intake system; admin never exposed here). This is
// a brand-new, standalone flow — unrelated to the older /vendor-signup,
// /vendor-login, /vendor/portal system (which uses a different table,
// vendor_profiles) — do not merge with that flow.

import { useEffect, useRef, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser-auth';
import { clearLocalCart } from '@/components/cart/useCart';

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
  problem_solved: string;
  target_customer: string;
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

export default function ApplyStatusPage() {
  const [authState, setAuthState] = useState<AuthState>('checking');
  const [loading, setLoading] = useState(false);
  const [application, setApplication] = useState<Application | null>(null);
  const [loadError, setLoadError] = useState('');

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
          setLoadError(json.message || 'Could not load your application.');
        } else {
          setApplication(json.application);
        }
      } catch {
        if (!cancelled) setLoadError('Could not load your application.');
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
    <div className="ays-root">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <TopNav status={application?.status} onSignOut={authState === 'signed-in' ? handleSignOut : undefined} />

      <main className="ays-main">
        {authState === 'checking' && <div className="ays-loading">Loading…</div>}

        {authState === 'signed-out' && <SignInGate />}

        {authState === 'signed-in' && loading && <div className="ays-loading">Loading your application…</div>}

        {authState === 'signed-in' && !loading && loadError && (
          <div className="ays-card ays-errorcard">
            <p className="ays-error">{loadError}</p>
          </div>
        )}

        {authState === 'signed-in' && !loading && !loadError && application === null && <EmptyState />}

        {authState === 'signed-in' && !loading && !loadError && application !== null && (
          <ApplicationPanel application={application} onApplicationChange={setApplication} />
        )}
      </main>
    </div>
  );
}

function SignInGate() {
  return (
    <div className="ays-card ays-gate">
      <h1>Sign in to view your status</h1>
      <p className="ays-sub">Sign in to check your application status and make changes.</p>
      <a className="ays-btn" href="/apply/login">
        Sign in
      </a>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="ays-card ays-gate">
      <h1>You haven&apos;t applied yet</h1>
      <p className="ays-sub">Submit a quick application to get started — it only takes a couple of minutes.</p>
      <a className="ays-btn" href="/apply">
        Apply now
      </a>
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const label = status === 'pending' ? 'Pending review' : status === 'approved' ? 'Approved' : 'Rejected';
  const cls = status === 'pending' ? 'ays-badge-pending' : status === 'approved' ? 'ays-badge-approved' : 'ays-badge-rejected';
  return <span className={`ays-badge ${cls}`}>{label}</span>;
}

function TopNav({ status, onSignOut }: { status?: Status; onSignOut?: () => void }) {
  return (
    <nav className="ays-nav">
      <a className="ays-brand" href="/">
        <span className="ays-mk">N</span>
        <b>
          NXT<i>{'//'}</i>LINK
        </b>
      </a>
      <div className="ays-navright">
        {status && <StatusBadge status={status} />}
        {onSignOut && (
          <button type="button" className="ays-signout" onClick={onSignOut}>
            Sign out
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
}

function ApplicationPanel({
  application,
  onApplicationChange,
}: {
  application: Application;
  onApplicationChange: (app: Application) => void;
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
  });

  const initSize = resolveOptionValue(application.company_size || '', COMPANY_SIZES);
  const initRegion = resolveOptionValue(application.region || '', REGIONS);
  const initCustomer = resolveOptionValue(application.target_customer || '', TARGET_CUSTOMER_TYPES);
  const [companySize, setCompanySize] = useState(initSize.select);
  const [companySizeOther, setCompanySizeOther] = useState(initSize.other);
  const [region, setRegion] = useState(initRegion.select);
  const [regionOther, setRegionOther] = useState(initRegion.other);
  const [targetCustomer, setTargetCustomer] = useState(initCustomer.select);
  const [targetCustomerOther, setTargetCustomerOther] = useState(initCustomer.other);

  const [customStage, setCustomStage] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveNotice, setSaveNotice] = useState('');

  const [logoUrl, setLogoUrl] = useState<string | null>(application.logo_url);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [imageUrls, setImageUrls] = useState<string[]>(application.image_urls || []);
  const [imagePaths, setImagePaths] = useState<string[]>(application.product_image_paths || []);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState('');
  const [removingIdx, setRemovingIdx] = useState<number | null>(null);
  const imagesInputRef = useRef<HTMLInputElement>(null);

  function setField<K extends keyof EditableFields>(key: K, value: EditableFields[K]) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function toggleOffering(value: string) {
    setFields((prev) => ({
      ...prev,
      offering_types: prev.offering_types.includes(value)
        ? prev.offering_types.filter((v) => v !== value)
        : [...prev.offering_types, value],
    }));
  }

  function toggleStage(value: string) {
    setFields((prev) => ({
      ...prev,
      supply_chain_stages: prev.supply_chain_stages.includes(value)
        ? prev.supply_chain_stages.filter((v) => v !== value)
        : [...prev.supply_chain_stages, value],
    }));
  }

  function addCustomStage() {
    const v = customStage.trim();
    if (!v || fields.supply_chain_stages.includes(v)) { setCustomStage(''); return; }
    setFields((prev) => ({ ...prev, supply_chain_stages: [...prev.supply_chain_stages, v] }));
    setCustomStage('');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    setSaveNotice('');
    const resolved = {
      ...fields,
      company_size: companySize === 'Other' ? companySizeOther.trim() : companySize,
      region: region === 'Other' ? regionOther.trim() : region,
      target_customer: targetCustomer === 'Other' ? targetCustomerOther.trim() : targetCustomer,
    };
    try {
      const res = await fetch('/api/apply/my', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resolved),
      });
      const json = await res.json();
      if (!json.ok) {
        setSaveError(json.message || 'Could not save your changes.');
        return;
      }
      setSaveNotice('Changes saved.');
      onApplicationChange({ ...application, ...resolved });
    } catch {
      setSaveError('Could not save your changes.');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoBusy(true);
    setLogoError('');
    try {
      const fd = new FormData();
      fd.append('kind', 'logo');
      fd.append('file', file);
      const res = await fetch('/api/apply/my/media', { method: 'POST', body: fd });
      const json = await res.json();
      if (!json.ok) {
        setLogoError(json.message || 'Could not upload logo.');
        return;
      }
      setLogoUrl(json.logo_url || null);
    } catch {
      setLogoError('Could not upload logo.');
    } finally {
      setLogoBusy(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  }

  async function handleAddImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageBusy(true);
    setImageError('');
    try {
      const fd = new FormData();
      fd.append('kind', 'image');
      fd.append('file', file);
      const res = await fetch('/api/apply/my/media', { method: 'POST', body: fd });
      const json = await res.json();
      if (!json.ok) {
        setImageError(json.message || 'Could not upload image.');
        return;
      }
      setImageUrls((prev) => [...prev, json.image_url as string]);
      setImagePaths((prev) => [...prev, json.path as string]);
    } catch {
      setImageError('Could not upload image.');
    } finally {
      setImageBusy(false);
      if (imagesInputRef.current) imagesInputRef.current.value = '';
    }
  }

  async function handleRemoveImage(idx: number) {
    const path = imagePaths[idx];
    if (!path) return;
    setRemovingIdx(idx);
    setImageError('');
    try {
      const res = await fetch(`/api/apply/my/media?kind=image&path=${encodeURIComponent(path)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.ok) {
        setImageError(json.message || 'Could not remove image.');
        return;
      }
      setImageUrls((prev) => prev.filter((_, i) => i !== idx));
      setImagePaths((prev) => prev.filter((_, i) => i !== idx));
    } catch {
      setImageError('Could not remove image.');
    } finally {
      setRemovingIdx(null);
    }
  }

  return (
    <>
      <header className="ays-hero">
        <h1>{application.company_name || 'Your application'}</h1>
        <p className="ays-ref">
          Reference: <b>{application.public_ref}</b>
        </p>
      </header>

      <div className="ays-card">
        <h2 className="ays-sectiontitle">Company details</h2>
        <form onSubmit={handleSave}>
          <div className="ays-grid">
            <Field label="Company name">
              <input
                type="text"
                value={fields.company_name}
                onChange={(e) => setField('company_name', e.target.value)}
              />
            </Field>

            <Field label="Contact name">
              <input
                type="text"
                value={fields.contact_name}
                onChange={(e) => setField('contact_name', e.target.value)}
              />
            </Field>

            <Field label="Email">
              <input type="email" value={application.email} disabled />
            </Field>

            <Field label="Phone">
              <input type="tel" value={fields.phone} onChange={(e) => setField('phone', e.target.value)} />
            </Field>

            <Field label="Category">
              <select value={fields.category} onChange={(e) => setField('category', e.target.value)}>
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
              <input
                type="text"
                value={fields.price_range}
                onChange={(e) => setField('price_range', e.target.value)}
                placeholder="e.g. $5-25k"
              />
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
                  className="ays-mt"
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
                  className="ays-mt"
                  value={regionOther}
                  onChange={(e) => setRegionOther(e.target.value)}
                  placeholder="Describe your region"
                />
              )}
            </Field>
          </div>

          <Field label="What kind of offering is this?" full>
            <div className="ays-chips">
              {OFFERING_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`ays-chip ${fields.offering_types.includes(t) ? 'ays-chip-on' : ''}`}
                  onClick={() => toggleOffering(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Where in the supply chain does this apply?" full>
            <div className="ays-chips">
              {SUPPLY_CHAIN_STAGES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`ays-chip ${fields.supply_chain_stages.includes(s) ? 'ays-chip-on' : ''}`}
                  onClick={() => toggleStage(s)}
                >
                  {s}
                </button>
              ))}
              {fields.supply_chain_stages.filter((s) => !SUPPLY_CHAIN_STAGES.includes(s)).map((s) => (
                <button
                  key={s}
                  type="button"
                  className="ays-chip ays-chip-on ays-chip-custom"
                  onClick={() => toggleStage(s)}
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
                  if (e.key === 'Enter') { e.preventDefault(); addCustomStage(); }
                }}
                placeholder="Other — add your own stage"
              />
              <button type="button" className="ays-addbtn" onClick={addCustomStage}>
                Add
              </button>
            </div>
          </Field>

          <Field label="What problem do you solve?" full>
            <textarea
              value={fields.problem_solved}
              onChange={(e) => setField('problem_solved', e.target.value)}
              rows={4}
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
                className="ays-mt"
                value={targetCustomerOther}
                onChange={(e) => setTargetCustomerOther(e.target.value)}
                placeholder="Describe your ideal customer"
              />
            )}
          </Field>

          {saveError && <p className="ays-error">{saveError}</p>}
          {saveNotice && <p className="ays-notice">{saveNotice}</p>}

          <button type="submit" className="ays-btn ays-savebtn" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>

      <div className="ays-card">
        <h2 className="ays-sectiontitle">Logo</h2>
        <div className="ays-logorow">
          <div className="ays-logobox">
            {logoUrl ? <img src={logoUrl} alt="Company logo" /> : <span className="ays-logoph">No logo</span>}
          </div>
          <label className={`ays-filebtn ${logoBusy ? 'ays-disabled' : ''}`}>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              disabled={logoBusy}
              onChange={handleLogoChange}
            />
            {logoBusy ? 'Uploading…' : 'Replace logo'}
          </label>
        </div>
        {logoError && <p className="ays-error">{logoError}</p>}
      </div>

      <div className="ays-card">
        <h2 className="ays-sectiontitle">Product images</h2>
        <div className="ays-thumbrow">
          {imageUrls.map((url, idx) => (
            <div className="ays-thumb" key={imagePaths[idx] || url}>
              <img src={url} alt={`Product ${idx + 1}`} />
              <button
                type="button"
                className="ays-thumbx"
                onClick={() => handleRemoveImage(idx)}
                disabled={removingIdx === idx}
                aria-label={`Remove product image ${idx + 1}`}
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
            {imageBusy ? 'Uploading…' : 'Add image'}
          </label>
        )}
        {imageError && <p className="ays-error">{imageError}</p>}
      </div>
    </>
  );
}

function Field({
  label,
  full,
  children,
}: {
  label: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`ays-field ${full ? 'ays-field-full' : ''}`}>
      <label>{label}</label>
      {children}
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap');
.ays-root{--bg:#0A0A0F;--bg2:#111118;--surf:rgba(255,255,255,.04);--surf2:rgba(255,255,255,.07);--ink:#F0F0F5;--ink2:#C0C0D0;--muted:#8080A0;--muted2:#505068;--line:rgba(255,255,255,.08);--p:#7C5CFC;--p2:#A78BFA;--p3:#C4B5FD;--pbg:rgba(124,92,252,.12);--pd:#6344DF;--green:#34D399;--red:#F87171;--sans:'Outfit',system-ui,sans-serif;--serif:'Instrument Serif',Georgia,serif;
  min-height:100vh;background:var(--bg);color:var(--ink);font-family:var(--sans);-webkit-font-smoothing:antialiased;
}
.ays-root *{box-sizing:border-box;}
.ays-nav{display:flex;align-items:center;justify-content:space-between;padding:20px 28px;max-width:920px;margin:0 auto;}
.ays-brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--ink);}
.ays-mk{width:30px;height:32px;border-radius:9px;background:linear-gradient(135deg,var(--p),var(--pd));display:flex;align-items:center;justify-content:center;font-family:var(--serif);font-style:italic;font-size:19px;color:#fff;flex-shrink:0;}
.ays-brand b{font-weight:700;font-size:17px;letter-spacing:-.01em;}
.ays-brand i{color:var(--p2);font-style:normal;}
.ays-navright{display:flex;align-items:center;gap:14px;}
.ays-signout{background:var(--surf);border:1px solid var(--line);color:var(--ink2);border-radius:10px;padding:8px 14px;font:600 13px 'Outfit';cursor:pointer;transition:border-color .15s,color .15s;}
.ays-signout:hover{border-color:var(--p);color:var(--ink);}
.ays-badge{display:inline-flex;align-items:center;padding:6px 12px;border-radius:999px;font:600 12.5px 'Outfit';letter-spacing:.01em;}
.ays-badge-pending{background:rgba(251,191,36,.12);border:1px solid rgba(251,191,36,.3);color:#FBBF24;}
.ays-badge-approved{background:rgba(52,211,153,.12);border:1px solid rgba(52,211,153,.3);color:var(--green);}
.ays-badge-rejected{background:rgba(248,113,113,.12);border:1px solid rgba(248,113,113,.3);color:var(--muted);}
.ays-main{max-width:720px;margin:0 auto;padding:24px 20px 80px;}
.ays-loading{text-align:center;color:var(--muted);padding:80px 20px;font-size:15px;}
.ays-hero{text-align:center;padding:20px 8px 30px;}
.ays-hero h1{font-size:32px;font-weight:700;letter-spacing:-.02em;margin:0 0 10px;}
.ays-ref{color:var(--ink2);font-size:14.5px;margin:0;}
.ays-ref b{color:var(--p3);font-family:var(--serif);font-style:italic;font-weight:400;font-size:16px;}
.ays-card{background:var(--surf);border:1px solid var(--line);border-radius:20px;backdrop-filter:blur(12px);box-shadow:0 24px 80px rgba(0,0,0,.4);padding:30px 32px;margin-bottom:24px;}
.ays-gate{text-align:center;padding:52px 34px;max-width:440px;margin:8vh auto 0;}
.ays-gate h1{font-size:26px;font-weight:700;margin:0 0 12px;letter-spacing:-.01em;}
.ays-sub{color:var(--ink2);font-size:14.5px;line-height:1.6;margin:0 0 26px;}
.ays-sectiontitle{font-size:16px;font-weight:700;margin:0 0 20px;letter-spacing:-.01em;}
.ays-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px;}
.ays-field{display:flex;flex-direction:column;gap:8px;}
.ays-field-full{grid-column:1/-1;margin-bottom:18px;}
.ays-field label{font-size:13px;font-weight:600;color:var(--ink2);}
.ays-field input,.ays-field select,.ays-field textarea{
  width:100%;background:var(--bg);border:1px solid var(--line);border-radius:11px;padding:12px 14px;color:var(--ink);font-size:14.5px;font-family:var(--sans);outline:none;transition:border-color .15s,box-shadow .15s;
}
.ays-field input:disabled{opacity:.55;cursor:not-allowed;}
.ays-mt{margin-top:8px;}
.ays-field textarea{resize:vertical;line-height:1.5;}
.ays-field input:focus,.ays-field select:focus,.ays-field textarea:focus{border-color:var(--p);box-shadow:0 0 0 3px var(--pbg);}
.ays-chips{display:flex;flex-wrap:wrap;gap:8px;}
.ays-chip{font-family:var(--sans);background:var(--surf2);border:1px solid var(--line);color:var(--ink2);border-radius:99px;padding:8px 15px;font-size:13px;font-weight:500;cursor:pointer;transition:border-color .15s,background .15s,color .15s;}
.ays-chip:hover{border-color:var(--p);color:var(--ink);}
.ays-chip-on{background:var(--pbg);border-color:var(--p);color:var(--p3);}
.ays-chip-custom:hover{border-color:var(--red);color:var(--red);}
.ays-addstage{display:flex;gap:8px;margin-top:10px;}
.ays-addstage input{flex:1;background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:10px 13px;color:var(--ink);font-size:13.5px;font-family:var(--sans);outline:none;}
.ays-addstage input:focus{border-color:var(--p);box-shadow:0 0 0 3px var(--pbg);}
.ays-addbtn{background:var(--surf2);border:1px solid var(--line);color:var(--ink2);border-radius:10px;padding:0 18px;font-size:13.5px;font-weight:600;font-family:var(--sans);cursor:pointer;transition:border-color .15s;}
.ays-addbtn:hover{border-color:var(--p);color:var(--ink);}
.ays-error{background:rgba(248,113,113,.12);border:1px solid rgba(248,113,113,.3);color:var(--red);border-radius:11px;padding:12px 14px;font-size:14px;margin:4px 0 18px;}
.ays-notice{background:rgba(52,211,153,.12);border:1px solid rgba(52,211,153,.3);color:var(--green);border-radius:11px;padding:12px 14px;font-size:14px;margin:4px 0 18px;}
.ays-btn{display:inline-flex;align-items:center;justify-content:center;background:var(--p);color:#fff;border:none;border-radius:12px;padding:13px 22px;font:600 15px 'Outfit';cursor:pointer;text-decoration:none;box-shadow:0 8px 24px rgba(124,92,252,.35);transition:background .15s;}
.ays-btn:hover:not(:disabled){background:var(--pd);}
.ays-btn:disabled{opacity:.6;cursor:not-allowed;}
.ays-savebtn{width:100%;margin-top:4px;}
.ays-logorow{display:flex;align-items:center;gap:20px;}
.ays-logobox{width:72px;height:72px;border-radius:14px;overflow:hidden;background:var(--bg2);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.ays-logobox img{width:100%;height:100%;object-fit:cover;display:block;}
.ays-logoph{color:var(--muted2);font-size:11px;text-align:center;padding:4px;}
.ays-filebtn{display:inline-flex;align-items:center;gap:8px;background:var(--surf2);border:1px solid var(--line);border-radius:10px;padding:10px 16px;font-size:13.5px;font-weight:600;color:var(--ink2);cursor:pointer;width:fit-content;transition:border-color .15s;}
.ays-filebtn:hover{border-color:var(--p);color:var(--ink);}
.ays-filebtn.ays-disabled{opacity:.5;cursor:not-allowed;}
.ays-filebtn input{display:none;}
.ays-thumbrow{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px;}
.ays-thumb{position:relative;width:80px;height:80px;border-radius:12px;overflow:hidden;border:1px solid var(--line);background:var(--bg2);}
.ays-thumb img{width:100%;height:100%;object-fit:cover;display:block;}
.ays-thumbx{position:absolute;top:3px;right:3px;width:20px;height:20px;border-radius:50%;background:rgba(10,10,15,.8);border:none;color:#fff;font-size:14px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;}
.ays-thumbx:hover:not(:disabled){background:var(--red);}
.ays-thumbx:disabled{opacity:.5;cursor:not-allowed;}
.ays-errorcard{padding:32px;}
@media(max-width:640px){
  .ays-grid{grid-template-columns:1fr;}
  .ays-card{padding:24px;}
  .ays-hero h1{font-size:26px;}
}
`;
