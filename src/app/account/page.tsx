'use client';

// Account settings: see who you are, change password, change email, sign out,
// and (Danger zone) permanently delete your own account. Works for every role;
// links back to the right dashboard. Bilingual EN/ES via the shared useLang.

import { useEffect, useState } from 'react';
import { IBM_Plex_Sans } from 'next/font/google';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser-auth';
import { clearLocalCart } from '@/components/cart/useCart';
import { useLang, type Lang } from '@/components/LanguageToggle';
import LanguageToggle from '@/components/LanguageToggle';
import { isConfirmationValid } from '@/lib/account/deletion-rules';

// Design System v1.0 reskin (2026-07-23): light warm-white + violet, matching
// the rest of the signed-in experience (/buyer, /buyer/profile, /cart).
// Visual/CSS only — every handler, the deletion-confirmation logic, and the
// bilingual copy above are unchanged. The Danger zone keeps red accents so it
// still reads as a destructive-action area against the light background.
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans-account',
  display: 'swap',
});

const STR: Record<Lang, Record<string, string>> = {
  en: {
    account: 'Account', dashboard: 'My dashboard',
    loading: 'Loading…',
    signedOutPre: 'Sign in to manage your account —', signIn: 'go to sign in',
    title: 'Account settings',
    who: 'Who you are', email: 'Email', verified: 'verified', notVerified: 'not verified',
    accountType: 'Account type', buyer: 'Buyer', vendor: 'Vendor',
    changePw: 'Change password', newPw: 'New password (8+ characters)', repeatPw: 'Repeat new password',
    pwUpdated: 'Password updated.', pwShort: 'Password must be at least 8 characters.',
    pwMismatch: 'Passwords do not match.', pwFail: 'Could not update the password.',
    updatePw: 'Update password', saving: 'Saving…',
    changeEmail: 'Change email',
    emailHint: 'We’ll send a confirmation link to the new address; the change applies when you click it.',
    newEmail: 'New email address', changeEmailBtn: 'Change email', sending: 'Sending…',
    emailSentPre: 'Confirmation sent to', emailSentPost: '— the change applies once you click the link.',
    emailFail: 'Could not start the email change.',
    session: 'Session', signOut: 'Sign out',
    dangerZone: 'Danger zone', deleteTitle: 'Delete your account',
    deleteBody: 'This permanently deletes your profile, listings, saved items, and cart. For legal and accounting reasons we keep records of past deals, invoices, and agreed terms — with your name and contact details removed. Text you typed inside messages or requests may remain. This can’t be undone.',
    deleteBtn: 'Delete my account', cancel: 'Cancel',
    confirmPhrasePrompt: 'Type DELETE to confirm',
    confirmPwPrompt: 'Your current password',
    confirmDeleteBtn: 'Permanently delete my account', deleting: 'Deleting…',
    genericErr: 'Something went wrong. Please try again.',
  },
  es: {
    account: 'Cuenta', dashboard: 'Mi panel',
    loading: 'Cargando…',
    signedOutPre: 'Inicia sesión para administrar tu cuenta —', signIn: 'ir a iniciar sesión',
    title: 'Configuración de la cuenta',
    who: 'Quién eres', email: 'Correo', verified: 'verificado', notVerified: 'sin verificar',
    accountType: 'Tipo de cuenta', buyer: 'Comprador', vendor: 'Proveedor',
    changePw: 'Cambiar contraseña', newPw: 'Nueva contraseña (8+ caracteres)', repeatPw: 'Repite la nueva contraseña',
    pwUpdated: 'Contraseña actualizada.', pwShort: 'La contraseña debe tener al menos 8 caracteres.',
    pwMismatch: 'Las contraseñas no coinciden.', pwFail: 'No se pudo actualizar la contraseña.',
    updatePw: 'Actualizar contraseña', saving: 'Guardando…',
    changeEmail: 'Cambiar correo',
    emailHint: 'Enviaremos un enlace de confirmación al nuevo correo; el cambio se aplica al hacer clic en él.',
    newEmail: 'Nuevo correo electrónico', changeEmailBtn: 'Cambiar correo', sending: 'Enviando…',
    emailSentPre: 'Confirmación enviada a', emailSentPost: '— el cambio se aplica al hacer clic en el enlace.',
    emailFail: 'No se pudo iniciar el cambio de correo.',
    session: 'Sesión', signOut: 'Cerrar sesión',
    dangerZone: 'Zona de peligro', deleteTitle: 'Eliminar tu cuenta',
    deleteBody: 'Esto elimina permanentemente tu perfil, tus anuncios, tus elementos guardados y tu carrito. Por motivos legales y contables conservamos registros de tratos anteriores, facturas y términos acordados, con tu nombre y datos de contacto eliminados. El texto que hayas escrito dentro de mensajes o solicitudes puede permanecer. Esta acción no se puede deshacer.',
    deleteBtn: 'Eliminar mi cuenta', cancel: 'Cancelar',
    confirmPhrasePrompt: 'Escribe ELIMINAR para confirmar',
    confirmPwPrompt: 'Tu contraseña actual',
    confirmDeleteBtn: 'Eliminar mi cuenta permanentemente', deleting: 'Eliminando…',
    genericErr: 'Algo salió mal. Inténtalo de nuevo.',
  },
};

export default function AccountPage() {
  const [lang, setLang] = useLang();
  const t = STR[lang];

  const [checking, setChecking] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('client');
  const [verified, setVerified] = useState(false);
  const [hasPassword, setHasPassword] = useState(true);

  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [pwOk, setPwOk] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [emBusy, setEmBusy] = useState(false);
  const [emMsg, setEmMsg] = useState('');
  const [emOk, setEmOk] = useState(false);

  // Danger zone
  const [dangerOpen, setDangerOpen] = useState(false);
  const [delConfirm, setDelConfirm] = useState('');
  const [delPw, setDelPw] = useState('');
  const [delBusy, setDelBusy] = useState(false);
  const [delErr, setDelErr] = useState('');

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((me) => {
      if (me?.signed_in) {
        setSignedIn(true);
        setEmail(me.email || '');
        setRole(me.role || 'client');
        setVerified(Boolean(me.email_verified));
        setHasPassword(me.has_password !== false);
      }
      setChecking(false);
    }).catch(() => setChecking(false));
  }, []);

  const isAdmin = role === 'admin' || role === 'super_admin';
  const dashboard = isAdmin ? '/admin' : role === 'vendor' ? '/vendor/listings' : '/buyer';
  const roleLabel = role === 'client' ? t.buyer : role === 'vendor' ? t.vendor : role;

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pw1.length < 8) { setPwOk(false); setPwMsg(t.pwShort); return; }
    if (pw1 !== pw2) { setPwOk(false); setPwMsg(t.pwMismatch); return; }
    setPwBusy(true); setPwMsg('');
    try {
      const sb = createBrowserSupabaseClient();
      const { error } = await sb.auth.updateUser({ password: pw1 });
      setPwOk(!error); setPwMsg(error ? error.message : t.pwUpdated);
      if (!error) { setPw1(''); setPw2(''); }
    } catch { setPwOk(false); setPwMsg(t.pwFail); }
    setPwBusy(false);
  }

  async function changeEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setEmBusy(true); setEmMsg('');
    try {
      const sb = createBrowserSupabaseClient();
      const { error } = await sb.auth.updateUser(
        { email: newEmail.trim() },
        { emailRedirectTo: `${window.location.origin}/auth/callback?next=/account` },
      );
      setEmOk(!error);
      setEmMsg(error ? error.message : `${t.emailSentPre} ${newEmail.trim()} ${t.emailSentPost}`);
      if (!error) setNewEmail('');
    } catch { setEmOk(false); setEmMsg(t.emailFail); }
    setEmBusy(false);
  }

  async function signOut() {
    const sb = createBrowserSupabaseClient();
    await sb.auth.signOut();
    clearLocalCart();
    window.location.href = '/login';
  }

  const canDelete = isConfirmationValid(delConfirm) && (!hasPassword || delPw.length > 0);

  async function deleteAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!canDelete || delBusy) return;
    setDelBusy(true); setDelErr('');
    try {
      const r = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: delConfirm, password: hasPassword ? delPw : undefined, lang }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok && data?.ok) {
        try { const sb = createBrowserSupabaseClient(); await sb.auth.signOut(); } catch { /* already gone */ }
        clearLocalCart();
        window.location.href = data.redirect || '/?deleted=1';
        return;
      }
      setDelErr(data?.message || t.genericErr);
    } catch { setDelErr(t.genericErr); }
    setDelBusy(false);
  }

  return (
    <div className={`ac ${ibmPlexSans.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <nav className="ac-nav">
        <a className="ac-brand" href="/"><b>NXT<i>{'//'}</i>LINK</b><span>{t.account}</span></a>
        <div className="ac-navr">
          {signedIn && <a className="ac-link" href={dashboard}>{t.dashboard}</a>}
          <LanguageToggle lang={lang} onChange={setLang} variant="light" />
        </div>
      </nav>

      <main className="ac-wrap">
        {checking ? (
          <div className="ac-empty">{t.loading}</div>
        ) : !signedIn ? (
          <div className="ac-empty">{t.signedOutPre} <a href="/login">{t.signIn}</a></div>
        ) : (
          <>
            <h1>{t.title}</h1>

            <section className="ac-card">
              <div className="ac-lbl">{t.who}</div>
              <div className="ac-row"><span>{t.email}</span><b>{email}</b>{verified ? <em className="ok">{t.verified}</em> : <em className="warn">{t.notVerified}</em>}</div>
              <div className="ac-row"><span>{t.accountType}</span><b className="ac-role">{roleLabel}</b></div>
            </section>

            <section className="ac-card">
              <div className="ac-lbl">{t.changePw}</div>
              <form onSubmit={changePassword}>
                <input type="password" placeholder={t.newPw} value={pw1} onChange={(e) => setPw1(e.target.value)} minLength={8} required autoComplete="new-password" />
                <input type="password" placeholder={t.repeatPw} value={pw2} onChange={(e) => setPw2(e.target.value)} minLength={8} required autoComplete="new-password" />
                {pwMsg && <div className={pwOk ? 'ac-ok' : 'ac-err'}>{pwMsg}</div>}
                <button className="ac-btn" type="submit" disabled={pwBusy}>{pwBusy ? t.saving : t.updatePw}</button>
              </form>
            </section>

            <section className="ac-card">
              <div className="ac-lbl">{t.changeEmail}</div>
              <p className="ac-hint">{t.emailHint}</p>
              <form onSubmit={changeEmail}>
                <input type="email" placeholder={t.newEmail} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required autoComplete="email" />
                {emMsg && <div className={emOk ? 'ac-ok' : 'ac-err'}>{emMsg}</div>}
                <button className="ac-btn" type="submit" disabled={emBusy}>{emBusy ? t.sending : t.changeEmailBtn}</button>
              </form>
            </section>

            <section className="ac-card">
              <div className="ac-lbl">{t.session}</div>
              <button className="ac-out" onClick={signOut}>{t.signOut}</button>
            </section>

            {/* Danger zone — only for self-serve accounts; admins are blocked
                server-side too. */}
            {!isAdmin && (
              <section className="ac-danger">
                <div className="ac-lbl ac-dlbl">{t.dangerZone}</div>
                <h2 className="ac-dh">{t.deleteTitle}</h2>
                <p className="ac-dbody">{t.deleteBody}</p>
                {!dangerOpen ? (
                  <button className="ac-del" onClick={() => { setDangerOpen(true); setDelErr(''); }}>{t.deleteBtn}</button>
                ) : (
                  <form className="ac-delform" onSubmit={deleteAccount}>
                    <input
                      className="ac-dinput"
                      type="text"
                      placeholder={t.confirmPhrasePrompt}
                      value={delConfirm}
                      onChange={(e) => setDelConfirm(e.target.value)}
                      autoComplete="off"
                      aria-label={t.confirmPhrasePrompt}
                    />
                    {hasPassword && (
                      <input
                        className="ac-dinput"
                        type="password"
                        placeholder={t.confirmPwPrompt}
                        value={delPw}
                        onChange={(e) => setDelPw(e.target.value)}
                        autoComplete="current-password"
                        aria-label={t.confirmPwPrompt}
                      />
                    )}
                    {delErr && <div className="ac-err">{delErr}</div>}
                    <div className="ac-delrow">
                      <button type="button" className="ac-cancel" onClick={() => { setDangerOpen(false); setDelConfirm(''); setDelPw(''); setDelErr(''); }}>{t.cancel}</button>
                      <button type="submit" className="ac-delgo" disabled={!canDelete || delBusy}>{delBusy ? t.deleting : t.confirmDeleteBtn}</button>
                    </div>
                  </form>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

const CSS = `
.ac{min-height:100vh;background:var(--spec-warm-white,#F8F7FB);color:var(--spec-ink,#141320);font-family:var(--font-ibm-plex-sans-account),'IBM Plex Sans',system-ui,-apple-system,'Segoe UI',sans-serif;-webkit-font-smoothing:antialiased;}
.ac *{box-sizing:border-box;}
.ac a:focus-visible,.ac button:focus-visible,.ac input:focus-visible{outline:2px solid var(--spec-violet,#6C5CE0);outline-offset:2px;}
.ac-nav{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;row-gap:8px;padding:14px 26px;border-bottom:1px solid var(--spec-border,#E2DFEC);position:sticky;top:0;background:rgba(248,247,251,.92);backdrop-filter:blur(20px);z-index:20;}
.ac-brand{display:flex;align-items:baseline;gap:10px;color:var(--spec-ink,#141320);text-decoration:none;}
.ac-brand b{font-family:var(--font-space-grotesk),'Space Grotesk',sans-serif;font-size:17px;font-weight:700;letter-spacing:-.01em;}
.ac-brand i{color:var(--spec-violet,#6C5CE0);font-style:normal;}
.ac-brand span{color:var(--spec-text-2nd,#615F72);font-size:13px;}
.ac-navr{display:flex;align-items:center;gap:14px;}
.ac-link{color:var(--spec-violet-deep,#4A3DB0);font-size:13.5px;font-weight:600;text-decoration:none;}
.ac-link:hover{color:var(--spec-violet,#6C5CE0);}
.ac-wrap{max-width:560px;margin:0 auto;padding:36px 20px 100px;}
.ac-wrap h1{font-family:var(--font-space-grotesk),'Space Grotesk',sans-serif;font-size:26px;font-weight:700;letter-spacing:-.01em;margin-bottom:22px;}
.ac-empty{text-align:center;color:var(--spec-text-2nd,#615F72);padding:70px 0;}
.ac-empty a{color:var(--spec-violet-deep,#4A3DB0);}
.ac-card{background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:16px;padding:22px;margin-bottom:16px;}
.ac-lbl{font-size:12px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--spec-violet-deep,#4A3DB0);margin-bottom:14px;}
.ac-row{display:flex;align-items:center;gap:12px;font-size:14px;margin-bottom:10px;flex-wrap:wrap;}
.ac-row span{color:var(--spec-text-2nd,#615F72);min-width:110px;font-size:13px;}
.ac-role{text-transform:capitalize;}
.ac-row em{font-style:normal;font-size:11px;font-weight:700;padding:3px 9px;border-radius:99px;}
.ac-row em.ok{background:#E9F7F0;color:#1F7A54;}
.ac-row em.warn{background:#FBF3E7;color:#8A5D14;}
.ac-hint{color:var(--spec-text-2nd,#615F72);font-size:13px;line-height:1.5;margin:0 0 12px;}
.ac-card form{display:flex;flex-direction:column;gap:10px;}
.ac-card input{font-family:inherit;font-size:14.5px;padding:12px 14px;border-radius:12px;border:1px solid var(--spec-border,#E2DFEC);background:var(--spec-warm-white,#F8F7FB);color:var(--spec-ink,#141320);outline:none;}
.ac-card input::placeholder{color:#8A87A0;}
.ac-card input:focus{border-color:var(--spec-violet,#6C5CE0);background:#fff;box-shadow:0 0 0 3px rgba(108,92,224,.12);}
.ac-btn{font-family:inherit;font-size:14px;font-weight:700;padding:12px;border-radius:var(--spec-radius-btn,10px);border:none;background:var(--spec-violet,#6C5CE0);color:#fff;cursor:pointer;align-self:flex-start;padding-left:20px;padding-right:20px;transition:background var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.ac-btn:hover{background:var(--spec-violet-deep,#4A3DB0);}
.ac-btn:disabled{opacity:.6;cursor:wait;}
.ac-ok{color:var(--spec-success,#2F9E6A);font-size:13px;}
.ac-err{color:var(--spec-error,#CE4B43);font-size:13px;}
.ac-out{font-family:inherit;font-size:14px;font-weight:600;padding:11px 18px;border-radius:10px;border:1px solid var(--spec-border,#E2DFEC);background:#fff;color:var(--spec-ink,#141320);cursor:pointer;transition:background var(--spec-duration-fast,150ms) var(--spec-ease,ease),border-color var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.ac-out:hover{background:var(--spec-warm-white,#F8F7FB);border-color:#C7C2DE;}
/* Danger zone — visually separated, red-tinted (still clearly destructive on the light background) */
.ac-danger{background:#FDF2F2;border:1px solid rgba(206,75,67,.35);border-radius:16px;padding:22px;margin-top:34px;}
.ac-dlbl{color:var(--spec-error,#CE4B43);}
.ac-dh{font-family:var(--font-space-grotesk),'Space Grotesk',sans-serif;font-size:17px;font-weight:700;margin:0 0 8px;color:var(--spec-error,#CE4B43);}
.ac-dbody{color:var(--spec-text-2nd,#615F72);font-size:13.5px;line-height:1.55;margin:0 0 16px;}
.ac-del{font-family:inherit;font-size:14px;font-weight:700;padding:11px 18px;border-radius:10px;border:1px solid rgba(206,75,67,.5);background:rgba(206,75,67,.1);color:var(--spec-error,#CE4B43);cursor:pointer;transition:background var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.ac-del:hover{background:rgba(206,75,67,.18);}
.ac-delform{display:flex;flex-direction:column;gap:10px;}
.ac-dinput{font-family:inherit;font-size:14.5px;padding:12px 14px;border-radius:12px;border:1px solid rgba(206,75,67,.4);background:#fff;color:var(--spec-ink,#141320);outline:none;}
.ac-dinput::placeholder{color:#B08484;}
.ac-dinput:focus{border-color:var(--spec-error,#CE4B43);box-shadow:0 0 0 3px rgba(206,75,67,.12);}
.ac-delrow{display:flex;gap:10px;flex-wrap:wrap;}
.ac-cancel{font-family:inherit;font-size:14px;font-weight:600;padding:11px 18px;border-radius:10px;border:1px solid var(--spec-border,#E2DFEC);background:#fff;color:var(--spec-text-2nd,#615F72);cursor:pointer;}
.ac-cancel:hover{background:var(--spec-warm-white,#F8F7FB);color:var(--spec-ink,#141320);}
.ac-delgo{font-family:inherit;font-size:14px;font-weight:700;padding:11px 18px;border-radius:10px;border:none;background:var(--spec-error,#CE4B43);color:#fff;cursor:pointer;}
.ac-delgo:hover{filter:brightness(.88);}
.ac-delgo:disabled{opacity:.45;cursor:not-allowed;filter:none;}
`;
