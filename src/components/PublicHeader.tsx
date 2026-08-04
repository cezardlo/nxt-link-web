'use client';

// ONE shared public header for the whole anonymous-buyer journey (Flow
// Blueprint 2026-07-22, §4 + Slice 2 — workplace/plans/FLOW-BLUEPRINT-
// 2026-07-22.md). Used on /, /marketplace, /intake, /marketplace/[kind]/[id],
// and /marketplace/vendor/[id] so every anonymous-buyer screen shares ONE
// implementation instead of forking a second copy per page (the landing page
// header built in Slice 1, commit 9e224b8, is now sourced from here).
//
// Contents: logo · primary nav (Marketplace / How it works / For vendors) ·
// known-item search (flex-fill, submits to /marketplace?q=) · EN/ES language
// toggle (shared LanguageToggle + the caller's own language state — pages
// differ in *where* they persist that state, so it's a controlled prop here,
// not a second useLang() instance) · "Saved for Quote" (always-visible label
// + live count, existing `useCart` hook — same store /cart and the listing
// cards already use, so the header count is never a second source of truth)
// · "Become a Vendor" (violet fill) · Sign in · Join free.
//
// 2026-07-22 restyle (Cesar: "match Codex's look" — the localhost:3014
// preview, src/components/landing/LandingExperience.tsx in the reference
// build): added the nav row + made the quote entry a labeled pill instead of
// an icon that only appeared once the cart had items, so it reads the same
// as the reviewed design. Every function the header already had (search,
// EN/ES, vendor entry, sign in, join, mobile hamburger, cart count) is kept —
// this only adds to it.
//
// Mobile (<=760px, matching the landing page's existing breakpoint): the
// search box collapses to an icon that expands on tap; nav / language /
// Saved for Quote / Become a Vendor / Sign in / Join move into a hamburger
// menu. Every control keeps a >=44px hit target (Flow Blueprint's header
// click-zone fix).

import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { IBM_Plex_Sans } from 'next/font/google';
import { ListPlus, Menu, X } from 'lucide-react';
import LanguageToggle, { type Lang } from './LanguageToggle';
import { useCart } from './cart/useCart';

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans-header',
  display: 'swap',
});

// Fixed strings only — every consuming page already has (or gains) these
// exact EN/ES pairs elsewhere in the app (landing page header, CartButton),
// so this component is self-contained like LanguageToggle/CartButton rather
// than asking five different page-level T tables to carry duplicate copy.
const T: Record<Lang, Record<string, string>> = {
  en: {
    marketplace: 'Marketplace',
    howItWorks: 'How it works',
    forVendors: 'For vendors',
    searchPh: 'Search equipment, services, or part numbers…',
    searchAria: 'Search the marketplace',
    searchBtn: 'Search',
    openSearchAria: 'Open search',
    signIn: 'Sign in',
    join: 'Join free',
    myDashboard: 'My dashboard',
    becomeVendor: 'Become a Vendor',
    savedForQuote: 'Saved for Quote',
    menuAria: 'Menu',
    closeMenuAria: 'Close menu',
  },
  es: {
    marketplace: 'Marketplace',
    howItWorks: 'Cómo funciona',
    forVendors: 'Para proveedores',
    searchPh: 'Busca equipo, servicios o números de parte…',
    searchAria: 'Buscar en el marketplace',
    searchBtn: 'Buscar',
    openSearchAria: 'Abrir búsqueda',
    signIn: 'Iniciar sesión',
    join: 'Únete gratis',
    myDashboard: 'Mi panel',
    becomeVendor: 'Conviértete en proveedor',
    savedForQuote: 'Guardado para cotizar',
    menuAria: 'Menú',
    closeMenuAria: 'Cerrar menú',
  },
};

// Imperative handle so a page's own hero CTA can focus this header's search
// box (same job the landing page's inline header used to do with a local
// ref) without page.tsx reaching into this component's internals.
export interface PublicHeaderHandle {
  focusSearch: () => void;
}

// `condensed` is for pages whose own content already carries the search bar
// and join/vendor CTAs full-size (today: the homepage hero + vendor band —
// Cesar 2026-07-30: header trio next to the hero read as repetitive). It
// keeps brand/nav/lang/cart/Sign in and drops the duplicates; every other
// page renders the full header unchanged.
const PublicHeader = forwardRef<PublicHeaderHandle, { lang: Lang; onLangChange: (l: Lang) => void; condensed?: boolean }>(
  function PublicHeader({ lang, onLangChange, condensed = false }, ref) {
  const t = T[lang];
  const { count } = useCart();
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Signed-in awareness (Cesar live report 2026-07-30: /marketplace sits
  // behind the login wall, so every viewer there is signed in — offering
  // them "Sign in / Join free / Become a Vendor" is incoherent). Default
  // renders the anonymous CTAs; once /api/auth/me confirms a session they
  // swap for one "My dashboard" link routed by role (same mapping as
  // auth/callback's routedDefault).
  const [me, setMe] = useState<{ role: string } | null>(null);
  useEffect(() => {
    let active = true;
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active && d?.signed_in) setMe({ role: String(d.role || 'client') });
      })
      .catch(() => { /* network error -> keep anonymous CTAs */ });
    return () => { active = false; };
  }, []);
  const dashHref = me?.role === 'admin' || me?.role === 'super_admin'
    ? '/admin'
    : me?.role === 'vendor' ? '/vendor/portal' : '/buyer';

  useImperativeHandle(ref, () => ({
    focusSearch() {
      setSearchOpen(true);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    },
  }), []);

  // Escape closes whichever mobile panel is open — no keyboard traps.
  useEffect(() => {
    if (!menuOpen && !searchOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setMenuOpen(false); setSearchOpen(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen, searchOpen]);

  function goSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    window.location.href = q ? `/marketplace?q=${encodeURIComponent(q)}` : '/marketplace';
  }

  return (
    <header className={`ph ${ibmPlexSans.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="ph-main">
        <a className="ph-brand" href="/"><b>NXT<i>{'//'}</i>LINK</b></a>

        <nav className="ph-nav" aria-label="Primary">
          <Link href="/marketplace">{t.marketplace}</Link>
          <a href="/#how-it-works">{t.howItWorks}</a>
          <a href="/#for-vendors">{t.forVendors}</a>
        </nav>

        {!condensed && (
          <form className={`ph-search${searchOpen ? ' open' : ''}`} onSubmit={goSearch} role="search">
            <SearchIcon />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.searchPh}
              aria-label={t.searchAria}
            />
            <button type="submit">{t.searchBtn}</button>
          </form>
        )}

        {!condensed && (
          <button
            type="button"
            className="ph-searchtoggle"
            aria-label={t.openSearchAria}
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen((v) => !v)}
          >
            <SearchIcon />
          </button>
        )}

        <div className="ph-actions">
          <div className="ph-desktoprow">
            <LanguageToggle lang={lang} onChange={onLangChange} variant="light" />
            <Link className="ph-quote" href="/cart" aria-label={`${t.savedForQuote} (${count})`}>
              <ListPlus size={17} aria-hidden="true" />
              <span>{t.savedForQuote}</span>
              <span className={'ph-quoten' + (count > 0 ? ' has' : '')} aria-hidden="true">{count}</span>
            </Link>
            {me ? (
              <a className="ph-joinbtn" href={dashHref}>{t.myDashboard}</a>
            ) : (
              <>
                {!condensed && <Link className="ph-vendorlink" href="/apply">{t.becomeVendor}</Link>}
                <a className="ph-signin" href="/login">{t.signIn}</a>
                {!condensed && <a className="ph-joinbtn" href="/signup">{t.join}</a>}
              </>
            )}
          </div>

          <button
            type="button"
            className="ph-hamburger"
            aria-label={menuOpen ? t.closeMenuAria : t.menuAria}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="ph-mobilemenu">
          <nav className="ph-mobilenav" aria-label="Primary">
            <Link href="/marketplace" onClick={() => setMenuOpen(false)}>{t.marketplace}</Link>
            <a href="/#how-it-works" onClick={() => setMenuOpen(false)}>{t.howItWorks}</a>
            <a href="/#for-vendors" onClick={() => setMenuOpen(false)}>{t.forVendors}</a>
          </nav>
          <Link className="ph-quote" href="/cart" aria-label={`${t.savedForQuote} (${count})`} onClick={() => setMenuOpen(false)}>
            <ListPlus size={17} aria-hidden="true" />
            <span>{t.savedForQuote}</span>
            <span className={'ph-quoten' + (count > 0 ? ' has' : '')} aria-hidden="true">{count}</span>
          </Link>
          <LanguageToggle lang={lang} onChange={onLangChange} variant="light" />
          {me ? (
            <a className="ph-joinbtn" href={dashHref}>{t.myDashboard}</a>
          ) : (
            <>
              {!condensed && <Link className="ph-vendorlink" href="/apply" onClick={() => setMenuOpen(false)}>{t.becomeVendor}</Link>}
              <a className="ph-signin" href="/login">{t.signIn}</a>
              {!condensed && <a className="ph-joinbtn" href="/signup">{t.join}</a>}
            </>
          )}
        </div>
      )}
    </header>
  );
  },
);

export default PublicHeader;

function SearchIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>;
}

// Design System v1.0 tokens (vault/Design-System.md) via the `--spec-*` CSS
// vars already wired in globals.css. Ported 1:1 from the landing page's
// Slice-1 header (src/app/page.tsx CSS, `.hp-header`/`.hp-headmain`/etc) so
// the extraction is pixel-equivalent — same class *shapes*, new `ph-` prefix
// so it never collides with each page's own scoped CSS (mk-*/dt-*/vs-*/hp-*).
const CSS = `
.ph{position:sticky;top:0;z-index:40;background:var(--spec-warm-white);backdrop-filter:blur(20px);border-bottom:1px solid var(--spec-border);padding:12px 20px;font-family:var(--font-ibm-plex-sans-header),'IBM Plex Sans',system-ui,-apple-system,'Segoe UI',sans-serif;-webkit-font-smoothing:antialiased;}
.ph *{box-sizing:border-box;}
.ph a{text-decoration:none;}
.ph-main{display:flex;align-items:center;gap:18px;max-width:1280px;margin:0 auto;flex-wrap:wrap;}
.ph-brand{flex-shrink:0;color:var(--spec-ink);}
.ph-brand b{font-family:var(--font-space-grotesk),'Space Grotesk',system-ui,sans-serif;font-size:18px;font-weight:700;letter-spacing:-.02em;color:var(--spec-ink);}
.ph-brand i{color:var(--spec-violet);font-style:normal;}

.ph-nav{display:flex;align-items:center;gap:18px;flex-shrink:0;}
.ph-nav a{display:flex;align-items:center;min-height:44px;color:var(--spec-text-2nd);font-size:13.5px;font-weight:600;white-space:nowrap;}
.ph-nav a:hover{color:var(--spec-violet-deep);}

.ph-search{order:2;flex:1 1 240px;min-width:0;display:flex;align-items:center;gap:8px;max-width:560px;background:#fff;border:1px solid var(--spec-border);border-radius:var(--spec-radius-md);padding:0 6px 0 14px;color:var(--spec-text-2nd);}
.ph-search:focus-within{border-color:var(--spec-violet);box-shadow:0 0 0 3px rgba(108,92,224,.15);}
.ph-search svg{flex-shrink:0;color:var(--spec-text-2nd);}
.ph-search input{flex:1;min-width:0;background:none;border:none;outline:none;color:var(--spec-ink);font-family:inherit;font-size:14.5px;padding:12px 0;}
.ph-search input::placeholder{color:var(--spec-text-2nd);}
.ph-search button{flex-shrink:0;min-height:44px;background:var(--spec-violet);color:#fff;font-family:inherit;font-weight:700;font-size:13.5px;border:none;border-radius:var(--spec-radius-btn);padding:9px 16px;cursor:pointer;margin:4px 0;transition:background .15s;}
.ph-search button:hover{background:var(--spec-violet-deep);}

.ph-searchtoggle{display:none;order:2;flex-shrink:0;align-items:center;justify-content:center;min-width:44px;min-height:44px;background:none;border:1px solid var(--spec-border);border-radius:var(--spec-radius-btn);color:var(--spec-text-2nd);cursor:pointer;}
.ph-searchtoggle:hover{border-color:var(--spec-violet);color:var(--spec-violet);}

/* Every control below is a >=44px hit target with its own visual bounds and
   an explicit gap from its neighbors (Flow Blueprint header click-zone fix). */
.ph-actions{order:3;margin-left:auto;display:flex;align-items:center;gap:10px;flex-shrink:0;}
.ph-desktoprow{display:flex;align-items:center;gap:10px;flex-wrap:wrap;row-gap:8px;}
.ph-signin{display:flex;align-items:center;min-height:44px;padding:0 6px;color:var(--spec-text-2nd);font-size:13.5px;font-weight:600;white-space:nowrap;}
.ph-signin:hover{color:var(--spec-ink);}
.ph-joinbtn{display:flex;align-items:center;justify-content:center;min-height:44px;color:var(--spec-ink);font-size:13.5px;font-weight:700;padding:0 16px;border-radius:var(--spec-radius-btn);border:1.5px solid rgba(20,19,32,.18);white-space:nowrap;transition:border-color .15s,background .15s;}
.ph-joinbtn:hover{border-color:rgba(20,19,32,.34);background:rgba(20,19,32,.04);}
.ph-vendorlink{display:flex;align-items:center;justify-content:center;min-height:44px;background:var(--spec-violet);color:#fff !important;font-size:13.5px;font-weight:700;padding:0 16px;border-radius:var(--spec-radius-btn);white-space:nowrap;transition:background .15s;}
.ph-vendorlink:hover{background:var(--spec-violet-deep);}

.ph-quote{position:relative;display:flex;align-items:center;gap:7px;min-height:44px;padding:0 12px;color:var(--spec-ink);font-size:13px;font-weight:700;border:1px solid var(--spec-border);border-radius:var(--spec-radius-btn);white-space:nowrap;background:#fff;flex-shrink:0;}
.ph-quote:hover{border-color:var(--spec-violet);color:var(--spec-violet-deep);}
.ph-quote svg{flex-shrink:0;color:var(--spec-violet);}
.ph-quoten{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;border-radius:99px;background:var(--spec-surface);color:var(--spec-text-2nd);font-size:10.5px;font-weight:700;}
.ph-quoten.has{background:var(--spec-violet);color:#fff;}

.ph-hamburger{display:none;flex-shrink:0;align-items:center;justify-content:center;min-width:44px;min-height:44px;background:none;border:1px solid var(--spec-border);border-radius:var(--spec-radius-btn);color:var(--spec-ink);cursor:pointer;}
.ph-hamburger:hover{border-color:var(--spec-violet);color:var(--spec-violet);}

.ph-mobilemenu{position:absolute;top:100%;left:0;right:0;background:#fff;border-bottom:1px solid var(--spec-border);box-shadow:0 16px 32px -18px rgba(20,19,32,.25);padding:14px 20px 18px;display:flex;flex-direction:column;gap:10px;z-index:40;}
.ph-mobilenav{display:flex;flex-direction:column;border-bottom:1px solid var(--spec-border);padding-bottom:6px;margin-bottom:4px;}
.ph-mobilenav a{display:flex;align-items:center;min-height:44px;color:var(--spec-ink);font-size:14.5px;font-weight:650;}
.ph-mobilemenu .ph-signin{border-bottom:1px solid var(--spec-border);justify-content:flex-start;padding:12px 4px;}
.ph-mobilemenu .ph-joinbtn,.ph-mobilemenu .ph-vendorlink,.ph-mobilemenu .ph-quote{width:100%;justify-content:center;}

.ph button:focus-visible,.ph a:focus-visible{outline:2px solid var(--spec-violet);outline-offset:2px;}

@media(max-width:1080px){
  /* Nav links fold into the hamburger before search/actions do — they're
     the lowest-priority row (search and the account actions stay reachable
     without a tap all the way down to 760px). */
  .ph-nav{display:none;}
  .ph-hamburger{display:inline-flex;}
}

@media(max-width:760px){
  .ph-search{display:none;flex-basis:100%;order:4;max-width:none;}
  .ph-search.open{display:flex;}
  .ph-searchtoggle{display:inline-flex;}
  .ph-desktoprow{display:none;}
}
`;
