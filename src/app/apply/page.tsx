'use client';

import { useRef, useState } from 'react';

// Public, low-friction vendor intake form. No login required to submit.
// Posts multipart/form-data (text fields + optional logo + up to 3 product
// images) to /api/apply/submit. This is a brand-new, standalone flow —
// unrelated to the older /vendor-signup, /vendor-login, /vendor/portal
// system (which uses a different table, vendor_profiles).

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAX_PRODUCT_IMAGES = 3;

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
  const [problemSolved, setProblemSolved] = useState('');
  const [targetCustomer, setTargetCustomer] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [priceOther, setPriceOther] = useState('');

  const [logo, setLogo] = useState<ImageItem | null>(null);
  const [images, setImages] = useState<ImageItem[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);

  const [result, setResult] = useState<{ publicRef: string; degraded: boolean } | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const imagesInputRef = useRef<HTMLInputElement>(null);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailTouched(true);
    setError('');

    if (!companyName.trim()) { setError('Company name is required.'); return; }
    if (!email.trim() || !EMAIL_RE.test(email.trim())) { setError('A valid email is required.'); return; }
    if (!category) { setError('Please choose a category.'); return; }
    if (!problemSolved.trim()) { setError('Please tell us what problem you solve.'); return; }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('company_name', companyName.trim());
      fd.append('contact_name', contactName.trim());
      fd.append('email', email.trim());
      fd.append('phone', phone.trim());
      fd.append('category', category);
      fd.append('problem_solved', problemSolved.trim());
      fd.append('target_customer', targetCustomer.trim());
      fd.append('price_range', resolvedPriceRange());
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
    <div className="ap-root">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <TopNav />

      <main className="ap-main">
        {result ? (
          <ConfirmationCard publicRef={result.publicRef} />
        ) : (
          <>
            <header className="ap-hero">
              <p className="ap-eyebrow">Vendor application</p>
              <h1>
                Tell us what you <em>solve</em>.
              </h1>
              <p className="ap-sub">
                A quick application — takes about two minutes. A human on our team reviews every
                submission personally.
              </p>
            </header>

            <form className="ap-card" onSubmit={handleSubmit} noValidate>
              <div className="ap-grid">
                <Field label="Company name" required>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Acme Logistics Systems"
                    required
                  />
                </Field>

                <Field label="Contact name">
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Jane Rivera"
                  />
                </Field>

                <Field label="Email" required error={emailTouched && !emailValid ? 'Enter a valid email address.' : undefined}>
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

                <Field label="Phone">
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
              </div>

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
                <textarea
                  value={targetCustomer}
                  onChange={(e) => setTargetCustomer(e.target.value)}
                  placeholder="Your ideal customer — industry, company size, region, etc."
                  rows={2}
                />
              </Field>

              <div className="ap-grid">
                <Field label="Logo" hint="Optional">
                  <label className="ap-filebtn">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleLogoChange}
                    />
                    Choose logo
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
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      multiple
                      disabled={images.length >= MAX_PRODUCT_IMAGES}
                      onChange={handleImagesChange}
                    />
                    Choose images
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

              {error && <p className="ap-error">{error}</p>}

              <button type="submit" className="ap-submit" disabled={submitting}>
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
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`ap-field ${full ? 'ap-field-full' : ''}`}>
      <label>
        {label}
        {required && <span className="ap-req">*</span>}
        {hint && <span className="ap-hint">{hint}</span>}
      </label>
      {children}
      {error && <p className="ap-fielderror">{error}</p>}
    </div>
  );
}

function TopNav() {
  return (
    <nav className="ap-nav">
      <a className="ap-brand" href="/">
        <span className="ap-mk">N</span>
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
    <div className="ap-card ap-confirm">
      <div className="ap-check">✓</div>
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
        <a className="ap-upsell-btn" href="/apply/login">
          Create account / sign in
        </a>
      </div>

      <a className="ap-back" href="/">
        ← Back to NXT//LINK
      </a>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap');
.ap-root{--bg:#0A0A0F;--bg2:#111118;--surf:rgba(255,255,255,.04);--surf2:rgba(255,255,255,.07);--ink:#F0F0F5;--ink2:#C0C0D0;--muted:#8080A0;--muted2:#505068;--line:rgba(255,255,255,.08);--p:#7C5CFC;--p2:#A78BFA;--p3:#C4B5FD;--pbg:rgba(124,92,252,.12);--pd:#6344DF;--green:#34D399;--red:#F87171;--sans:'Outfit',system-ui,sans-serif;--serif:'Instrument Serif',Georgia,serif;
  min-height:100vh;background:var(--bg);color:var(--ink);font-family:var(--sans);
}
.ap-root *{box-sizing:border-box;}
.ap-nav{display:flex;align-items:center;justify-content:space-between;padding:20px 28px;max-width:920px;margin:0 auto;}
.ap-brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--ink);}
.ap-mk{width:30px;height:32px;border-radius:9px;background:linear-gradient(135deg,var(--p),var(--pd));display:flex;align-items:center;justify-content:center;font-family:var(--serif);font-style:italic;font-size:19px;color:#fff;flex-shrink:0;}
.ap-brand b{font-weight:700;font-size:17px;letter-spacing:-.01em;}
.ap-brand i{color:var(--p2);font-style:normal;}
.ap-signin{color:var(--muted);font-size:13.5px;text-decoration:none;font-weight:500;}
.ap-signin:hover{color:var(--ink2);}
.ap-main{max-width:720px;margin:0 auto;padding:24px 20px 80px;}
.ap-hero{text-align:center;padding:36px 8px 30px;}
.ap-eyebrow{color:var(--p3);font-size:12.5px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;margin:0 0 14px;}
.ap-hero h1{font-size:38px;font-weight:700;letter-spacing:-.02em;line-height:1.15;margin:0 0 14px;}
.ap-hero h1 em{font-family:var(--serif);font-style:italic;font-weight:400;color:var(--p3);}
.ap-sub{color:var(--ink2);font-size:16px;line-height:1.6;max-width:480px;margin:0 auto;}
.ap-card{background:var(--surf);border:1px solid var(--line);border-radius:20px;backdrop-filter:blur(12px);box-shadow:0 24px 80px rgba(0,0,0,.4);padding:32px;}
.ap-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px;}
.ap-field{display:flex;flex-direction:column;gap:8px;}
.ap-field-full{grid-column:1/-1;}
.ap-field label{font-size:13px;font-weight:600;color:var(--ink2);display:flex;align-items:center;gap:6px;}
.ap-req{color:var(--p2);}
.ap-hint{color:var(--muted);font-weight:400;font-size:12px;}
.ap-field input[type="text"],.ap-field input[type="email"],.ap-field input[type="tel"],.ap-field select,.ap-field textarea{
  width:100%;background:var(--bg);border:1px solid var(--line);border-radius:11px;padding:12px 14px;color:var(--ink);font-size:14.5px;font-family:var(--sans);outline:none;transition:border-color .15s,box-shadow .15s;
}
.ap-field textarea{resize:vertical;line-height:1.5;}
.ap-field input:focus,.ap-field select:focus,.ap-field textarea:focus{border-color:var(--p);box-shadow:0 0 0 3px var(--pbg);}
.ap-field input.ap-invalid{border-color:var(--red);}
.ap-mt{margin-top:8px;}
.ap-fielderror{color:var(--red);font-size:12.5px;margin:0;}
.ap-error{background:rgba(248,113,113,.12);border:1px solid rgba(248,113,113,.3);color:var(--red);border-radius:11px;padding:12px 14px;font-size:14px;margin:4px 0 18px;}
.ap-filebtn{display:inline-flex;align-items:center;gap:8px;background:var(--surf2);border:1px solid var(--line);border-radius:10px;padding:10px 16px;font-size:13.5px;font-weight:600;color:var(--ink2);cursor:pointer;width:fit-content;transition:border-color .15s;}
.ap-filebtn:hover{border-color:var(--p);color:var(--ink);}
.ap-filebtn.ap-disabled{opacity:.5;cursor:not-allowed;}
.ap-filebtn input{display:none;}
.ap-thumbrow{display:flex;flex-wrap:wrap;gap:10px;margin-top:10px;}
.ap-thumb{position:relative;width:64px;height:64px;border-radius:10px;overflow:hidden;border:1px solid var(--line);background:var(--bg2);}
.ap-thumb img{width:100%;height:100%;object-fit:cover;display:block;}
.ap-thumbx{position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:50%;background:rgba(10,10,15,.8);border:none;color:#fff;font-size:13px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;}
.ap-thumbx:hover{background:var(--red);}
.ap-submit{width:100%;padding:15px;background:var(--p);color:#fff;border:none;border-radius:12px;font-size:15.5px;font-weight:700;font-family:var(--sans);cursor:pointer;box-shadow:0 8px 28px rgba(124,92,252,.35);transition:background .15s,transform .1s;margin-top:4px;}
.ap-submit:hover:not(:disabled){background:var(--pd);}
.ap-submit:disabled{opacity:.6;cursor:wait;}
.ap-signin-hint{text-align:center;color:var(--muted);font-size:13.5px;margin:16px 0 0;}
.ap-signin-hint a{color:var(--p3);text-decoration:none;font-weight:600;}
.ap-signin-hint a:hover{text-decoration:underline;}
.ap-confirm{text-align:center;padding:44px 32px;}
.ap-check{width:60px;height:60px;border-radius:50%;background:rgba(52,211,153,.12);border:1px solid rgba(52,211,153,.3);color:var(--green);font-size:26px;display:flex;align-items:center;justify-content:center;margin:0 auto 22px;}
.ap-confirm h2{font-size:26px;font-weight:700;margin:0 0 12px;letter-spacing:-.01em;}
.ap-refline{color:var(--ink2);font-size:16px;margin:0 0 10px;}
.ap-refline b{color:var(--p3);font-family:var(--serif);font-style:italic;font-size:19px;font-weight:400;}
.ap-confirmsub{color:var(--muted);font-size:14.5px;line-height:1.6;max-width:420px;margin:0 auto 28px;}
.ap-upsell{background:var(--surf2);border:1px solid var(--line);border-radius:16px;padding:22px;margin-bottom:26px;}
.ap-upsell-title{font-size:15px;font-weight:600;color:var(--ink);margin:0 0 6px;}
.ap-upsell-sub{font-size:13.5px;color:var(--muted);margin:0 0 16px;}
.ap-upsell-btn{display:inline-block;background:var(--surf);border:1px solid var(--line);color:var(--ink);padding:10px 20px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;transition:border-color .15s;}
.ap-upsell-btn:hover{border-color:var(--p);color:var(--p3);}
.ap-back{color:var(--muted);font-size:13.5px;text-decoration:none;}
.ap-back:hover{color:var(--ink2);}
@media(max-width:640px){
  .ap-grid{grid-template-columns:1fr;}
  .ap-hero h1{font-size:30px;}
  .ap-card{padding:24px;}
}
`;
