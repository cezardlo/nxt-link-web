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

// Design System v1.0 reskin (Premium Polish Phase 2, 2026-07-23): visual/CSS
// only — every handler and state above is unchanged.
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
const STAGE_PCT: Record<string, number> = {
  organizing: 15, requirements_ready: 25, matching: 35, vendors_invited: 45, collecting_quotes: 60,
  comparing: 70, decision: 80, vendor_selected: 88, implementation: 95, completed: 100, archived: 100,
};
const fmtDate = (s: string) => { try { return new Date(s).toLocaleDateString(); } catch { return ''; } };

export default function ProjectsPage() {
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

  async function organize() {
    if (text.trim().length < 4) { setErr('Tell us a little more about what you need.'); return; }
    setErr(''); setDrafting(true); setDraft(null);
    try {
      const r = await fetch('/api/projects/draft', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
      const j = await r.json();
      if (j.ok) setDraft(j.draft);
      else setErr(j.message || 'Could not organize that — try rephrasing.');
    } catch { setErr('Something went wrong. Please try again.'); }
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
      setErr(j.message || 'Could not save.');
    } catch { setErr('Could not save. Please try again.'); }
    setSaving(false);
  }

  const companyName = projects.find((p) => p.company_name)?.company_name || (email ? email.split('@')[1] : null);

  return (
    <div className={`pw ${ibmPlexSans.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <nav className="pw-nav">
        <a className="pw-brand" href="/"><b>NXT<i>//</i>LINK</b><span>Workspace</span></a>
        <div className="pw-navr">
          <a className="pw-pill" href="/marketplace">Marketplace</a>
          {signedIn ? <a className="pw-pill" href="/buyer">My requests</a> : <a className="pw-pill" href="/login">Sign in</a>}
        </div>
      </nav>

      <div className="pw-wrap">
        <header className="pw-head">
          <h1>{signedIn && companyName ? <>Welcome back to <span>{companyName}</span></> : 'Your project workspace'}</h1>
          <p>Tell us what your operation needs. We organize the requirements, find options, and keep the whole project — quotes, files, decisions, next steps — in one place.</p>
        </header>

        {/* Conversational starter */}
        <section className="pw-starter">
          {!draft ? (
            <>
              <label className="pw-q">What are you trying to improve, purchase, repair, or replace?</label>
              <textarea
                className="pw-input" rows={3} value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="e.g. Our labels keep printing wrong and inventory can't scan them."
              />
              <div className="pw-startrow">
                <button className="pw-btn" onClick={organize} disabled={drafting}>
                  {drafting ? 'Organizing…' : 'Organize this for me →'}
                </button>
                <span className="pw-note">No account needed to start</span>
              </div>
            </>
          ) : (
            <div className="pw-draft">
              <div className="pw-drafthead">
                <span className="pw-badge">Draft — edit anything</span>
                <button className="pw-link" onClick={() => setDraft(null)}>← Start over</button>
              </div>
              <label className="pw-flab">Project name</label>
              <input className="pw-inline" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              <label className="pw-flab">The problem</label>
              <textarea className="pw-inline" rows={2} value={draft.problem} onChange={(e) => setDraft({ ...draft, problem: e.target.value })} />
              {(draft.operational_effect || '') !== '' && (
                <>
                  <label className="pw-flab">Operational effect</label>
                  <input className="pw-inline" value={draft.operational_effect} onChange={(e) => setDraft({ ...draft, operational_effect: e.target.value })} />
                </>
              )}
              {draft.categories.length > 0 && (
                <>
                  <label className="pw-flab">Suggested categories</label>
                  <div className="pw-chips">
                    {draft.categories.map((c) => (
                      <span key={c.slug} className={`pw-chip ${c.kind}`}>{c.label_en}</span>
                    ))}
                  </div>
                </>
              )}
              {draft.suggested_info.length > 0 && (
                <>
                  <label className="pw-flab">Helpful to add for better quotes</label>
                  <ul className="pw-suggest">
                    {draft.suggested_info.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </>
              )}
              <button className="pw-btn wide" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : signedIn ? 'Save project & continue →' : 'Continue →'}
              </button>
              {!signedIn && <p className="pw-note center">Create a free account to save this project and invite vendors.</p>}
            </div>
          )}
          {err && <div className="pw-err">{err}</div>}
        </section>

        {/* Active projects */}
        {signedIn && (
          <section className="pw-list">
            <h2>Your projects</h2>
            {checking ? (
              <div className="pw-empty">Loading…</div>
            ) : projects.length === 0 ? (
              <div className="pw-empty">No projects yet. Describe a need above to start your first one.</div>
            ) : (
              <div className="pw-grid">
                {projects.map((p) => (
                  <a key={p.id} className="pw-card" href={`/projects/${p.id}`}>
                    <div className="pw-cardtop">
                      <span className={`pw-stage s-${p.stage}`}>{STAGE_LABEL[p.stage] || p.stage}</span>
                      {p.priority !== 'medium' && <span className={`pw-pri ${p.priority}`}>{p.priority}</span>}
                    </div>
                    <div className="pw-cardname">{p.name}</div>
                    {p.opportunity_ref && <div className="pw-ref">{p.opportunity_ref}</div>}
                    <div className="pw-bar"><i style={{ width: `${STAGE_PCT[p.stage] || 10}%` }} /></div>
                    {p.next_action && <div className="pw-next"><b>Next:</b> {p.next_action}</div>}
                    <div className="pw-cardfoot">Updated {fmtDate(p.updated_at)}</div>
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
.pw-navr{display:flex;gap:8px;}
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
