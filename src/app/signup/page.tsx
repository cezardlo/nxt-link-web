'use client';

// Create account — two clear steps:
//   1) Choose account type first: Buyer, or Vendor/Supplier (+ business type).
//   2) Enter email + password + accept the Terms/Privacy (click-wrap).
// Operator accounts are granted by the NXT Link team, never self-served.
// Account creation happens SERVER-SIDE via POST /api/auth/signup (one signup
// system, all lanes) so the terms acceptance is recorded fail-closed before
// the account exists. Sends the Supabase confirmation email; the account
// stays limited until the email is verified.
// Vendors from this ORGANIC lane are routed into /apply — the admin-reviewed
// application flow (invited vendors join via /join/<token> instead).

import { useState } from 'react';

type Role = 'client' | 'vendor';
type Step = 'type' | 'details';

// Vendor/supplier business types (maturity + kind) captured at signup and
// stored in user metadata for the vendor's fit profile. See MARKETPLACE_BLUEPRINT §4.
const VENDOR_TYPES = [
  'Manufacturer',
  'Distributor / Supplier',
  'Service provider',
  'System integrator',
  'Consultant',
  'Startup / emerging',
  'Other',
];

export default function SignupPage() {
  const [step, setStep] = useState<Step>('type');
  const [role, setRole] = useState<Role | null>(null);
  const [vendorType, setVendorType] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [sent, setSent] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const canContinue = role === 'client' || (role === 'vendor' && !!vendorType);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!role) return;
    if (!agree) {
      setErr('Please accept the Terms of Service and Privacy Policy. / Por favor acepta los Términos de Servicio y el Aviso de Privacidad.');
      return;
    }
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          role,
          vendor_type: role === 'vendor' ? vendorType : null,
          terms_accepted: agree,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!j.ok) { setErr(j.message || 'Could not create the account. Try again.'); setBusy(false); return; }
      if (j.session) {
        // Email confirmation disabled in project settings — go straight in.
        // Organic vendors go to the application/review flow, buyers to /buyer.
        await fetch('/api/auth/me');
        window.location.href = role === 'vendor' ? '/apply?from=signup' : '/buyer';
        return;
      }
      setSent(true);
    } catch {
      setErr('Could not create the account. Try again.');
    }
    setBusy(false);
  }

  const roleLabel = role === 'vendor' ? (vendorType ? `Vendor · ${vendorType}` : 'Vendor / Supplier') : 'Buyer';

  return (
    <div className="su">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <a className="su-brand" href="/"><b>NXT<i>{'//'}</i>LINK</b></a>

      {sent ? (
        <div className="su-card">
          <h1>Check your email</h1>
          <p className="su-sub">
            We sent a confirmation link to <b>{email}</b>. Click it to verify your
            account, and you&apos;ll be signed in automatically.
          </p>
          <p className="su-hint">
            {role === 'vendor'
              ? 'After you verify, the next step is a short vendor application — a human on our team reviews every one. / Después de verificar, el siguiente paso es una breve solicitud de proveedor — nuestro equipo revisa cada una.'
              : 'Until your email is verified, some actions stay limited.'}
          </p>
          <a className="su-link" href="/login">Already confirmed? Sign in</a>
        </div>
      ) : step === 'type' ? (
        <div className="su-card">
          <h1>Create your account</h1>
          <p className="su-sub">First, what brings you to NXT//LINK?</p>

          <div className="su-roles">
            <button type="button" className={'su-role' + (role === 'client' ? ' on' : '')} onClick={() => { setRole('client'); setVendorType(''); }}>
              <b>I&apos;m a Buyer</b>
              <span>Find, compare, and request quotes from verified industrial vendors.</span>
            </button>
            <button type="button" className={'su-role' + (role === 'vendor' ? ' on' : '')} onClick={() => setRole('vendor')}>
              <b>I&apos;m a Vendor / Supplier</b>
              <span>Build a storefront, publish products or services, and receive qualified leads.</span>
            </button>
          </div>

          {role === 'vendor' && (
            <div className="su-vtype">
              <div className="su-vlabel">What type of business are you?</div>
              <div className="su-chips">
                {VENDOR_TYPES.map((t) => (
                  <button type="button" key={t} className={'su-chip' + (vendorType === t ? ' on' : '')} onClick={() => setVendorType(t)}>{t}</button>
                ))}
              </div>
            </div>
          )}

          <button className="su-btn" type="button" disabled={!canContinue} onClick={() => setStep('details')}>
            Continue
          </button>

          <p className="su-hint">
            NXT Link operator? Team accounts are granted internally — <a href="/login">sign in here</a>.
          </p>
          <a className="su-link" href="/login">Already have an account? Sign in</a>
        </div>
      ) : (
        <div className="su-card">
          <button className="su-back" type="button" onClick={() => setStep('type')}>← Change account type</button>
          <h1>Create your account</h1>
          <p className="su-sub">Account type: <b>{roleLabel}</b></p>

          <form onSubmit={submit}>
            <input type="email" placeholder="Work email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" autoFocus />
            <div className="su-pwrow">
              <input type={showPw ? 'text' : 'password'} placeholder="Password (8+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
              <button type="button" className="su-pwtoggle" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? 'Hide password' : 'Show password'}>{showPw ? 'Hide' : 'Show'}</button>
            </div>
            <label className="su-agree">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} required />
              <span>
                I agree to the <a href="/terms" target="_blank" rel="noopener">Terms of Service</a> and <a href="/privacy" target="_blank" rel="noopener">Privacy Policy</a>.
                {' '}<i>Acepto los <a href="/terms" target="_blank" rel="noopener">Términos de Servicio</a> y el <a href="/privacy" target="_blank" rel="noopener">Aviso de Privacidad</a>.</i>
              </span>
            </label>
            {err && <div className="su-err">{err}</div>}
            <button className="su-btn" type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
          </form>

          <a className="su-link" href="/login">Already have an account? Sign in</a>
        </div>
      )}
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
.su{min-height:100vh;background:#0A0A0F;color:#F0F0F5;font-family:'Outfit',system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;padding:40px 20px;-webkit-font-smoothing:antialiased;}
.su *{box-sizing:border-box;}
.su-brand{color:#F0F0F5;text-decoration:none;margin-bottom:26px;}
.su-brand b{font-size:19px;}.su-brand i{color:#A78BFA;font-style:normal;}
.su-card{width:100%;max-width:460px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:20px;padding:30px;}
.su-card h1{font-size:23px;font-weight:800;letter-spacing:-.02em;}
.su-sub{color:#9A97AF;font-size:14px;line-height:1.6;margin:8px 0 18px;}
.su-sub b{color:#C4B5FD;}
.su-roles{display:flex;flex-direction:column;gap:10px;margin-bottom:16px;}
.su-role{font-family:inherit;text-align:left;background:#111118;border:1.5px solid rgba(255,255,255,.1);border-radius:13px;padding:16px;cursor:pointer;color:#F0F0F5;display:flex;flex-direction:column;gap:6px;}
.su-role:hover{border-color:rgba(124,92,252,.5);}
.su-role.on{border-color:#7C5CFC;background:rgba(124,92,252,.08);}
.su-role b{font-size:15px;}
.su-role span{font-size:12.5px;color:#9A97AF;line-height:1.45;}
.su-vtype{margin-bottom:18px;}
.su-vlabel{font-size:13px;font-weight:600;color:#C0C0D0;margin-bottom:10px;}
.su-chips{display:flex;flex-wrap:wrap;gap:8px;}
.su-chip{font-family:inherit;font-size:12.5px;font-weight:500;padding:8px 13px;border-radius:99px;border:1px solid rgba(255,255,255,.14);background:none;color:#C0C0D0;cursor:pointer;}
.su-chip:hover{border-color:rgba(124,92,252,.5);color:#C4B5FD;}
.su-chip.on{background:rgba(124,92,252,.15);border-color:#7C5CFC;color:#C4B5FD;}
.su-back{background:none;border:none;color:#A78BFA;font:inherit;font-size:13px;cursor:pointer;padding:0;margin-bottom:14px;}
.su-pwrow{position:relative;display:flex;}
.su-pwrow input{flex:1;padding-right:62px !important;width:100%;}
.su-pwtoggle{position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;color:#8080A0;font:600 12px 'Outfit',sans-serif;cursor:pointer;padding:6px;}
.su-pwtoggle:hover{color:#C4B5FD;}
.su-card form{display:flex;flex-direction:column;gap:11px;}
.su-card input{font-family:inherit;font-size:14.5px;padding:12px 14px;border-radius:11px;border:1px solid rgba(255,255,255,.1);background:#0A0A0F;color:#F0F0F5;outline:none;}
.su-card input:focus{border-color:#7C5CFC;}
.su-btn{font-family:inherit;font-size:15px;font-weight:700;padding:13px;border-radius:11px;border:none;background:#7C5CFC;color:#fff;cursor:pointer;width:100%;margin-top:4px;}
.su-btn:hover{background:#6344DF;}.su-btn:disabled{opacity:.45;cursor:not-allowed;}
.su-err{color:#FCA5A5;font-size:13px;}
.su-agree{display:flex;align-items:flex-start;gap:10px;cursor:pointer;margin:2px 0 0;}
.su-agree input{width:16px;height:16px;margin-top:2px;flex-shrink:0;accent-color:#7C5CFC;cursor:pointer;}
.su-agree input:focus-visible{outline:2px solid #7C5CFC;outline-offset:2px;}
.su-agree span{color:#9A97AF;font-size:12px;line-height:1.55;}
.su-agree span a{color:#C4B5FD;}
.su-agree span i{color:#63607A;font-style:normal;}
.su-hint{color:#63607A;font-size:12.5px;line-height:1.6;margin:16px 0 0;}
.su-hint a{color:#9A97AF;}
.su-link{display:block;margin-top:12px;color:#A78BFA;font-size:13.5px;text-decoration:none;}
`;
