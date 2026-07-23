'use client';

// /projects/[id] — the project workspace. One screen answers "where is
// everything?": stage + next action up top, then Overview, Vendors (shortlist),
// Documents, and an append-only History timeline. Buyer edits inline; every
// change is saved and logged.

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { IBM_Plex_Sans } from 'next/font/google';
import { StageTracker, STAGE_TRACKER_CSS } from '@/components/marketplace/StageTracker';
import { EmptyAction, EMPTY_ACTION_CSS } from '@/components/marketplace/EmptyAction';

// Design System v1.0 reskin (Premium Polish Phase 2, 2026-07-23): visual/CSS
// only — every handler and state above is unchanged. The soft-blue best-value
// fill-bar color (#3B6EA5, per vault/Decisions.md) is intentionally preserved.
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans-pd',
  display: 'swap',
});

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
// Parse a free-text timeline ("2 weeks", "6 wks", "10 days", "3 months") into days,
// so the compare table can draw a length-proportional bar. Returns null if unparseable.
const parseDays = (s: string | null | undefined): number | null => {
  if (!s) return null;
  const m = s.match(/(\d+(?:\.\d+)?)\s*(days?|d|weeks?|wks?|w|months?|mos?|mo|m)\b/i);
  if (!m) return null;
  const n = parseFloat(m[1]); const u = m[2].toLowerCase();
  if (u.startsWith('d')) return n;
  if (u.startsWith('w')) return n * 7;
  return n * 30; // month(s)
};

export default function ProjectWorkspacePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [tab, setTab] = useState<'overview' | 'quotes' | 'vendors' | 'approvals' | 'delivery' | 'documents' | 'history'>('overview');
  const [qSort, setQSort] = useState<'price_asc' | 'price_desc' | 'name'>('price_asc');

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

  if (loading) return <div className={`pd ${ibmPlexSans.variable}`}><style dangerouslySetInnerHTML={{ __html: CSS }} /><div className="pd-load">Loading your project…</div></div>;
  if (denied) return <div className={`pd ${ibmPlexSans.variable}`}><style dangerouslySetInnerHTML={{ __html: CSS }} /><div className="pd-load">You don’t have access to this project. <a href="/projects">Back to workspace</a></div></div>;
  if (!project) return <div className={`pd ${ibmPlexSans.variable}`}><style dangerouslySetInnerHTML={{ __html: CSS }} /><div className="pd-load">Project not found. <a href="/projects">Back to workspace</a></div></div>;

  const stageIdx = STAGES.indexOf(project.stage);
  const reqCats = Array.isArray(project.requirements?.category_slugs) ? project.requirements.category_slugs as string[] : [];
  const reqInfo = Array.isArray(project.requirements?.suggested_info) ? project.requirements.suggested_info as string[] : [];
  const openTasks = tasks.filter((t) => t.status === 'open');

  return (
    <div className={`pd ${ibmPlexSans.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS + STAGE_TRACKER_CSS + EMPTY_ACTION_CSS }} />
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
            <StageTracker stages={STAGES.map((s) => ({ key: s, label: STAGE_LABEL[s] || s }))} current={project.stage} />
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
              <EmptyAction
                title="No quotes yet"
                hint="Invite vendors from your shortlist and their proposals land here — with versions and expiry."
                actionLabel="Invite vendors"
                onAction={() => setTab('vendors')}
                secondaryLabel="Browse marketplace"
                secondaryHref="/marketplace"
              />
            ) : (
              <>
              {quotes.filter((q) => q.quote_amount != null).length >= 2 && (() => {
                const rows = [...quotes].sort((a, b) => {
                  const pa = a.quote_amount ?? Number.POSITIVE_INFINITY;
                  const pb = b.quote_amount ?? Number.POSITIVE_INFINITY;
                  if (qSort === 'price_asc') return pa - pb;
                  if (qSort === 'price_desc') return pb - pa;
                  return (a.company || '').localeCompare(b.company || '');
                });
                const priced = rows.filter((q) => q.quote_amount != null);
                const low = Math.min(...priced.map((q) => q.quote_amount as number));
                const maxPrice = Math.max(...priced.map((q) => q.quote_amount as number));
                const dayVals = rows.map((q) => parseDays(q.quote_timeline)).filter((n): n is number => n != null);
                const maxDays = dayVals.length ? Math.max(...dayVals) : 0;
                const minDays = dayVals.length ? Math.min(...dayVals) : 0;
                return (
                  <div className="pd-cmpwrap">
                    <div className="pd-cmphead">
                      <b>Compare quotes</b>
                      <div className="pd-sort">
                        <span>Sort</span>
                        <button className={qSort === 'price_asc' ? 'on' : ''} onClick={() => setQSort('price_asc')}>Price ↑</button>
                        <button className={qSort === 'price_desc' ? 'on' : ''} onClick={() => setQSort('price_desc')}>Price ↓</button>
                        <button className={qSort === 'name' ? 'on' : ''} onClick={() => setQSort('name')}>A–Z</button>
                      </div>
                    </div>
                    <div className="pd-cmpscroll">
                      <table className="pd-cmp">
                        <thead><tr><th>Vendor</th><th>Quote</th><th>Timeline</th><th>Valid until</th><th>Fee if won</th><th>Status</th></tr></thead>
                        <tbody>
                          {rows.map((q) => (
                            <tr key={q.id} className={q.buyer_decision === 'accepted' ? 'accepted' : ''}>
                              <td><b>{q.company || 'Vendor'}</b><span className="pd-cmpref">{q.opportunity_ref || q.public_ref}</span></td>
                              <td className="pd-cmpamt">
                                <div className="pd-cmpval">
                                  {q.quote_amount != null ? money(q.quote_amount, q.quote_currency || 'USD') : <span className="pd-cmpwait">Awaiting</span>}
                                  {q.quote_amount != null && q.quote_amount === low && <span className="pd-lowest">Lowest</span>}
                                </div>
                                {q.quote_amount != null && maxPrice > 0 && (
                                  <div className="pd-bar"><i className={q.quote_amount === low ? 'best' : ''} style={{ width: `${Math.max(6, (q.quote_amount / maxPrice) * 100)}%` }} /></div>
                                )}
                              </td>
                              <td>
                                <div className="pd-cmpval">{q.quote_timeline || '—'}</div>
                                {(() => { const d = parseDays(q.quote_timeline); return d != null && maxDays > 0 ? (
                                  <div className="pd-bar"><i className={d === minDays ? 'best' : ''} style={{ width: `${Math.max(6, (d / maxDays) * 100)}%` }} /></div>
                                ) : null; })()}
                              </td>
                              <td>{q.quote_valid_until ? fmtDate(q.quote_valid_until) : '—'}</td>
                              <td className="pd-cmpfee">{q.commission?.commission_amount != null ? money(q.commission.commission_amount) : '—'}</td>
                              <td><span className={`pd-qstat ${q.buyer_decision === 'accepted' ? 'accepted' : q.quote_amount ? 'quoted' : 'await'}`}>{q.buyer_decision === 'accepted' ? 'Accepted' : q.quote_amount ? 'Received' : 'Awaiting'}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="pd-cmpnote">Lowest price isn’t always the best value — weigh timeline, warranty, and fit. The NXT//LINK fee is shown so you see your all-in cost.</p>
                  </div>
                );
              })()}
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
              </>
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
.pd{min-height:100vh;background:var(--spec-warm-white,#F8F7FB);color:var(--spec-ink,#141320);font-family:var(--font-ibm-plex-sans-pd),'IBM Plex Sans',system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;}
.pd *{box-sizing:border-box;}
.pd a:focus-visible,.pd button:focus-visible,.pd input:focus-visible,.pd select:focus-visible,.pd textarea:focus-visible{outline:2px solid var(--spec-violet,#6C5CE0);outline-offset:2px;}
.pd-load{max-width:600px;margin:80px auto;text-align:center;color:var(--spec-text-2nd,#615F72);padding:0 20px;}
.pd-load a{color:var(--spec-violet-deep,#4A3DB0);}
.pd-nav{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;row-gap:8px;padding:14px 26px;border-bottom:1px solid var(--spec-border,#E2DFEC);position:sticky;top:0;background:rgba(248,247,251,.92);backdrop-filter:blur(20px);z-index:30;}
.pd-brand{display:flex;align-items:baseline;gap:10px;color:var(--spec-ink,#141320);text-decoration:none;}
.pd-brand b{font-family:var(--font-space-grotesk),'Space Grotesk',sans-serif;font-size:17px;font-weight:700;}.pd-brand i{color:var(--spec-violet,#6C5CE0);font-style:normal;}.pd-brand span{color:var(--spec-text-2nd,#615F72);font-size:13px;}
.pd-pill{font-size:13px;font-weight:500;color:var(--spec-ink,#141320);background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:99px;padding:8px 14px;text-decoration:none;}
.pd-wrap{max-width:900px;margin:0 auto;padding:28px 20px 100px;}
.pd-head{border-bottom:1px solid var(--spec-border,#E2DFEC);padding-bottom:22px;}
.pd-htop{display:flex;align-items:center;gap:10px;}
.pd-stage{font-size:11.5px;font-weight:700;padding:4px 11px;border-radius:99px;background:rgba(108,92,224,.1);color:var(--spec-violet-deep,#4A3DB0);}
.pd-stage.s-completed{background:#E9F7F0;color:#1F7A54;}
.pd-stage.s-decision{background:#FBF3E7;color:var(--spec-warning,#C68A28);}
.pd-ref{font-size:12px;color:var(--spec-text-2nd,#615F72);font-variant-numeric:tabular-nums;}
.pd-head h1{font-family:var(--font-space-grotesk),'Space Grotesk',sans-serif;font-size:clamp(22px,3.5vw,30px);font-weight:700;letter-spacing:-.01em;margin:12px 0 0;}
.pd-co{color:var(--spec-text-2nd,#615F72);font-size:14px;margin-top:4px;}
.pd-pipe{margin:20px 0 0;}
.pd-next{background:var(--spec-surface,#EFEDF5);border:1px solid rgba(108,92,224,.22);border-radius:14px;padding:15px;margin-top:20px;}
.pd-nextlab{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--spec-violet-deep,#4A3DB0);margin-bottom:8px;}
.pd-nextinput{width:100%;font-family:inherit;font-size:15px;font-weight:600;padding:10px 12px;border-radius:10px;border:1px solid var(--spec-border,#E2DFEC);background:#fff;color:var(--spec-ink,#141320);outline:none;}
.pd-nextinput:focus{border-color:var(--spec-violet,#6C5CE0);}
.pd-stagerow{display:flex;gap:10px;margin-top:11px;flex-wrap:wrap;}
.pd-advance{font-family:inherit;font-size:13px;font-weight:700;padding:10px 16px;border-radius:10px;border:none;background:var(--spec-violet,#6C5CE0);color:#fff;cursor:pointer;}
.pd-advance:hover{background:var(--spec-violet-deep,#4A3DB0);}.pd-advance:disabled{opacity:.5;}
.pd-select{font-family:inherit;font-size:13px;padding:10px 12px;border-radius:10px;border:1px solid var(--spec-border,#E2DFEC);background:#fff;color:var(--spec-ink,#141320);cursor:pointer;outline:none;}
.pd-tabs{display:flex;gap:4px;margin:22px 0 18px;border-bottom:1px solid var(--spec-border,#E2DFEC);overflow-x:auto;}
.pd-tab{font-family:inherit;font-size:13.5px;font-weight:600;padding:11px 16px;background:none;border:none;border-bottom:2px solid transparent;color:var(--spec-text-2nd,#615F72);cursor:pointer;white-space:nowrap;}
.pd-tab.on{color:var(--spec-ink,#141320);border-bottom-color:var(--spec-violet,#6C5CE0);}
.pd-cols{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.pd-cols3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-top:14px;}
@media(max-width:640px){.pd-cols,.pd-cols3{grid-template-columns:1fr;}}
.pd-field label{display:block;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--spec-text-2nd,#615F72);margin-bottom:6px;}
.pd-field input,.pd-field textarea{width:100%;font-family:inherit;font-size:14px;padding:10px 12px;border-radius:10px;border:1px solid var(--spec-border,#E2DFEC);background:#fff;color:var(--spec-ink,#141320);outline:none;resize:vertical;line-height:1.5;}
.pd-field input:focus,.pd-field textarea:focus{border-color:var(--spec-violet,#6C5CE0);box-shadow:0 0 0 3px rgba(108,92,224,.12);}
.pd-req{margin-top:18px;background:var(--spec-surface,#EFEDF5);border:1px solid var(--spec-border,#E2DFEC);border-radius:12px;padding:14px;}
.pd-sublab{font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--spec-text-2nd,#615F72);margin:0 0 8px;}
.pd-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;}
.pd-chip{font-size:12px;font-weight:600;padding:5px 10px;border-radius:99px;background:rgba(108,92,224,.1);color:var(--spec-violet-deep,#4A3DB0);text-transform:capitalize;}
.pd-ul{margin:0;padding-left:18px;color:var(--spec-text-2nd,#615F72);font-size:13px;line-height:1.7;}
.pd-sec{margin-top:24px;}
.pd-sechead{font-size:14px;font-weight:800;margin-bottom:12px;display:flex;align-items:center;gap:9px;}
.pd-count{font-size:11px;font-weight:600;color:var(--spec-violet-deep,#4A3DB0);background:rgba(108,92,224,.1);padding:3px 9px;border-radius:99px;}
.pd-tasks{display:flex;flex-direction:column;gap:7px;}
.pd-task{display:flex;align-items:center;gap:10px;background:var(--spec-surface,#EFEDF5);border:1px solid var(--spec-border,#E2DFEC);border-radius:10px;padding:10px 12px;}
.pd-task.done .pd-tasktext span{text-decoration:line-through;color:#8A87A0;}
.pd-check{width:20px;height:20px;border-radius:6px;border:1.5px solid var(--spec-border,#E2DFEC);background:#fff;color:var(--spec-success,#2F9E6A);font-size:12px;cursor:pointer;flex-shrink:0;display:grid;place-items:center;}
.pd-task.done .pd-check{background:#E9F7F0;border-color:transparent;}
.pd-tasktext{display:flex;flex-direction:column;gap:2px;font-size:13.5px;}
.pd-tasktext small{color:var(--spec-text-2nd,#615F72);font-size:11px;}
.pd-addrow{display:flex;gap:8px;margin-top:10px;}
.pd-addrow.col{flex-direction:column;}
.pd-addrow input{flex:1;font-family:inherit;font-size:13.5px;padding:10px 12px;border-radius:10px;border:1px solid var(--spec-border,#E2DFEC);background:#fff;color:var(--spec-ink,#141320);outline:none;}
.pd-addrow input:focus{border-color:var(--spec-violet,#6C5CE0);}
.pd-mini{font-family:inherit;font-size:13px;font-weight:700;padding:10px 16px;border-radius:10px;border:none;background:rgba(108,92,224,.1);color:var(--spec-violet-deep,#4A3DB0);cursor:pointer;white-space:nowrap;}
.pd-mini:hover:not(:disabled){background:rgba(108,92,224,.18);}.pd-mini:disabled{opacity:.4;}
.pd-decision{background:var(--spec-surface,#EFEDF5);border:1px solid var(--spec-border,#E2DFEC);border-radius:10px;padding:11px 13px;margin-bottom:8px;}
.pd-decision b{font-size:13.5px;}.pd-decision p{margin:5px 0 0;font-size:12.5px;color:var(--spec-text-2nd,#615F72);line-height:1.5;}
.pd-decision small{display:block;margin-top:6px;font-size:11px;color:#8A87A0;}
.pd-empty{text-align:center;color:var(--spec-text-2nd,#615F72);font-size:14px;padding:34px 0;display:flex;flex-direction:column;gap:14px;align-items:center;}
.pd-btn{font-size:13px;font-weight:700;padding:11px 18px;border-radius:10px;background:var(--spec-violet,#6C5CE0);color:#fff;text-decoration:none;}
.pd-vgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;}
.pd-vcard{background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:12px;padding:13px;}
.pd-vtop{display:flex;justify-content:space-between;align-items:center;}
.pd-vsrc{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:3px 8px;border-radius:99px;background:var(--spec-surface,#EFEDF5);color:var(--spec-text-2nd,#615F72);}
.pd-vsrc.invited{background:rgba(108,92,224,.1);color:var(--spec-violet-deep,#4A3DB0);}
.pd-vsrc.recommended{background:#E9F7F0;color:#1F7A54;}
.pd-vstatus{font-size:11px;color:var(--spec-text-2nd,#615F72);text-transform:capitalize;}
.pd-vname{font-size:13.5px;font-weight:700;margin-top:9px;text-transform:capitalize;}
.pd-fit{font-size:12px;color:var(--spec-success,#2F9E6A);margin-top:7px;line-height:1.4;}
.pd-pnote{font-size:12px;color:var(--spec-text-2nd,#615F72);margin-top:6px;line-height:1.4;}
.pd-hint{font-size:12.5px;color:var(--spec-text-2nd,#615F72);margin-top:16px;line-height:1.6;}
.pd-hint a{color:var(--spec-violet-deep,#4A3DB0);}
.pd-docs{display:flex;flex-direction:column;gap:8px;margin-bottom:16px;}
.pd-doc{display:flex;align-items:center;gap:12px;background:var(--spec-surface,#EFEDF5);border:1px solid var(--spec-border,#E2DFEC);border-radius:10px;padding:11px 13px;}
.pd-dkind{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--spec-violet-deep,#4A3DB0);background:rgba(108,92,224,.1);padding:4px 9px;border-radius:6px;white-space:nowrap;}
.pd-dtitle{flex:1;font-size:13.5px;font-weight:600;}
.pd-dtitle a{color:var(--spec-violet-deep,#4A3DB0);text-decoration:none;}.pd-dtitle a:hover{text-decoration:underline;}
.pd-doc small{color:#8A87A0;font-size:11px;}
.pd-timeline{display:flex;flex-direction:column;gap:0;}
.pd-ev{display:flex;gap:12px;padding-bottom:16px;position:relative;}
.pd-ev:not(:last-child)::before{content:'';position:absolute;left:5px;top:14px;bottom:0;width:1px;background:var(--spec-border,#E2DFEC);}
.pd-evdot{width:11px;height:11px;border-radius:50%;background:var(--spec-violet,#6C5CE0);flex-shrink:0;margin-top:3px;box-shadow:0 0 0 3px rgba(108,92,224,.15);}
.pd-evtitle{font-size:13.5px;font-weight:700;}
.pd-evdetail{font-size:12px;color:var(--spec-text-2nd,#615F72);margin-top:2px;}
.pd-evmeta{font-size:11px;color:#8A87A0;margin-top:3px;}
.pd-cmpwrap{background:#fff;border:1px solid rgba(108,92,224,.25);border-radius:14px;padding:16px 18px;margin-bottom:16px;}
.pd-cmphead{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px;}
.pd-cmphead b{font-size:15px;font-weight:800;}
.pd-sort{display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--spec-text-2nd,#615F72);}
.pd-sort button{font-family:inherit;font-size:11.5px;font-weight:600;color:var(--spec-ink,#141320);background:var(--spec-surface,#EFEDF5);border:1px solid var(--spec-border,#E2DFEC);border-radius:8px;padding:5px 9px;cursor:pointer;}
.pd-sort button.on{background:rgba(108,92,224,.12);border-color:var(--spec-violet,#6C5CE0);color:var(--spec-violet-deep,#4A3DB0);}
.pd-cmpscroll{overflow-x:auto;margin:0 -4px;}
.pd-cmp{width:100%;border-collapse:collapse;font-size:13px;min-width:560px;}
.pd-cmp th{text-align:left;font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--spec-text-2nd,#615F72);padding:0 11px 9px;border-bottom:1px solid var(--spec-border,#E2DFEC);}
.pd-cmp td{padding:12px 11px;border-bottom:1px solid var(--spec-border,#E2DFEC);vertical-align:top;}
.pd-cmp tr:last-child td{border-bottom:none;}
.pd-cmp tr.accepted td{background:#F3FAF6;}
.pd-cmpref{display:block;font-size:11px;color:var(--spec-text-2nd,#615F72);font-variant-numeric:tabular-nums;margin-top:2px;}
.pd-cmpamt{font-weight:800;color:var(--spec-ink,#141320);font-variant-numeric:tabular-nums;white-space:nowrap;}
.pd-cmpval{display:flex;align-items:center;gap:6px;}
.pd-bar{height:6px;border-radius:99px;background:var(--spec-border,#E2DFEC);margin-top:6px;overflow:hidden;min-width:60px;}
.pd-bar i{display:block;height:100%;border-radius:99px;background:#6C5CE0;transition:width .3s ease;}
.pd-bar i.best{background:#3B6EA5;}
.pd-cmpfee{color:var(--spec-violet-deep,#4A3DB0);font-variant-numeric:tabular-nums;white-space:nowrap;}
.pd-cmpwait{color:var(--spec-text-2nd,#615F72);font-weight:600;}
.pd-lowest{display:inline-block;margin-left:7px;font-size:9.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:2px 7px;border-radius:99px;background:#E9F7F0;color:#1F7A54;vertical-align:middle;}
.pd-cmpnote{font-size:11px;color:#8A87A0;margin:12px 0 0;line-height:1.5;}
.pd-quotes{display:flex;flex-direction:column;gap:11px;}
.pd-quote{background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:12px;padding:14px;}
.pd-qtop{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;}
.pd-qtop b{font-size:14px;}
.pd-qtop .pd-ref{margin-left:8px;font-size:11px;color:var(--spec-text-2nd,#615F72);}
.pd-qstat{font-size:11px;font-weight:700;padding:4px 10px;border-radius:99px;white-space:nowrap;}
.pd-qstat.accepted{background:#E9F7F0;color:#1F7A54;}
.pd-qstat.quoted{background:rgba(108,92,224,.1);color:var(--spec-violet-deep,#4A3DB0);}
.pd-qstat.await{background:#FBF3E7;color:var(--spec-warning,#C68A28);}
.pd-qamt{font-size:17px;font-weight:800;margin-top:9px;font-variant-numeric:tabular-nums;}
.pd-qamt small{font-size:12px;font-weight:500;color:var(--spec-text-2nd,#615F72);}
.pd-comm{font-size:12px;color:var(--spec-violet-deep,#4A3DB0);background:rgba(108,92,224,.06);border-radius:8px;padding:8px 10px;margin-top:9px;}
.pd-apps{display:flex;flex-direction:column;gap:8px;}
.pd-app{display:flex;justify-content:space-between;align-items:center;gap:12px;background:var(--spec-surface,#EFEDF5);border:1px solid var(--spec-border,#E2DFEC);border-radius:11px;padding:12px 14px;}
.pd-app.approved{border-color:rgba(47,158,106,.3);}
.pd-app.rejected{border-color:rgba(206,75,67,.3);}
.pd-appname{font-size:13.5px;font-weight:700;}
.pd-appmeta{font-size:11.5px;color:var(--spec-text-2nd,#615F72);margin-top:3px;text-transform:capitalize;}
.pd-appacts{display:flex;gap:7px;}
.pd-ok,.pd-no{font-family:inherit;font-size:12px;font-weight:700;padding:7px 13px;border-radius:8px;border:none;cursor:pointer;}
.pd-ok{background:#E9F7F0;color:#1F7A54;}
.pd-no{background:#FBECEA;color:var(--spec-error,#CE4B43);}
.pd-appbadge{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:4px 10px;border-radius:99px;}
.pd-appbadge.approved{background:#E9F7F0;color:#1F7A54;}
.pd-appbadge.rejected{background:#FBECEA;color:var(--spec-error,#CE4B43);}
.pd-appbadge.skipped{background:var(--spec-surface,#EFEDF5);color:var(--spec-text-2nd,#615F72);}
.pd-selectfull{flex:1;font-family:inherit;font-size:13px;padding:10px 12px;border-radius:10px;border:1px solid var(--spec-border,#E2DFEC);background:#fff;color:var(--spec-ink,#141320);cursor:pointer;outline:none;}
`;
