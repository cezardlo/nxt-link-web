'use client';

// Vendor setup dashboard — the guided path from empty account to buyer-ready.
// Uses THE one shared ProfileStrengthMeter (same math and checklist as the
// portal — this page previously had its own 7-step meter that disagreed;
// engineering process §4: one meter, one truth). Checks REAL state via the
// vendor APIs and deep-links each task. Bilingual EN/ES.

import { useEffect, useState } from 'react';
import { IBM_Plex_Sans } from 'next/font/google';
import LanguageToggle, { useLang } from '@/components/LanguageToggle';
import ProfileStrengthMeter, { computeProfileStrength, StrengthInput } from '@/components/ProfileStrengthMeter';

// Design System v1.0 reskin (Premium Polish Phase 2, 2026-07-23): visual/CSS
// only — every handler and state above is unchanged.
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans-vstart',
  display: 'swap',
});

const T = {
  en: {
    doc: 'Get set up — NXT//LINK',
    brand_sub: 'Get set up',
    skip: 'Skip to listings',
    title: 'Set up your storefront',
    sub: 'A few quick steps from empty account to your first buyers — each one unlocks something real.',
    loading: 'Loading…',
    signin: 'Sign in first —',
    signin_link: 'go to sign in',
    terms_t: 'Before you publish: accept the NXT//LINK vendor terms',
    terms_b: 'Commission, protected period, no going around the platform. One tap in your profile.',
    terms_cta: 'Review terms →',
    done: 'Storefront ready. Watch your leads inbox — quote requests and open buyer needs land there, and every deal runs through NXT//LINK.',
    done_link: 'leads inbox',
  },
  es: {
    doc: 'Configura tu tienda — NXT//LINK',
    brand_sub: 'Configura tu tienda',
    skip: 'Ir a publicaciones',
    title: 'Configura tu tienda',
    sub: 'Unos pasos rápidos de cuenta vacía a tus primeros compradores — cada uno desbloquea algo real.',
    loading: 'Cargando…',
    signin: 'Primero inicia sesión —',
    signin_link: 'ir a iniciar sesión',
    terms_t: 'Antes de publicar: acepta los términos de proveedor de NXT//LINK',
    terms_b: 'Comisión, periodo protegido, sin saltarse la plataforma. Un toque en tu perfil.',
    terms_cta: 'Revisar términos →',
    done: 'Tienda lista. Vigila tu bandeja de prospectos — ahí llegan las solicitudes de cotización y las necesidades abiertas de compradores, y cada trato pasa por NXT//LINK.',
    done_link: 'bandeja de prospectos',
  },
} as const;

export default function VendorStartPage() {
  const [lang, switchLang] = useLang('en');
  const [checking, setChecking] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [input, setInput] = useState<StrengthInput | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(true);
  const t = T[lang];

  useEffect(() => { document.title = t.doc; }, [t.doc]);

  useEffect(() => {
    (async () => {
      const prof = await fetch('/api/vendor/profile').then((r) => (r.status === 401 ? null : r.json())).catch(() => null);
      if (!prof) { setSignedIn(false); setChecking(false); return; }
      setSignedIn(true);
      const [ag, listings, ce, ga] = await Promise.all([
        fetch('/api/vendor/agreement').then((r) => r.json()).catch(() => null),
        fetch('/api/vendor/listings').then((r) => r.json()).catch(() => null),
        fetch('/api/vendor/certifications').then((r) => r.json()).catch(() => null),
        fetch('/api/vendor/gallery').then((r) => r.json()).catch(() => null),
      ]);
      const v = prof.vendor || {};
      const listingCount = (listings?.products?.length || 0) + (listings?.services?.length || 0);
      setInput({
        hasLogo: Boolean(prof.logo_url),
        taglineLen: String(v.tagline || '').trim().length,
        descriptionLen: String(v.description || '').trim().length,
        listingCount,
        hasWebsite: Boolean(String(v.website || '').trim()),
        hasPhone: Boolean(String(v.phone || '').trim()),
        hasCity: Boolean(String(v.city || '').trim()),
        proofCount: (ce?.certifications?.length || 0) + (ga?.photos?.length || 0) + (prof.case_studies?.length || 0),
      });
      setTermsAccepted(Boolean(ag?.accepted));
      setChecking(false);
    })();
  }, []);

  const pct = input ? computeProfileStrength(input).pct : 0;

  return (
    <div className={`vw ${ibmPlexSans.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <nav className="vw-nav">
        <a className="vw-brand" href="/"><b>NXT<i>{'//'}</i>LINK</b><span>{t.brand_sub}</span></a>
        <div className="vw-navr">
          <a className="vw-link" href="/vendor/listings">{t.skip}</a>
          <LanguageToggle lang={lang} onChange={switchLang} variant="light" />
        </div>
      </nav>
      <main className="vw-wrap">
        {checking ? <div className="vw-empty" role="status">{t.loading}</div>
          : !signedIn ? <div className="vw-empty">{t.signin} <a href="/login">{t.signin_link}</a></div>
          : input && (
            <>
              <h1>{t.title}</h1>
              <p className="vw-sub">{t.sub}</p>

              <ProfileStrengthMeter
                input={input}
                lang={lang}
                links={{ identity: '/vendor/portal', details: '/vendor/portal', proof: '/vendor/portal', listing: '/vendor/listings' }}
              />

              {!termsAccepted && (
                <div className="vw-terms">
                  <b>{t.terms_t}</b>
                  <p>{t.terms_b}</p>
                  <a href="/vendor/portal">{t.terms_cta}</a>
                </div>
              )}

              {pct === 100 && (
                <div className="vw-done">
                  {t.done.split(t.done_link)[0]}
                  <a href="/vendor/leads">{t.done_link}</a>
                  {t.done.split(t.done_link)[1] || ''}
                </div>
              )}
            </>
          )}
      </main>
    </div>
  );
}

const CSS = `
.vw{min-height:100vh;background:var(--spec-warm-white,#F8F7FB);color:var(--spec-ink,#141320);font-family:var(--font-ibm-plex-sans-vstart),'IBM Plex Sans',system-ui,sans-serif;-webkit-font-smoothing:antialiased;}
.vw *{box-sizing:border-box;}
.vw a:focus-visible,.vw button:focus-visible{outline:2px solid var(--spec-violet,#6C5CE0);outline-offset:2px;}
.vw-nav{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 26px;border-bottom:1px solid var(--spec-border,#E2DFEC);position:sticky;top:0;background:rgba(248,247,251,.92);backdrop-filter:blur(20px);z-index:20;}
.vw-brand{display:flex;align-items:baseline;gap:10px;color:var(--spec-ink,#141320);text-decoration:none;}
.vw-brand b{font-family:var(--font-space-grotesk),'Space Grotesk',sans-serif;font-size:17px;font-weight:700;}.vw-brand i{color:var(--spec-violet,#6C5CE0);font-style:normal;}
.vw-brand span{color:var(--spec-text-2nd,#615F72);font-size:13px;}
.vw-navr{display:flex;align-items:center;gap:14px;}
.vw-link{color:var(--spec-violet-deep,#4A3DB0);font-size:13.5px;font-weight:600;text-decoration:none;}
.vw-wrap{max-width:640px;margin:0 auto;padding:36px 20px 100px;}
.vw-wrap h1{font-family:var(--font-space-grotesk),'Space Grotesk',sans-serif;font-size:27px;font-weight:700;letter-spacing:-.01em;}
.vw-sub{color:var(--spec-text-2nd,#615F72);font-size:14.5px;margin:8px 0 20px;line-height:1.6;}
.vw-empty{text-align:center;color:var(--spec-text-2nd,#615F72);padding:70px 0;}
.vw-empty a{color:var(--spec-violet-deep,#4A3DB0);}
.vw-terms{background:rgba(108,92,224,.06);border:1px solid rgba(108,92,224,.3);border-radius:14px;padding:16px 18px;margin-top:4px;}
.vw-terms b{font-size:14.5px;}
.vw-terms p{margin:6px 0 10px;font-size:13px;color:var(--spec-text-2nd,#615F72);line-height:1.55;}
.vw-terms a{font-size:13px;font-weight:700;color:var(--spec-violet-deep,#4A3DB0);text-decoration:none;}
.vw-terms a:hover{color:var(--spec-violet,#6C5CE0);}
.vw-done{margin-top:22px;background:#E9F7F0;border:1px solid rgba(47,158,106,.3);color:#1F7A54;border-radius:14px;padding:16px 18px;font-size:14px;line-height:1.6;}
.vw-done a{color:#1F7A54;font-weight:700;}
`;
