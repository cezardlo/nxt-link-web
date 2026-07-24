'use client';

// /projects — the buyer's operations workspace. Two jobs:
//   1) List active projects with stage + the ONE next action (track everything
//      in one place — never dig through email).
//   2) Start a project conversationally: one question → AI structured draft →
//      edit → save. Drafting needs NO account (reciprocity / IKEA effect); we
//      ask for sign-in only to SAVE, and the button says "Continue".

import { useCallback, useEffect, useState } from 'react';
import { IBM_Plex_Sans } from 'next/font/google';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser-auth';
import LanguageToggle, { useLang, type Lang } from '@/components/LanguageToggle';

// Design System v1.0 reskin (Premium Polish Phase 2, 2026-07-23): visual/CSS
// only — every handler and state above is unchanged.
// EN/ES (2026-07-23): this page had no Spanish at all — added the shared
// LanguageToggle/useLang pattern (see /buyer, /cart) with a page-local T
// dictionary. Copy/labels only, no handler or state changes. Category chip
// labels already carry both `label_en`/`label_es` from the draft API — this
// just picks the right one instead of always rendering label_en.
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans-projects',
  display: 'swap',
});

interface Project {
  id: string; name: string; company_name: string | null; problem: string | null;
  location: string | null; priority: string; stage: string; next_action: string | null;
  opportunity_ref: string | null; updated_at: string;
}
interface Category { slug: string; kind: string; label_en: string; label_es: string }
interface Draft {
  name: string; problem: string; operational_effect: string;
  categories: Category[]; suggested_info: string[];
}

const STAGE_LABEL: Record<string, string> = {
  organizing: 'Organizing', requirements_ready: 'Requirements ready', matching: 'Matching vendors',
  vendors_invited: 'Vendors invited', collecting_quotes: 'Collecting quotes', comparing: 'Comparing',
  decision: 'Decision needed', vendor_selected: 'Vendor selected', implementation: 'Implementation',
  completed: 'Completed', archived: 'Archived',
};
// Same wording used by /projects/[id]'s own (English-only, out of scope for
// this pass) STAGE_LABEL — kept as a sibling map here rather than editing
// that file, per the task's "translate this page only" scope.
const STAGE_LABEL_ES: Record<string, string> = {
  organizing: 'Organizando', requirements_ready: 'Requisitos listos', matching: 'Buscando proveedores',
  vendors_invited: 'Proveedores invitados', collecting_quotes: 'Recibiendo cotizaciones', comparing: 'Comparando',
  decision: 'Decisión pendiente', vendor_selected: 'Proveedor seleccionado', implementation: 'Implementación',
  completed: 'Completado', archived: 'Archivado',
};
const PRIORITY_KEY: Record<string, string> = { high: 'priHigh', urgent: 'priUrgent', low: 'priLow', medium: 'priMedium' };
const STAGE_PCT: Record<string, number> = {
  organizing: 15, requirements_ready: 25, matching: 35, vendors_invited: 45, collecting_quotes: 60,
  comparing: 70, decision: 80, vendor_selected: 88, implementation: 95, completed: 100, archived: 100,
};
const fmtDate = (s: string, lang: Lang) => { try { return new Date(s).toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US'); } catch { return ''; } };

const T: Record<Lang, Record<string, string>> = {
  en: {
    workspace: 'Workspace', marketplace: 'Marketplace', myRequests: 'My requests', signIn: 'Sign in',
    welcomeBack: 'Welcome back to', defaultTitle: 'Your project workspace',
    heroSub: 'Tell us what your operation needs. We organize the requirements, find options, and keep the whole project — quotes, files, decisions, next steps — in one place.',
    startQ: 'What are you trying to improve, purchase, repair, or replace?',
    startPh: "e.g. Our labels keep printing wrong and inventory can't scan them.",
    organizing: 'Organizing…', organize: 'Organize this for me →', noAccountNeeded: 'No account needed to start',
    draftBadge: 'Draft — edit anything', startOver: '← Start over',
    projectName: 'Project name', theProblem: 'The problem', operationalEffect: 'Operational effect',
    suggestedCategories: 'Suggested categories', helpfulToAdd: 'Helpful to add for better quotes',
    saving: 'Saving…', saveContinue: 'Save project & continue →', continue: 'Continue →',
    createFreeAccount: 'Create a free account to save this project and invite vendors.',
    yourProjects: 'Your projects', loading: 'Loading…',
    noProjectsYet: 'No projects yet. Describe a need above to start your first one.',
    next: 'Next:', updated: 'Updated',
    errNeedMore: 'Tell us a little more about what you need.',
    errCouldNotOrganize: 'Could not organize that — try rephrasing.',
    errSomethingWrong: 'Something went wrong. Please try again.',
    errCouldNotSave: 'Could not save.', errCouldNotSaveRetry: 'Could not save. Please try again.',
    priHigh: 'high', priUrgent: 'urgent', priLow: 'low', priMedium: 'medium',
    docTitle: 'Projects — NXT//LINK',
  },
  es: {
    workspace: 'Espacio de trabajo', marketplace: 'Marketplace', myRequests: 'Mis solicitudes', signIn: 'Iniciar sesión',
    welcomeBack: 'Bienvenido de nuevo a', defaultTitle: 'Tu espacio de proyectos',
    heroSub: 'Cuéntanos qué necesita tu operación. Organizamos los requisitos, buscamos opciones y mantenemos todo el proyecto — cotizaciones, archivos, decisiones, próximos pasos — en un solo lugar.',
    startQ: '¿Qué buscas mejorar, comprar, reparar o reemplazar?',
    startPh: 'ej. Nuestras etiquetas siguen imprimiendo mal y el inventario no puede escanearlas.',
    organizing: 'Organizando…', organize: 'Organízalo por mí →', noAccountNeeded: 'No necesitas una cuenta para empezar',
    draftBadge: 'Borrador — edita lo que quieras', startOver: '← Empezar de nuevo',
    projectName: 'Nombre del proyecto', theProblem: 'El problema', operationalEffect: 'Efecto operativo',
    suggestedCategories: 'Categorías sugeridas', helpfulToAdd: 'Útil agregar para mejores cotizaciones',
    saving: 'Guardando…', saveContinue: 'Guardar proyecto y continuar →', continue: 'Continuar →',
    createFreeAccount: 'Crea una cuenta gratis para guardar este proyecto e invitar proveedores.',
    yourProjects: 'Tus proyectos', loading: 'Cargando…',
    noProjectsYet: 'Aún no hay proyectos. Describe una necesidad arriba para empezar el primero.',
    next: 'Siguiente:', updated: 'Actualizado',
    errNeedMore: 'Cuéntanos un poco más sobre lo que necesitas.',
    errCouldNotOrganize: 'No pudimos organizar eso — intenta con otras palabras.',
    errSomethingWrong: 'Algo salió mal. Intenta de nuevo.',
    errCouldNotSave: 'No se pudo guardar.', errCouldNotSaveRetry: 'No se pudo guardar. Intenta de nuevo.',
    priHigh: 'alta', priUrgent: 'urgente', priLow: 'baja', priMedium: 'media',
    docTitle: 'Proyectos — NXT//LINK',
  },
};

export default function ProjectsPage() {
  const [lang, setLang] = useLang();
  const t = T[lang];
  const [checking, setChecking] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);

  // conversational starter
  const [text, setText] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/projects');
      const j = await r.json();
      setSignedIn(Boolean(j.signed_in));
      setEmail(j.email || null);
      setProjects(j.projects || []);
    } catch { /* ignore */ }
    setChecking(false);
  }, []);

  useEffect(() => {
    // If we bounced through sign-in with a pending draft, save it now.
    const pending = typeof window !== 'undefined' ? sessionStorage.getItem('nxt_pending_project') : null;
    (async () => {
      const sb = createBrowserSupabaseClient();
      const { data } = await sb.auth.getUser();
      if (data?.user && pending) {
        sessionStorage.removeItem('nxt_pending_project');
        try {
          const r = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: pending });
          const j = await r.json();
          if (j.ok) { window.location.href = `/projects/${j.project.id}`; return; }
        } catch { /* fall through to normal load */ }
      }
      load();
    })();
  }, [load]);

  useEffect(() => { document.title = t.docTitle; }, [t.docTitle]);

  async function organize() {
    if (text.trim().length < 4) { setErr(t.errNeedMore); return; }
    setErr(''); setDrafting(true); setDraft(null);
    try {
      const r = await fetch('/api/projects/draft', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
      const j = await r.json();
      if (j.ok) setDraft(j.draft);
      else setErr(j.message || t.errCouldNotOrganize);
    } catch { setErr(t.errSomethingWrong); }
    setDrafting(false);
  }

  async function save() {
    if (!draft) return;
    setSaving(true); setErr('');
    const payload = JSON.stringify({
      name: draft.name,
      problem: draft.problem,
      desired_outcome: draft.operational_effect,
      requirements: { category_slugs: draft.categories.map((c) => c.slug), suggested_info: draft.suggested_info },
    });
    // Value-before-signup: if not signed in, stash the built draft and send them
    // to sign in — we'll save it automatically when they return.
    const sb = createBrowserSupabaseClient();
    const { data } = await sb.auth.getUser();
    if (!data?.user) {
      sessionStorage.setItem('nxt_pending_project', payload);
      window.location.href = '/login?next=/projects';
      return;
    }
    try {
      const r = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload });
      const j = await r.json();
      if (j.ok) { window.location.href = `/projects/${j.project.id}`; return; }
      setErr(j.message || t.errCouldNotSave);
    } catch { setErr(t.errCouldNotSaveRetry); }
    setSaving(false);
  }

  const companyName = projects.find((p) => p.company_name)?.company_name || (email ? email.split('@')[1] : null);

  return (
    <div className={`pw ${ibmPlexSans.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <nav className="pw-nav">
        <a className="pw-brand" href="/"><b>NXT<i>//</i>LINK</b><span>{t.workspace}</span></a>
        <div className="pw-navr">
          <a className="pw-pill" href="/marketplace">{t.marketplace}</a>
          {signedIn ? <a className="pw-pill" href="/buyer">{t.myRequests}</a> : <a className="pw-pill" href="/login">{t.signIn}</a>}
          <LanguageToggle lang={lang} onChange={setLang} variant="light" />
        </div>
      </nav>

      <div className="pw-wrap">
        <header className="pw-head">
          <h1>{signedIn && companyName ? <>{t.welcomeBack} <span>{companyName}</span></> : t.defaultTitle}</h1>
          <p>{t.heroSub}</p>
        </header>

        {/* Conversational starter */}
        <section className="pw-starter">
          {!draft ? (
            <>
              <label className="pw-q">{t.startQ}</label>
              <textarea
                className="pw-input" rows={3} value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t.startPh}
              />
              <div className="pw-startrow">
                <button className="pw-btn" onClick={organize} disabled={drafting}>
                  {drafting ? t.organizing : t.organize}
                </button>
                <span className="pw-note">{t.noAccountNeeded}</span>
              </div>
            </>
          ) : (
            <div className="pw-draft">
              <div className="pw-drafthead">
                <span className="pw-badge">{t.draftBadge}</span>
                <button className="pw-link" onClick={() => setDraft(null)}>{t.startOver}</button>
              </div>
              <label className="pw-flab">{t.projectName}</label>
              <input className="pw-inline" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              <label className="pw-flab">{t.theProblem}</label>
              <textarea className="pw-inline" rows={2} value={draft.problem} onChange={(e) => setDraft({ ...draft, problem: e.target.value })} />
              {(draft.operational_effect || '') !== '' && (
                <>
                  <label className="pw-flab">{t.operationalEffect}</label>
                  <input className="pw-inline" value={draft.operational_effect} onChange={(e) => setDraft({ ...draft, operational_effect: e.target.value })} />
                </>
              )}
              {draft.categories.length > 0 && (
                <>
                  <label className="pw-flab">{t.suggestedCategories}</label>
                  <div className="pw-chips">
                    {draft.categories.map((c) => (
                      <span key={c.slug} className={`pw-chip ${c.kind}`}>{(lang === 'es' ? c.label_es : c.label_en) || c.label_en}</span>
                    ))}
                  </div>
                </>
              )}
              {draft.suggested_info.length > 0 && (
                <>
                  <label className="pw-flab">{t.helpfulToAdd}</label>
                  <ul className="pw-suggest">
                    {draft.suggested_info.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </>
              )}
              <button className="pw-btn wide" onClick={save} disabled={saving}>
                {saving ? t.saving : signedIn ? t.saveContinue : t.continue}
              </button>
              {!signedIn && <p className="pw-note center">{t.createFreeAccount}</p>}
            </div>
          )}
          {err && <div className="pw-err">{err}</div>}
        </section>

        {/* Active projects */}
        {signedIn && (
          <section className="pw-list">
            <h2>{t.yourProjects}</h2>
            {checking ? (
              <div className="pw-empty">{t.loading}</div>
            ) : projects.length === 0 ? (
              <div className="pw-empty">{t.noProjectsYet}</div>
            ) : (
              <div className="pw-grid">
                {projects.map((p) => (
                  <a key={p.id} className="pw-card" href={`/projects/${p.id}`}>
                    <div className="pw-cardtop">
                      <span className={`pw-stage s-${p.stage}`}>{(lang === 'es' ? STAGE_LABEL_ES[p.stage] : STAGE_LABEL[p.stage]) || p.stage}</span>
                      {p.priority !== 'medium' && <span className={`pw-pri ${p.priority}`}>{lang === 'es' ? (t[PRIORITY_KEY[p.priority]] || p.priority) : p.priority}</span>}
                    </div>
                    <div className="pw-cardname">{p.name}</div>
                    {p.opportunity_ref && <div className="pw-ref">{p.opportunity_ref}</div>}
                    <div className="pw-bar"><i style={{ width: `${STAGE_PCT[p.stage] || 10}%` }} /></div>
                    {p.next_action && <div className="pw-next"><b>{t.next}</b> {p.next_action}</div>}
                    <div className="pw-cardfoot">{t.updated} {fmtDate(p.updated_at, lang)}</div>
                  </a>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

const CSS = `
.pw{min-height:100vh;background:var(--spec-warm-white,#F8F7FB);color:var(--spec-ink,#141320);font-family:var(--font-ibm-plex-sans-projects),'IBM Plex Sans',system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;}
.pw *{box-sizing:border-box;}
.pw a:focus-visible,.pw button:focus-visible,.pw input:focus-visible,.pw textarea:focus-visible{outline:2px solid var(--spec-violet,#6C5CE0);outline-offset:2px;}
.pw-nav{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;row-gap:8px;padding:14px 26px;border-bottom:1px solid var(--spec-border,#E2DFEC);position:sticky;top:0;background:rgba(248,247,251,.92);backdrop-filter:blur(20px);z-index:30;}
.pw-brand{display:flex;align-items:baseline;gap:10px;color:var(--spec-ink,#141320);text-decoration:none;}
.pw-brand b{font-family:var(--font-space-grotesk),'Space Grotesk',sans-serif;font-size:17px;font-weight:700;}.pw-brand i{color:var(--spec-violet,#6C5CE0);font-style:normal;}
.pw-brand span{color:var(--spec-text-2nd,#615F72);font-size:13px;}
.pw-navr{display:flex;align-items:center;gap:8px;}
.pw-pill{font-size:13px;font-weight:500;color:var(--spec-ink,#141320);background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:99px;padding:8px 14px;text-decoration:none;white-space:nowrap;}
.pw-pill:hover{border-color:var(--spec-violet,#6C5CE0);}
.pw-wrap{max-width:1080px;margin:0 auto;padding:34px 20px 100px;}
.pw-head h1{font-family:var(--font-space-grotesk),'Space Grotesk',sans-serif;font-size:clamp(24px,4vw,34px);font-weight:700;letter-spacing:-.01em;}
.pw-head h1 span{color:var(--spec-violet-deep,#4A3DB0);}
.pw-head p{color:var(--spec-text-2nd,#615F72);font-size:15px;line-height:1.6;margin:10px 0 0;max-width:620px;}
.pw-starter{background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:18px;padding:22px;margin-top:26px;}
.pw-q{font-size:16px;font-weight:700;display:block;margin-bottom:12px;}
.pw-input,.pw-inline{width:100%;font-family:inherit;font-size:14.5px;padding:13px 15px;border-radius:12px;border:1px solid var(--spec-border,#E2DFEC);background:#fff;color:var(--spec-ink,#141320);outline:none;resize:vertical;line-height:1.5;}
.pw-input:focus,.pw-inline:focus{border-color:var(--spec-violet,#6C5CE0);box-shadow:0 0 0 3px rgba(108,92,224,.12);}
.pw-startrow{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-top:12px;}
.pw-btn{font-family:inherit;font-size:14px;font-weight:700;padding:12px 20px;border-radius:10px;border:none;background:var(--spec-violet,#6C5CE0);color:#fff;cursor:pointer;box-shadow:0 10px 26px -12px rgba(108,92,224,.5);}
.pw-btn:hover{background:var(--spec-violet-deep,#4A3DB0);}.pw-btn:disabled{opacity:.5;cursor:default;}
.pw-btn.wide{width:100%;margin-top:16px;padding:14px;}
.pw-note{color:#8A87A0;font-size:12.5px;}
.pw-note.center{text-align:center;display:block;margin-top:10px;}
.pw-draft{}
.pw-drafthead{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;}
.pw-badge{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--spec-violet-deep,#4A3DB0);background:rgba(108,92,224,.1);border:1px solid rgba(108,92,224,.28);border-radius:99px;padding:5px 12px;}
.pw-link{background:none;border:none;color:var(--spec-violet-deep,#4A3DB0);font:inherit;font-size:13px;cursor:pointer;}
.pw-flab{display:block;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--spec-text-2nd,#615F72);margin:14px 0 6px;}
.pw-chips{display:flex;flex-wrap:wrap;gap:7px;}
.pw-chip{font-size:12px;font-weight:600;padding:6px 11px;border-radius:99px;}
.pw-chip.product{background:rgba(108,92,224,.1);color:var(--spec-violet-deep,#4A3DB0);}
.pw-chip.service{background:#E9F7F0;color:#1F7A54;}
.pw-suggest{margin:4px 0 0;padding-left:18px;color:var(--spec-text-2nd,#615F72);font-size:13px;line-height:1.7;}
.pw-err{margin-top:12px;color:var(--spec-error,#CE4B43);font-size:13px;}
.pw-list{margin-top:36px;}
.pw-list h2{font-family:var(--font-space-grotesk),'Space Grotesk',sans-serif;font-size:17px;font-weight:700;margin-bottom:14px;}
.pw-empty{color:var(--spec-text-2nd,#615F72);font-size:14px;padding:30px 0;}
.pw-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;}
.pw-card{display:block;background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:15px;padding:16px;text-decoration:none;color:var(--spec-ink,#141320);transition:border-color .15s,transform .15s,box-shadow .15s;}
.pw-card:hover{border-color:var(--spec-violet,#6C5CE0);transform:translateY(-2px);box-shadow:0 8px 20px rgba(20,19,32,.08);}
.pw-cardtop{display:flex;justify-content:space-between;align-items:center;gap:8px;}
.pw-stage{font-size:11px;font-weight:700;padding:4px 9px;border-radius:99px;background:rgba(108,92,224,.1);color:var(--spec-violet-deep,#4A3DB0);}
.pw-stage.s-completed{background:#E9F7F0;color:#1F7A54;}
.pw-stage.s-decision{background:#FBF3E7;color:var(--spec-warning,#C68A28);}
.pw-pri{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:3px 8px;border-radius:99px;}
.pw-pri.high{background:#FDEEE3;color:#B5651D;}
.pw-pri.urgent{background:#FBECEA;color:var(--spec-error,#CE4B43);}
.pw-pri.low{background:var(--spec-surface,#EFEDF5);color:var(--spec-text-2nd,#615F72);}
.pw-cardname{font-size:15.5px;font-weight:700;margin-top:11px;line-height:1.3;}
.pw-ref{font-size:11.5px;color:var(--spec-text-2nd,#615F72);margin-top:3px;font-variant-numeric:tabular-nums;}
.pw-bar{height:5px;border-radius:99px;background:var(--spec-border,#E2DFEC);overflow:hidden;margin:12px 0 10px;}
.pw-bar i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#6C5CE0,#2F9E6A);}
.pw-next{font-size:12.5px;color:var(--spec-ink,#141320);line-height:1.5;}
.pw-next b{color:var(--spec-violet-deep,#4A3DB0);}
.pw-cardfoot{font-size:11px;color:#8A87A0;margin-top:10px;}
@media(max-width:520px){.pw-grid{grid-template-columns:1fr;}}
`;
