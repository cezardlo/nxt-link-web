'use client';

// /projects/[id] — the project workspace. One screen answers "where is
// everything?": stage + next action up top, then Overview, Vendors (shortlist),
// Documents, and an append-only History timeline. Buyer edits inline; every
// change is saved and logged.

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface Project {
  id: string; name: string; company_name: string | null; problem: string | null;
  desired_outcome: string | null; location: string | null; budget_range: string | null;
  timeline: string | null; priority: string; stage: string; next_action: string | null;
  opportunity_ref: string | null; requirements: Record<string, unknown>; updated_at: string;
}
interface Vendor { id: string; vendor_id: string | null; listing_kind: string | null; listing_id: string | null; source: string; status: string; fit_note: string | null; private_note: string | null }
interface Doc { id: string; kind: string; title: string; external_url: string | null; vendor_id: string | null; note: string | null; created_at: string }
interface Task { id: string; title: string; detail: string | null; due_date: string | null; status: string }
interface Decision { id: string; decision: string; reason: string | null; decided_at: string }
interface Ev { id: string; actor_name: string | null; event: string; detail: Record<string, unknown>; created_at: string }
interface Commission { commission_amount: number | null; effective_rate: number | null; status: string | null }
interface Quote { id: string; public_ref: string; opportunity_ref: string | null; kind: string; company: string | null; quote_amount: number | null; quote_currency: string | null; quote_timeline: string | null; quote_valid_until: string | null; quoted_at: string | null; status: string; buyer_decision: string | null; commission: Commission | null }
interface Approval { id: string; kind: string; status: string; approver_name: string | null; note: string | null; due_date: string | null; decided_at: string | null }
interface Milestone { id: string; kind: string; title: string | null; status: string; due_date: string | null; note: string | null }

const STAGES = ['organizing', 'requirements_ready', 'matching', 'vendors_invited', 'collecting_quotes', 'comparing', 'decision', 'vendor_selected', 'implementation', 'completed'];
const STAGE_LABEL: Record<string, string> = {
  organizing: 'Organizing', requirements_ready: 'Requirements ready', matching: 'Matching vendors',
  vendors_invited: 'Vendors invited', collecting_quotes: 'Collecting quotes', comparing: 'Comparing',
  decision: 'Decision needed', vendor_selected: 'Vendor selected', implementation: 'Implementation',
  completed: 'Completed', archived: 'Archived',
};
const EVENT_LABEL: Record<string, string> = {
  created: 'Project created', updated: 'Details updated', stage_changed: 'Stage changed',
  vendor_saved: 'Vendor shortlisted', task_added: 'Task added', task_done: 'Task completed',
  task_skipped: 'Task skipped', task_open: 'Task reopened', note_added: 'Note added',
  decision_recorded: 'Decision recorded', document_added: 'Document added',
};
const APPROVAL_LABEL: Record<string, string> = { budget: 'Budget approval', safety: 'Safety review', engineering: 'Engineering review', operations: 'Operations review', final_decision: 'Final decision', purchase_order: 'Purchase order', contract: 'Contract' };
const MILESTONE_LABEL: Record<string, string> = { purchase_order: 'Purchase order', production: 'Production', shipping: 'Shipping', delivery: 'Delivery', installation: 'Installation', integration: 'Integration', training: 'Training', testing: 'Testing', acceptance: 'Customer acceptance', warranty_start: 'Warranty start', maintenance: 'Maintenance', issue: 'Issue' };
const fmtDate = (s: string) => { try { return new Date(s).toLocaleDateString(); } catch { return ''; } };
const fmtDT = (s: string) => { try { return new Date(s).toLocaleString(); } catch { return ''; } };
const money = (n: number, c = 'USD') => n.toLocaleString('en-US', { style: 'currency', currency: c || 'USD', maximumFractionDigits: 0 });

export default function ProjectWorkspacePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [tab, setTab] = useState<'overview' | 'quotes' | 'vendors' | 'approvals' | 'delivery' | 'documents' | 'history'>('overview');

  const [project, setProject] = useState<Project | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [events, setEvents] = useState<Ev[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [newApproval, setNewApproval] = useState('budget');
  const [newMilestone, setNewMilestone] = useState('delivery');

  const [newTask, setNewTask] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/projects/${id}`);
      if (r.status === 403) { setDenied(true); setLoading(false); return; }
      const j = await r.json();
      if (j.ok) {
        setProject(j.project); setVendors(j.vendors); setDocs(j.documents);
        setTasks(j.tasks); setDecisions(j.decisions); setEvents(j.events);
        setQuotes(j.quotes || []); setApprovals(j.approvals || []); setMilestones(j.milestones || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  async function patch(fields: Record<string, unknown>) {
    setBusy(true);
    try {
      const r = await fetch(`/api/projects/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields) });
      const j = await r.json();
      if (j.ok) { setProject(j.project); load(); }
    } catch { /* ignore */ }
    setBusy(false);
  }
  async function addItem(payload: Record<string, unknown>) {
    setBusy(true);
    try {
      await fetch(`/api/projects/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      await load();
    } catch { /* ignore */ }
    setBusy(false);
  }

  if (loading) return <div className="pd"><style dangerouslySetInnerHTML={{ __html: CSS }} /><div className="pd-load">Loading your project…</div></div>;
  if (denied) return <div className="pd"><style dangerouslySetInnerHTML={{ __html: CSS }} /><div className="pd-load">You don’t have access to this project. <a href="/projects">Back to workspace</a></div></div>;
  if (!project) return <div className="pd"><style dangerouslySetInnerHTML={{ __html: CSS }} /><div className="pd-load">Project not found. <a href="/projects">Back to workspace</a></div></div>;

  const stageIdx = STAGES.indexOf(project.stage);
  const reqCats = Array.isArray(project.requirements?.category_slugs) ? project.requirements.category_slugs as string[] : [];
  const reqInfo = Array.isArray(project.requirements?.suggested_info) ? project.requirements.suggested_info as string[] : [];
  const openTasks = tasks.filter((t) => t.status === 'open');

  return (
    <div className="pd">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <nav className="pd-nav">
        <a className="pd-brand" href="/projects"><b>NXT<i>//</i>LINK</b><span>Workspace</span></a>
        <a className="pd-pill" href="/projects">← All projects</a>
      </nav>

      <div className="pd-wrap">
        {/* Header */}
        <header className="pd-head">
          <div className="pd-htop">
            <span className={`pd-stage s-${project.stage}`}>{STAGE_LABEL[project.stage] || project.stage}</span>
            {project.opportunity_ref && <span className="pd-ref">{project.opportunity_ref}</span>}
          </div>
          <h1>{project.name}</h1>
          {project.company_name && <div className="pd-co">{project.company_name}</div>}

          {/* Stage pipeline */}
          <div className="pd-pipe">
            {STAGES.map((s, i) => (
              <div key={s} className={`pd-pstep ${i < stageIdx ? 'done' : ''} ${i === stageIdx ? 'now' : ''}`} title={STAGE_LABEL[s]}>
                <i /><span>{STAGE_LABEL[s]}</span>
              </div>
            ))}
          </div>

          {/* Next action — always shown */}
          <div className="pd-next">
            <div className="pd-nextlab">Next action</div>
            <input className="pd-nextinput" defaultValue={project.next_action || ''}
              onBlur={(e) => { if (e.target.value !== (project.next_action || '')) patch({ next_action: e.target.value }); }}
              placeholder="What should happen next?" />
            <div className="pd-stagerow">
              {stageIdx < STAGES.length - 1 && (
                <button className="pd-advance" disabled={busy}
                  onClick={() => patch({ stage: STAGES[stageIdx + 1], next_action: '' })}>
                  Advance to “{STAGE_LABEL[STAGES[stageIdx + 1]]}” →
                </button>
              )}
              <select className="pd-select" value={project.priority} onChange={(e) => patch({ priority: e.target.value })}>
                <option value="low">Low priority</option><option value="medium">Medium priority</option>
                <option value="high">High priority</option><option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
        </header>

        {/* Tabs — the unified Deal Room */}
        <div className="pd-tabs">
          {(['overview', 'quotes', 'vendors', 'approvals', 'delivery', 'documents', 'history'] as const).map((t) => (
            <button key={t} className={`pd-tab ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>
              {t === 'overview' ? 'Overview'
                : t === 'quotes' ? `Quotes (${quotes.length})`
                : t === 'vendors' ? `Vendors (${vendors.length})`
                : t === 'approvals' ? `Approvals (${approvals.length})`
                : t === 'delivery' ? 'Delivery'
                : t === 'documents' ? `Documents (${docs.length})` : 'History'}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div className="pd-panel">
            <div className="pd-cols">
              <div className="pd-field"><label>The problem</label>
                <textarea defaultValue={project.problem || ''} rows={3} onBlur={(e) => patch({ problem: e.target.value })} /></div>
              <div className="pd-field"><label>Desired outcome</label>
                <textarea defaultValue={project.desired_outcome || ''} rows={3} onBlur={(e) => patch({ desired_outcome: e.target.value })} /></div>
            </div>
            <div className="pd-cols3">
              <div className="pd-field"><label>Location</label><input defaultValue={project.location || ''} onBlur={(e) => patch({ location: e.target.value })} /></div>
              <div className="pd-field"><label>Budget</label><input defaultValue={project.budget_range || ''} onBlur={(e) => patch({ budget_range: e.target.value })} placeholder="e.g. $10k–$25k" /></div>
              <div className="pd-field"><label>Timeline</label><input defaultValue={project.timeline || ''} onBlur={(e) => patch({ timeline: e.target.value })} placeholder="e.g. within 30 days" /></div>
            </div>

            {(reqCats.length > 0 || reqInfo.length > 0) && (
              <div className="pd-req">
                {reqCats.length > 0 && <><div className="pd-sublab">Categories</div><div className="pd-chips">{reqCats.map((c) => <span key={c} className="pd-chip">{c.replace(/_/g, ' ')}</span>)}</div></>}
                {reqInfo.length > 0 && <><div className="pd-sublab">To collect for better quotes</div><ul className="pd-ul">{reqInfo.map((s, i) => <li key={i}>{s}</li>)}</ul></>}
              </div>
            )}

            {/* Tasks */}
            <div className="pd-sec">
              <div className="pd-sechead">Next steps {openTasks.length > 0 && <span className="pd-count">{openTasks.length} open</span>}</div>
              <div className="pd-tasks">
                {tasks.map((t) => (
                  <div key={t.id} className={`pd-task ${t.status === 'done' ? 'done' : ''}`}>
                    <button className="pd-check" onClick={() => addItem({ kind: 'task_status', task_id: t.id, status: t.status === 'done' ? 'open' : 'done' })}>
                      {t.status === 'done' ? '✓' : ''}
                    </button>
                    <div className="pd-tasktext"><span>{t.title}</span>{t.due_date && <small>due {fmtDate(t.due_date)}</small>}</div>
                  </div>
                ))}
              </div>
              <div className="pd-addrow">
                <input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Add a next step…"
                  onKeyDown={(e) => { if (e.key === 'Enter' && newTask.trim()) { addItem({ kind: 'task', title: newTask }); setNewTask(''); } }} />
                <button className="pd-mini" disabled={!newTask.trim() || busy} onClick={() => { addItem({ kind: 'task', title: newTask }); setNewTask(''); }}>Add</button>
              </div>
            </div>

            {/* Decisions / notes */}
            <div className="pd-sec">
              <div className="pd-sechead">Notes &amp; decisions</div>
              {decisions.map((d) => (
                <div key={d.id} className="pd-decision"><b>{d.decision}</b>{d.reason && <p>{d.reason}</p>}<small>{fmtDT(d.decided_at)}</small></div>
              ))}
              <div className="pd-addrow">
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Record a note or decision…"
                  onKeyDown={(e) => { if (e.key === 'Enter' && note.trim()) { addItem({ kind: 'note', body: note }); setNote(''); } }} />
                <button className="pd-mini" disabled={!note.trim() || busy} onClick={() => { addItem({ kind: 'note', body: note }); setNote(''); }}>Save</button>
              </div>
            </div>
          </div>
        )}

        {/* VENDORS */}
        {tab === 'vendors' && (
          <div className="pd-panel">
            {vendors.length === 0 ? (
              <div className="pd-empty">
                No vendors shortlisted yet.
                <a className="pd-btn" href="/marketplace">Browse the marketplace →</a>
              </div>
            ) : (
              <div className="pd-vgrid">
                {vendors.map((v) => (
                  <div key={v.id} className="pd-vcard">
                    <div className="pd-vtop"><span className={`pd-vsrc ${v.source}`}>{v.source}</span><span className="pd-vstatus">{v.status}</span></div>
                    <div className="pd-vname">{v.listing_kind ? v.listing_kind : 'Vendor'} · {v.listing_id ? v.listing_id.slice(0, 8) : v.vendor_id?.slice(0, 8)}</div>
                    {v.fit_note && <div className="pd-fit">✓ {v.fit_note}</div>}
                    {v.private_note && <div className="pd-pnote">{v.private_note}</div>}
                  </div>
                ))}
              </div>
            )}
            <p className="pd-hint">Add vendors from the <a href="/marketplace">Marketplace</a> — open a listing and “Save to project”. Inviting a vendor creates a quote request linked to this project.</p>
          </div>
        )}

        {/* QUOTES — the received proposals + NXT Link commission status */}
        {tab === 'quotes' && (
          <div className="pd-panel">
            {quotes.length === 0 ? (
              <div className="pd-empty">No quotes yet. Invite vendors from your shortlist and their proposals land here — with versions and expiry.</div>
            ) : (
              <div className="pd-quotes">
                {quotes.map((q) => (
                  <div key={q.id} className="pd-quote">
                    <div className="pd-qtop">
                      <div><b>{q.company || 'Vendor'}</b><span className="pd-ref">{q.opportunity_ref || q.public_ref}</span></div>
                      <span className={`pd-qstat ${q.buyer_decision === 'accepted' ? 'accepted' : q.quote_amount ? 'quoted' : 'await'}`}>
                        {q.buyer_decision === 'accepted' ? 'Accepted' : q.quote_amount ? 'Quote received' : 'Awaiting quote'}
                      </span>
                    </div>
                    {q.quote_amount != null && (
                      <div className="pd-qamt">{money(q.quote_amount, q.quote_currency || 'USD')}
                        {q.quote_timeline && <small> · {q.quote_timeline}</small>}
                        {q.quote_valid_until && <small> · valid to {fmtDate(q.quote_valid_until)}</small>}
                      </div>
                    )}
                    {q.commission && q.commission.commission_amount != null && (
                      <div className="pd-comm">NXT//LINK fee if won: {money(q.commission.commission_amount)} ({((q.commission.effective_rate || 0) * 100).toFixed(1)}%) · {q.commission.status}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* APPROVALS — team sign-offs */}
        {tab === 'approvals' && (
          <div className="pd-panel">
            {approvals.length === 0 ? (
              <div className="pd-empty">No approvals requested yet. Add the sign-offs your purchase needs — budget, safety, engineering, final decision.</div>
            ) : (
              <div className="pd-apps">
                {approvals.map((a) => (
                  <div key={a.id} className={`pd-app ${a.status}`}>
                    <div className="pd-appmain">
                      <div className="pd-appname">{APPROVAL_LABEL[a.kind] || a.kind}</div>
                      <div className="pd-appmeta">{a.approver_name ? `${a.approver_name} · ` : ''}{a.status}{a.due_date ? ` · due ${fmtDate(a.due_date)}` : ''}{a.decided_at ? ` · ${fmtDate(a.decided_at)}` : ''}</div>
                    </div>
                    {a.status === 'pending' ? (
                      <div className="pd-appacts">
                        <button className="pd-ok" onClick={() => addItem({ kind: 'approval_decision', approval_id: a.id, status: 'approved' })}>Approve</button>
                        <button className="pd-no" onClick={() => addItem({ kind: 'approval_decision', approval_id: a.id, status: 'rejected' })}>Reject</button>
                      </div>
                    ) : <span className={`pd-appbadge ${a.status}`}>{a.status}</span>}
                  </div>
                ))}
              </div>
            )}
            <div className="pd-addrow">
              <select value={newApproval} onChange={(e) => setNewApproval(e.target.value)} className="pd-selectfull">
                {Object.entries(APPROVAL_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <button className="pd-mini" disabled={busy} onClick={() => addItem({ kind: 'approval', approval_kind: newApproval })}>Request approval</button>
            </div>
          </div>
        )}

        {/* DELIVERY — after-sale execution milestones */}
        {tab === 'delivery' && (
          <div className="pd-panel">
            {milestones.length === 0 ? (
              <div className="pd-empty">Track the after-sale steps here once a vendor is selected: PO, delivery, installation, training, testing, acceptance, warranty.</div>
            ) : (
              <div className="pd-tasks">
                {milestones.map((m) => (
                  <div key={m.id} className={`pd-task ${m.status === 'done' ? 'done' : ''}`}>
                    <button className="pd-check" onClick={() => addItem({ kind: 'milestone_status', milestone_id: m.id, status: m.status === 'done' ? 'pending' : 'done' })}>{m.status === 'done' ? '✓' : ''}</button>
                    <div className="pd-tasktext"><span>{MILESTONE_LABEL[m.kind] || m.kind}{m.title ? ` — ${m.title}` : ''}</span>
                      <small>{m.status}{m.due_date ? ` · due ${fmtDate(m.due_date)}` : ''}</small></div>
                  </div>
                ))}
              </div>
            )}
            <div className="pd-addrow">
              <select value={newMilestone} onChange={(e) => setNewMilestone(e.target.value)} className="pd-selectfull">
                {Object.entries(MILESTONE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <button className="pd-mini" disabled={busy} onClick={() => addItem({ kind: 'milestone', milestone_kind: newMilestone })}>Add step</button>
            </div>
          </div>
        )}

        {/* DOCUMENTS */}
        {tab === 'documents' && (
          <div className="pd-panel">
            {docs.length === 0 ? <div className="pd-empty">No documents yet. Add quotes, drawings, contracts, or warranties so nothing lives in email.</div> : (
              <div className="pd-docs">
                {docs.map((d) => (
                  <div key={d.id} className="pd-doc">
                    <span className="pd-dkind">{d.kind.replace(/_/g, ' ')}</span>
                    <div className="pd-dtitle">{d.external_url ? <a href={d.external_url} target="_blank" rel="noopener noreferrer">{d.title}</a> : d.title}</div>
                    <small>{fmtDate(d.created_at)}</small>
                  </div>
                ))}
              </div>
            )}
            <div className="pd-addrow col">
              <input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder="Document title (e.g. Vendor A quote v1)" />
              <input value={docUrl} onChange={(e) => setDocUrl(e.target.value)} placeholder="Link (optional)" />
              <button className="pd-mini" disabled={!docTitle.trim() || busy} onClick={() => { addItem({ kind: 'document', title: docTitle, external_url: docUrl, doc_kind: 'other' }); setDocTitle(''); setDocUrl(''); }}>Add document</button>
            </div>
          </div>
        )}

        {/* HISTORY */}
        {tab === 'history' && (
          <div className="pd-panel">
            <div className="pd-timeline">
              {events.map((e) => (
                <div key={e.id} className="pd-ev">
                  <div className="pd-evdot" />
                  <div className="pd-evbody">
                    <div className="pd-evtitle">{EVENT_LABEL[e.event] || e.event}</div>
                    {e.detail && Object.keys(e.detail).length > 0 && <div className="pd-evdetail">{Object.entries(e.detail).map(([k, val]) => `${k}: ${String(val)}`).join(' · ')}</div>}
                    <div className="pd-evmeta">{e.actor_name || 'Someone'} · {fmtDT(e.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const CSS = `
.pd{min-height:100vh;background:#0A0A0F;color:#F0F0F5;font-family:'Outfit',system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;}
.pd *{box-sizing:border-box;}
.pd-load{max-width:600px;margin:80px auto;text-align:center;color:#8080A0;padding:0 20px;}
.pd-load a{color:#A78BFA;}
.pd-nav{display:flex;justify-content:space-between;align-items:center;padding:14px 26px;border-bottom:1px solid rgba(255,255,255,.08);position:sticky;top:0;background:rgba(10,10,15,.9);backdrop-filter:blur(20px);z-index:30;}
.pd-brand{display:flex;align-items:baseline;gap:10px;color:#F0F0F5;text-decoration:none;}
.pd-brand b{font-size:17px;}.pd-brand i{color:#A78BFA;font-style:normal;}.pd-brand span{color:#8080A0;font-size:13px;}
.pd-pill{font-size:13px;font-weight:500;color:#C0C0D0;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:99px;padding:8px 14px;text-decoration:none;}
.pd-wrap{max-width:900px;margin:0 auto;padding:28px 20px 100px;}
.pd-head{border-bottom:1px solid rgba(255,255,255,.08);padding-bottom:22px;}
.pd-htop{display:flex;align-items:center;gap:10px;}
.pd-stage{font-size:11.5px;font-weight:700;padding:4px 11px;border-radius:99px;background:rgba(124,92,252,.14);color:#C4B5FD;}
.pd-stage.s-completed{background:rgba(52,211,153,.14);color:#34D399;}
.pd-stage.s-decision{background:rgba(251,191,36,.14);color:#FBBF24;}
.pd-ref{font-size:12px;color:#8080A0;font-variant-numeric:tabular-nums;}
.pd-head h1{font-size:clamp(22px,3.5vw,30px);font-weight:800;letter-spacing:-.02em;margin:12px 0 0;}
.pd-co{color:#8080A0;font-size:14px;margin-top:4px;}
.pd-pipe{display:flex;gap:4px;margin:20px 0 0;overflow-x:auto;padding-bottom:4px;}
.pd-pstep{flex:1;min-width:70px;display:flex;flex-direction:column;gap:6px;}
.pd-pstep i{height:4px;border-radius:99px;background:#1F1F2C;}
.pd-pstep.done i{background:#7C5CFC;}
.pd-pstep.now i{background:linear-gradient(90deg,#7C5CFC,#34D399);box-shadow:0 0 12px rgba(124,92,252,.5);}
.pd-pstep span{font-size:9.5px;color:#5A5A70;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pd-pstep.now span{color:#C4B5FD;font-weight:600;}
.pd-pstep.done span{color:#8080A0;}
.pd-next{background:#12121B;border:1px solid rgba(124,92,252,.25);border-radius:14px;padding:15px;margin-top:20px;}
.pd-nextlab{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#A78BFA;margin-bottom:8px;}
.pd-nextinput{width:100%;font-family:inherit;font-size:15px;font-weight:600;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:#0A0A0F;color:#F0F0F5;outline:none;}
.pd-nextinput:focus{border-color:#7C5CFC;}
.pd-stagerow{display:flex;gap:10px;margin-top:11px;flex-wrap:wrap;}
.pd-advance{font-family:inherit;font-size:13px;font-weight:700;padding:10px 16px;border-radius:10px;border:none;background:#7C5CFC;color:#fff;cursor:pointer;}
.pd-advance:hover{background:#6344DF;}.pd-advance:disabled{opacity:.5;}
.pd-select{font-family:inherit;font-size:13px;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:#14141F;color:#C0C0D0;cursor:pointer;outline:none;}
.pd-tabs{display:flex;gap:4px;margin:22px 0 18px;border-bottom:1px solid rgba(255,255,255,.08);overflow-x:auto;}
.pd-tab{font-family:inherit;font-size:13.5px;font-weight:600;padding:11px 16px;background:none;border:none;border-bottom:2px solid transparent;color:#8080A0;cursor:pointer;white-space:nowrap;}
.pd-tab.on{color:#F0F0F5;border-bottom-color:#7C5CFC;}
.pd-cols{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.pd-cols3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-top:14px;}
@media(max-width:640px){.pd-cols,.pd-cols3{grid-template-columns:1fr;}}
.pd-field label{display:block;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#8080A0;margin-bottom:6px;}
.pd-field input,.pd-field textarea{width:100%;font-family:inherit;font-size:14px;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:#12121B;color:#F0F0F5;outline:none;resize:vertical;line-height:1.5;}
.pd-field input:focus,.pd-field textarea:focus{border-color:#7C5CFC;}
.pd-req{margin-top:18px;background:#12121B;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:14px;}
.pd-sublab{font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#8080A0;margin:0 0 8px;}
.pd-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;}
.pd-chip{font-size:12px;font-weight:600;padding:5px 10px;border-radius:99px;background:rgba(124,92,252,.12);color:#C4B5FD;text-transform:capitalize;}
.pd-ul{margin:0;padding-left:18px;color:#B8B6CC;font-size:13px;line-height:1.7;}
.pd-sec{margin-top:24px;}
.pd-sechead{font-size:14px;font-weight:800;margin-bottom:12px;display:flex;align-items:center;gap:9px;}
.pd-count{font-size:11px;font-weight:600;color:#C4B5FD;background:rgba(124,92,252,.12);padding:3px 9px;border-radius:99px;}
.pd-tasks{display:flex;flex-direction:column;gap:7px;}
.pd-task{display:flex;align-items:center;gap:10px;background:#12121B;border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:10px 12px;}
.pd-task.done .pd-tasktext span{text-decoration:line-through;color:#5A5A70;}
.pd-check{width:20px;height:20px;border-radius:6px;border:1.5px solid rgba(255,255,255,.2);background:none;color:#34D399;font-size:12px;cursor:pointer;flex-shrink:0;display:grid;place-items:center;}
.pd-task.done .pd-check{background:rgba(52,211,153,.15);border-color:transparent;}
.pd-tasktext{display:flex;flex-direction:column;gap:2px;font-size:13.5px;}
.pd-tasktext small{color:#8080A0;font-size:11px;}
.pd-addrow{display:flex;gap:8px;margin-top:10px;}
.pd-addrow.col{flex-direction:column;}
.pd-addrow input{flex:1;font-family:inherit;font-size:13.5px;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:#0A0A0F;color:#F0F0F5;outline:none;}
.pd-addrow input:focus{border-color:#7C5CFC;}
.pd-mini{font-family:inherit;font-size:13px;font-weight:700;padding:10px 16px;border-radius:10px;border:none;background:rgba(124,92,252,.15);color:#C4B5FD;cursor:pointer;white-space:nowrap;}
.pd-mini:hover:not(:disabled){background:rgba(124,92,252,.28);}.pd-mini:disabled{opacity:.4;}
.pd-decision{background:#12121B;border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:11px 13px;margin-bottom:8px;}
.pd-decision b{font-size:13.5px;}.pd-decision p{margin:5px 0 0;font-size:12.5px;color:#B8B6CC;line-height:1.5;}
.pd-decision small{display:block;margin-top:6px;font-size:11px;color:#5A5A70;}
.pd-empty{text-align:center;color:#8080A0;font-size:14px;padding:34px 0;display:flex;flex-direction:column;gap:14px;align-items:center;}
.pd-btn{font-size:13px;font-weight:700;padding:11px 18px;border-radius:11px;background:#7C5CFC;color:#fff;text-decoration:none;}
.pd-vgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;}
.pd-vcard{background:#14141F;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:13px;}
.pd-vtop{display:flex;justify-content:space-between;align-items:center;}
.pd-vsrc{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:3px 8px;border-radius:99px;background:rgba(255,255,255,.06);color:#8080A0;}
.pd-vsrc.invited{background:rgba(124,92,252,.14);color:#C4B5FD;}
.pd-vsrc.recommended{background:rgba(52,211,153,.12);color:#34D399;}
.pd-vstatus{font-size:11px;color:#8080A0;text-transform:capitalize;}
.pd-vname{font-size:13.5px;font-weight:700;margin-top:9px;text-transform:capitalize;}
.pd-fit{font-size:12px;color:#34D399;margin-top:7px;line-height:1.4;}
.pd-pnote{font-size:12px;color:#B8B6CC;margin-top:6px;line-height:1.4;}
.pd-hint{font-size:12.5px;color:#8080A0;margin-top:16px;line-height:1.6;}
.pd-hint a{color:#A78BFA;}
.pd-docs{display:flex;flex-direction:column;gap:8px;margin-bottom:16px;}
.pd-doc{display:flex;align-items:center;gap:12px;background:#12121B;border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:11px 13px;}
.pd-dkind{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#C4B5FD;background:rgba(124,92,252,.12);padding:4px 9px;border-radius:6px;white-space:nowrap;}
.pd-dtitle{flex:1;font-size:13.5px;font-weight:600;}
.pd-dtitle a{color:#A78BFA;text-decoration:none;}.pd-dtitle a:hover{text-decoration:underline;}
.pd-doc small{color:#5A5A70;font-size:11px;}
.pd-timeline{display:flex;flex-direction:column;gap:0;}
.pd-ev{display:flex;gap:12px;padding-bottom:16px;position:relative;}
.pd-ev:not(:last-child)::before{content:'';position:absolute;left:5px;top:14px;bottom:0;width:1px;background:rgba(255,255,255,.1);}
.pd-evdot{width:11px;height:11px;border-radius:50%;background:#7C5CFC;flex-shrink:0;margin-top:3px;box-shadow:0 0 0 3px rgba(124,92,252,.15);}
.pd-evtitle{font-size:13.5px;font-weight:700;}
.pd-evdetail{font-size:12px;color:#B8B6CC;margin-top:2px;}
.pd-evmeta{font-size:11px;color:#5A5A70;margin-top:3px;}
.pd-quotes{display:flex;flex-direction:column;gap:11px;}
.pd-quote{background:#14141F;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:14px;}
.pd-qtop{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;}
.pd-qtop b{font-size:14px;}
.pd-qtop .pd-ref{margin-left:8px;font-size:11px;color:#8080A0;}
.pd-qstat{font-size:11px;font-weight:700;padding:4px 10px;border-radius:99px;white-space:nowrap;}
.pd-qstat.accepted{background:rgba(52,211,153,.14);color:#34D399;}
.pd-qstat.quoted{background:rgba(124,92,252,.14);color:#C4B5FD;}
.pd-qstat.await{background:rgba(251,191,36,.12);color:#FBBF24;}
.pd-qamt{font-size:17px;font-weight:800;margin-top:9px;font-variant-numeric:tabular-nums;}
.pd-qamt small{font-size:12px;font-weight:500;color:#8080A0;}
.pd-comm{font-size:12px;color:#C4B5FD;background:rgba(124,92,252,.08);border-radius:8px;padding:8px 10px;margin-top:9px;}
.pd-apps{display:flex;flex-direction:column;gap:8px;}
.pd-app{display:flex;justify-content:space-between;align-items:center;gap:12px;background:#12121B;border:1px solid rgba(255,255,255,.08);border-radius:11px;padding:12px 14px;}
.pd-app.approved{border-color:rgba(52,211,153,.3);}
.pd-app.rejected{border-color:rgba(248,113,113,.3);}
.pd-appname{font-size:13.5px;font-weight:700;}
.pd-appmeta{font-size:11.5px;color:#8080A0;margin-top:3px;text-transform:capitalize;}
.pd-appacts{display:flex;gap:7px;}
.pd-ok,.pd-no{font-family:inherit;font-size:12px;font-weight:700;padding:7px 13px;border-radius:8px;border:none;cursor:pointer;}
.pd-ok{background:rgba(52,211,153,.15);color:#34D399;}
.pd-no{background:rgba(248,113,113,.12);color:#FCA5A5;}
.pd-appbadge{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:4px 10px;border-radius:99px;}
.pd-appbadge.approved{background:rgba(52,211,153,.14);color:#34D399;}
.pd-appbadge.rejected{background:rgba(248,113,113,.14);color:#FCA5A5;}
.pd-appbadge.skipped{background:rgba(255,255,255,.06);color:#8080A0;}
.pd-selectfull{flex:1;font-family:inherit;font-size:13px;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:#14141F;color:#C0C0D0;cursor:pointer;outline:none;}
`;
