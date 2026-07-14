'use client';

// /projects — the buyer's operations workspace. Two jobs:
//   1) List active projects with stage + the ONE next action (track everything
//      in one place — never dig through email).
//   2) Start a project conversationally: one question → AI structured draft →
//      edit → save. Drafting needs NO account (reciprocity / IKEA effect); we
//      ask for sign-in only to SAVE, and the button says "Continue".

import { useCallback, useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser-auth';

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
    <div className="pw">
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
.pw{min-height:100vh;background:#0A0A0F;color:#F0F0F5;font-family:'Outfit',system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;}
.pw *{box-sizing:border-box;}
.pw-nav{display:flex;justify-content:space-between;align-items:center;padding:14px 26px;border-bottom:1px solid rgba(255,255,255,.08);position:sticky;top:0;background:rgba(10,10,15,.9);backdrop-filter:blur(20px);z-index:30;}
.pw-brand{display:flex;align-items:baseline;gap:10px;color:#F0F0F5;text-decoration:none;}
.pw-brand b{font-size:17px;}.pw-brand i{color:#A78BFA;font-style:normal;}
.pw-brand span{color:#8080A0;font-size:13px;}
.pw-navr{display:flex;gap:8px;}
.pw-pill{font-size:13px;font-weight:500;color:#C0C0D0;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:99px;padding:8px 14px;text-decoration:none;white-space:nowrap;}
.pw-pill:hover{border-color:rgba(124,92,252,.5);}
.pw-wrap{max-width:1080px;margin:0 auto;padding:34px 20px 100px;}
.pw-head h1{font-size:clamp(24px,4vw,34px);font-weight:800;letter-spacing:-.02em;}
.pw-head h1 span{color:#A78BFA;}
.pw-head p{color:#8080A0;font-size:15px;line-height:1.6;margin:10px 0 0;max-width:620px;}
.pw-starter{background:#12121B;border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:22px;margin-top:26px;}
.pw-q{font-size:16px;font-weight:700;display:block;margin-bottom:12px;}
.pw-input,.pw-inline{width:100%;font-family:inherit;font-size:14.5px;padding:13px 15px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:#0A0A0F;color:#F0F0F5;outline:none;resize:vertical;line-height:1.5;}
.pw-input:focus,.pw-inline:focus{border-color:#7C5CFC;box-shadow:0 0 0 3px rgba(124,92,252,.15);}
.pw-startrow{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-top:12px;}
.pw-btn{font-family:inherit;font-size:14px;font-weight:700;padding:12px 20px;border-radius:11px;border:none;background:#7C5CFC;color:#fff;cursor:pointer;box-shadow:0 10px 26px -12px rgba(124,92,252,.6);}
.pw-btn:hover{background:#6344DF;}.pw-btn:disabled{opacity:.5;cursor:default;}
.pw-btn.wide{width:100%;margin-top:16px;padding:14px;}
.pw-note{color:#63607A;font-size:12.5px;}
.pw-note.center{text-align:center;display:block;margin-top:10px;}
.pw-draft{}
.pw-drafthead{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;}
.pw-badge{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#C4B5FD;background:rgba(124,92,252,.14);border:1px solid rgba(124,92,252,.3);border-radius:99px;padding:5px 12px;}
.pw-link{background:none;border:none;color:#A78BFA;font:inherit;font-size:13px;cursor:pointer;}
.pw-flab{display:block;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#8080A0;margin:14px 0 6px;}
.pw-chips{display:flex;flex-wrap:wrap;gap:7px;}
.pw-chip{font-size:12px;font-weight:600;padding:6px 11px;border-radius:99px;}
.pw-chip.product{background:rgba(124,92,252,.14);color:#C4B5FD;}
.pw-chip.service{background:rgba(52,211,153,.12);color:#34D399;}
.pw-suggest{margin:4px 0 0;padding-left:18px;color:#B8B6CC;font-size:13px;line-height:1.7;}
.pw-err{margin-top:12px;color:#FCA5A5;font-size:13px;}
.pw-list{margin-top:36px;}
.pw-list h2{font-size:17px;font-weight:800;margin-bottom:14px;}
.pw-empty{color:#8080A0;font-size:14px;padding:30px 0;}
.pw-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;}
.pw-card{display:block;background:#14141F;border:1px solid rgba(255,255,255,.08);border-radius:15px;padding:16px;text-decoration:none;color:#F0F0F5;transition:border-color .15s,transform .15s;}
.pw-card:hover{border-color:rgba(124,92,252,.5);transform:translateY(-2px);}
.pw-cardtop{display:flex;justify-content:space-between;align-items:center;gap:8px;}
.pw-stage{font-size:11px;font-weight:700;padding:4px 9px;border-radius:99px;background:rgba(124,92,252,.14);color:#C4B5FD;}
.pw-stage.s-completed{background:rgba(52,211,153,.14);color:#34D399;}
.pw-stage.s-decision{background:rgba(251,191,36,.14);color:#FBBF24;}
.pw-pri{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:3px 8px;border-radius:99px;}
.pw-pri.high{background:rgba(251,146,60,.14);color:#FB923C;}
.pw-pri.urgent{background:rgba(248,113,113,.16);color:#F87171;}
.pw-pri.low{background:rgba(255,255,255,.06);color:#8080A0;}
.pw-cardname{font-size:15.5px;font-weight:700;margin-top:11px;line-height:1.3;}
.pw-ref{font-size:11.5px;color:#8080A0;margin-top:3px;font-variant-numeric:tabular-nums;}
.pw-bar{height:5px;border-radius:99px;background:#1F1F2C;overflow:hidden;margin:12px 0 10px;}
.pw-bar i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#7C5CFC,#34D399);}
.pw-next{font-size:12.5px;color:#B8B6CC;line-height:1.5;}
.pw-next b{color:#C4B5FD;}
.pw-cardfoot{font-size:11px;color:#5A5A70;margin-top:10px;}
@media(max-width:520px){.pw-grid{grid-template-columns:1fr;}}
`;
