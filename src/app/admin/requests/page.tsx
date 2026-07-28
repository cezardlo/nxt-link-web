'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Send,
  FileText,
  Sparkles,
} from 'lucide-react';
import { hasPrivateAccess, requestPrivateAccess } from '@/lib/privateAccess';

// ---------- Types ----------

interface AiSummary {
  problem?: string;
  category?: string;
  quantity?: string;
  location?: string;
  deadline?: string;
  urgency?: string;
  recommended_categories?: string[];
  missing_info?: string[];
}

interface PlatformRequest {
  id?: string | number;
  public_ref?: string;
  category?: string;
  problem?: string;
  location?: string;
  urgency?: string;
  status?: string;
  pipeline_stage?: string;
  created_at?: string;
  ai_summary?: AiSummary;
  missing_info?: string[];
  recommended_categories?: string[];
  nda_required?: boolean;
  quantity?: string;
  deadline?: string;
  budget_range?: string;
}

interface RequestsResponse {
  ok?: boolean;
  stored?: boolean;
  requests?: PlatformRequest[];
}

interface InternalSummary {
  client_need?: string;
  problem?: string;
  quantity?: string;
  timeline?: string;
  location?: string;
  budget?: string;
  urgency?: string;
  confidentiality?: string;
  missing_info?: string[];
  best_vendor_categories?: string[];
  suggested_next_action?: string;
}

interface QuotePacket {
  general_industry?: string;
  general_location?: string;
  problem_summary?: string;
  scope?: string;
  quantity?: string;
  timeline?: string;
  urgency?: string;
  requirements?: string[];
  questions_for_vendor?: string[];
  quote_deadline?: string;
}

interface VendorOutreach {
  en?: string;
  es?: string;
}

interface AdminDraft {
  internal_summary?: InternalSummary;
  quote_packet?: QuotePacket;
  vendor_outreach?: VendorOutreach;
}

interface AssistantResponse {
  ok?: boolean;
  is_draft?: boolean;
  provider?: string;
  draft?: AdminDraft;
}

type Approval = 'idle' | 'approved' | 'rejected';

interface ApprovalState {
  internal: Approval;
  packet: Approval;
  outreach: Approval;
}

const SAMPLE_REQUEST: PlatformRequest = {
  public_ref: 'REQ-SAMPLE1',
  category: 'Forklift & Material Handling',
  problem: 'Maintenance for 6 forklifts',
  location: 'El Paso, TX',
  urgency: 'High',
  quantity: '6 units',
  deadline: 'next week',
  budget_range: '',
  nda_required: false,
  status: 'request_received',
  ai_summary: {
    problem: 'Maintenance for 6 forklifts',
    category: 'Forklift & Material Handling',
    quantity: '6 units',
    location: 'El Paso, TX',
    deadline: 'next week',
    urgency: 'High',
    recommended_categories: ['Forklifts & Material Handling', 'Field Service & Maintenance'],
    missing_info: ['Confirm budget range'],
  },
};

// ---------- Helpers ----------

function urgencyClasses(urgency?: string): string {
  const u = (urgency || '').toLowerCase();
  if (u === 'high' || u === 'critical' || u === 'urgent') {
    return 'border-[#F0C6C2] bg-[#FBEAE8] text-[#CE4B43]';
  }
  if (u === 'medium' || u === 'moderate') {
    return 'border-[#F0DFB8] bg-[#FBF1DE] text-[#C68A28]';
  }
  return 'border-[#CDE9DA] bg-[#E6F4EC] text-[#2F9E6A]';
}

function statusLabel(status?: string): string {
  if (!status) return 'unknown';
  return status.replace(/_/g, ' ');
}

function packetToText(packet?: QuotePacket): string {
  if (!packet) return '';
  const lines: string[] = [];
  if (packet.general_industry) lines.push(`Industry: ${packet.general_industry}`);
  if (packet.general_location) lines.push(`General location: ${packet.general_location}`);
  if (packet.problem_summary) lines.push(`Problem: ${packet.problem_summary}`);
  if (packet.scope) lines.push(`Scope: ${packet.scope}`);
  if (packet.quantity) lines.push(`Quantity: ${packet.quantity}`);
  if (packet.timeline) lines.push(`Timeline: ${packet.timeline}`);
  if (packet.urgency) lines.push(`Urgency: ${packet.urgency}`);
  if (packet.quote_deadline) lines.push(`Quote deadline: ${packet.quote_deadline}`);
  if (packet.requirements && packet.requirements.length) {
    lines.push('');
    lines.push('Requirements:');
    packet.requirements.forEach((r) => lines.push(`- ${r}`));
  }
  if (packet.questions_for_vendor && packet.questions_for_vendor.length) {
    lines.push('');
    lines.push('Questions for vendor:');
    packet.questions_for_vendor.forEach((q) => lines.push(`- ${q}`));
  }
  lines.push('');
  lines.push('Note: Client identity hidden. Budget hidden.');
  return lines.join('\n');
}

// ---------- Small UI bits ----------

function DraftPill() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#F0DFB8] bg-[#FBF1DE] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#C68A28]">
      Draft
    </span>
  );
}

function Chips({ items }: { items?: string[] }) {
  if (!items || !items.length) return <span className="text-sm text-[#615F72]">—</span>;
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <span
          key={`${item}-${i}`}
          className="rounded-full border border-[#E2DFEC] bg-[#F8F7FB] px-2.5 py-1 text-xs text-[#615F72]"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#615F72]">{label}</p>
      <p className="mt-0.5 text-sm leading-6 text-[#141320]">{value || '—'}</p>
    </div>
  );
}

function BulletList({ label, items }: { label: string; items?: string[] }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#615F72]">{label}</p>
      {items && items.length ? (
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6 text-[#615F72]">
          {items.map((it, i) => (
            <li key={`${it}-${i}`}>{it}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-0.5 text-sm text-[#615F72]">—</p>
      )}
    </div>
  );
}

function ApproveReject({
  status,
  onApprove,
  onReject,
}: {
  status: Approval;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="mt-4 flex items-center gap-3">
      <button
        type="button"
        onClick={onApprove}
        className="inline-flex items-center gap-2 rounded-full bg-[#6C5CE0] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4A3DB0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A99DF2]"
      >
        <CheckCircle2 className="h-4 w-4" /> Approve
      </button>
      <button
        type="button"
        onClick={onReject}
        className="inline-flex items-center gap-2 rounded-full border border-[#E2DFEC] bg-white px-5 py-2.5 text-sm font-semibold text-[#615F72] transition hover:bg-[#EFEDF5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A99DF2]"
      >
        Reject
      </button>
      {status === 'approved' && (
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#2F9E6A]">
          <CheckCircle2 className="h-4 w-4" /> Approved — ready to send
        </span>
      )}
      {status === 'rejected' && (
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#CE4B43]">
          <AlertTriangle className="h-4 w-4" /> Rejected
        </span>
      )}
    </div>
  );
}

// ---------- Page ----------

export default function AdminRequestsPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState(false);

  const [requests, setRequests] = useState<PlatformRequest[]>([]);
  const [stored, setStored] = useState<boolean>(true);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [selectedRef, setSelectedRef] = useState<string | null>(null);

  const [draft, setDraft] = useState<AdminDraft | null>(null);
  const [provider, setProvider] = useState<string>('');
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  const [approval, setApproval] = useState<ApprovalState>({
    internal: 'idle',
    packet: 'idle',
    outreach: 'idle',
  });

  const [packetText, setPacketText] = useState('');
  const [outreachEn, setOutreachEn] = useState('');
  const [outreachEs, setOutreachEs] = useState('');

  // Gate check on mount.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (hasPrivateAccess()) {
      setUnlocked(true);
    }
  }, []);

  // Load requests once unlocked.
  useEffect(() => {
    if (!unlocked) return;
    void loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked]);

  const selectedRequest = useMemo(
    () => requests.find((r) => r.public_ref === selectedRef) || null,
    [requests, selectedRef],
  );

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    const result = await requestPrivateAccess(codeInput.trim());
    if (result.ok) {
      setCodeError(false);
      setUnlocked(true);
    } else {
      setCodeError(true);
    }
  }

  async function loadRequests() {
    setListLoading(true);
    setListError(null);
    try {
      // The httpOnly admin session cookie (set by the gate) authenticates this call.
      const res = await fetch('/api/platform/requests');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as RequestsResponse;
      setStored(data.stored !== false);
      setRequests(Array.isArray(data.requests) ? data.requests : []);
    } catch (err) {
      setListError(err instanceof Error ? err.message : String(err));
      setStored(false);
      setRequests([]);
    } finally {
      setListLoading(false);
    }
  }

  function loadSample() {
    setRequests((prev) => {
      if (prev.some((r) => r.public_ref === SAMPLE_REQUEST.public_ref)) return prev;
      return [SAMPLE_REQUEST, ...prev];
    });
    setSelectedRef(SAMPLE_REQUEST.public_ref || null);
  }

  function selectRequest(ref?: string) {
    setSelectedRef(ref || null);
    setDraft(null);
    setDraftError(null);
    setProvider('');
    setApproval({ internal: 'idle', packet: 'idle', outreach: 'idle' });
  }

  async function generateDrafts() {
    if (!selectedRequest) return;
    setDraftLoading(true);
    setDraftError(null);
    setApproval({ internal: 'idle', packet: 'idle', outreach: 'idle' });
    try {
      const res = await fetch('/api/assistant/admin', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          request: selectedRequest,
          request_id: selectedRequest.id,
        }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as AssistantResponse;
      const nextDraft = data.draft || null;
      setDraft(nextDraft);
      setProvider(data.provider || 'AI');
      setPacketText(packetToText(nextDraft?.quote_packet));
      setOutreachEn(nextDraft?.vendor_outreach?.en || '');
      setOutreachEs(nextDraft?.vendor_outreach?.es || '');
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : String(err));
      setDraft(null);
    } finally {
      setDraftLoading(false);
    }
  }

  // ---------- Access gate render ----------

  if (!unlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F7FB] px-4 text-[#141320]">
        <form
          onSubmit={submitCode}
          className="w-full max-w-sm rounded-2xl border border-[#E2DFEC] bg-white/90 p-6 shadow-[0_18px_60px_rgba(20,19,32,0.08)]"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#615F72]">NXT//LINK</p>
          <h1 className="mt-2 text-2xl font-semibold text-[#141320]">Enter access code</h1>
          <p className="mt-2 text-sm leading-6 text-[#615F72]">
            This console is private. Enter your access code to continue.
          </p>
          <input
            type="password"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            placeholder="Access code"
            className="mt-4 w-full rounded-xl border border-[#E2DFEC] bg-white px-4 py-2.5 text-sm text-[#141320] outline-none transition focus:border-[#6C5CE0] focus:ring-2 focus:ring-[#A99DF2]/40"
          />
          {codeError && (
            <p className="mt-2 flex items-center gap-1 text-xs text-[#CE4B43]">
              <AlertTriangle className="h-3.5 w-3.5" /> Incorrect code. Try again.
            </p>
          )}
          <button
            type="submit"
            className="mt-4 w-full rounded-full bg-[#6C5CE0] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4A3DB0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A99DF2]"
          >
            Unlock
          </button>
        </form>
      </div>
    );
  }

  // ---------- Main render ----------

  const internal = draft?.internal_summary;
  const packet = draft?.quote_packet;

  return (
    <div className="min-h-screen bg-[#F8F7FB] px-4 py-12 text-[#141320] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#615F72]">NXT//LINK</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#141320] sm:text-4xl">Admin AI Console</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#615F72]">
          Turn client requests into quote-ready, approved packets. AI drafts only — you control what is sent.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
          {/* ---------- Left: requests list ---------- */}
          <section className="rounded-2xl border border-[#E2DFEC] bg-white/90 p-6 shadow-[0_18px_60px_rgba(20,19,32,0.08)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-[#141320]">Requests</h2>
              <button
                type="button"
                onClick={() => void loadRequests()}
                disabled={listLoading}
                className="inline-flex items-center gap-2 rounded-full border border-[#E2DFEC] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#615F72] transition hover:bg-[#EFEDF5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A99DF2] disabled:opacity-60"
              >
                {listLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Refresh
              </button>
            </div>

            {listError && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-[#F0C6C2] bg-[#FBEAE8] p-3 text-sm text-[#CE4B43]">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Could not load requests: {listError}</span>
              </div>
            )}

            {listLoading && requests.length === 0 ? (
              <div className="mt-6 flex items-center gap-2 text-sm text-[#615F72]">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading requests…
              </div>
            ) : null}

            {!listLoading && (!stored || requests.length === 0) && (
              <div className="mt-6 rounded-xl border border-dashed border-[#E2DFEC] bg-[#F8F7FB] p-5 text-center">
                <FileText className="mx-auto h-6 w-6 text-[#615F72]" />
                <p className="mt-2 text-sm font-semibold text-[#141320]">No stored requests yet</p>
                <p className="mt-1 text-xs leading-6 text-[#615F72]">
                  Load a sample request to try the AI drafting flow end to end.
                </p>
                <button
                  type="button"
                  onClick={loadSample}
                  className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#6C5CE0] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4A3DB0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A99DF2]"
                >
                  <Sparkles className="h-4 w-4" /> Load sample request
                </button>
              </div>
            )}

            {requests.length > 0 && (
              <ul className="mt-5 space-y-3">
                {requests.map((req, idx) => {
                  const isActive = req.public_ref === selectedRef;
                  return (
                    <li key={req.public_ref || req.id || idx}>
                      <button
                        type="button"
                        onClick={() => selectRequest(req.public_ref)}
                        className={`w-full rounded-xl border p-4 text-left transition ${
                          isActive
                            ? 'border-[#6C5CE0] bg-[#EFEDF5]'
                            : 'border-[#E2DFEC] bg-white hover:border-[#A99DF2] hover:bg-[#EFEDF5]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[11px] font-semibold tracking-[0.1em] text-[#141320]">
                            {req.public_ref || '—'}
                          </span>
                          <span className="rounded-full border border-[#E2DFEC] bg-[#F8F7FB] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#615F72]">
                            {statusLabel(req.status)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-semibold text-[#141320]">{req.category || 'Uncategorized'}</p>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#615F72]">{req.problem || '—'}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${urgencyClasses(
                              req.urgency,
                            )}`}
                          >
                            {req.urgency || 'normal'}
                          </span>
                          {req.location && (
                            <span className="text-[11px] text-[#615F72]">{req.location}</span>
                          )}
                          {req.nda_required && (
                            <span className="rounded-full border border-[#CFC6F0] bg-[#EFEDF5] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#4A3DB0]">
                              NDA
                            </span>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* ---------- Right: AI drafts ---------- */}
          <section className="space-y-6">
            <div className="rounded-2xl border border-[#E2DFEC] bg-white/90 p-6 shadow-[0_18px_60px_rgba(20,19,32,0.08)]">
              {/* Guardrails banner */}
              <div className="flex items-start gap-2 rounded-xl border border-[#E2DFEC] bg-[#F8F7FB] p-3 text-xs leading-6 text-[#615F72]">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#615F72]" />
                <span>
                  AI never reveals client or vendor identity, never sends anything automatically, and respects
                  NDA/MNDA. All outputs are drafts until you approve.
                </span>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-[#141320]">AI drafts</h2>
                  {selectedRequest ? (
                    <p className="mt-1 text-sm text-[#615F72]">
                      Selected:{' '}
                      <span className="font-mono text-[#141320]">{selectedRequest.public_ref}</span> —{' '}
                      {selectedRequest.category}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-[#615F72]">Select a request on the left to begin.</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void generateDrafts()}
                    disabled={!selectedRequest || draftLoading}
                    className="inline-flex items-center gap-2 rounded-full bg-[#6C5CE0] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4A3DB0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A99DF2] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {draftLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Generating…
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" /> Generate quote-ready drafts
                      </>
                    )}
                  </button>
                  {draft && !draftLoading && (
                    <button
                      type="button"
                      onClick={() => void generateDrafts()}
                      className="inline-flex items-center gap-2 rounded-full border border-[#E2DFEC] bg-white px-4 py-2.5 text-sm font-semibold text-[#615F72] transition hover:bg-[#EFEDF5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A99DF2]"
                    >
                      Regenerate
                    </button>
                  )}
                </div>
              </div>

              <p className="mt-3 text-xs leading-6 text-[#615F72]">
                Nothing is sent automatically. Approve marks a draft ready; a human still triggers the send.
              </p>

              {draftError && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-[#F0C6C2] bg-[#FBEAE8] p-3 text-sm text-[#CE4B43]">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>Could not generate drafts: {draftError}</span>
                </div>
              )}
            </div>

            {draftLoading && (
              <div className="rounded-2xl border border-[#E2DFEC] bg-white/90 p-6 text-center shadow-[0_18px_60px_rgba(20,19,32,0.08)]">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#141320]" />
                <p className="mt-2 text-sm text-[#615F72]">Drafting internal summary, quote packet and outreach…</p>
              </div>
            )}

            {draft && !draftLoading && (
              <>
                {/* 1. Internal Request Summary */}
                <div className="rounded-2xl border border-[#E2DFEC] bg-white/90 p-6 shadow-[0_18px_60px_rgba(20,19,32,0.08)]">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-[#141320]">Internal Request Summary</h3>
                    <div className="flex items-center gap-2">
                      <DraftPill />
                      <span className="text-[11px] text-[#615F72]">{provider}</span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Client need" value={internal?.client_need} />
                    <Field label="Problem" value={internal?.problem} />
                    <Field label="Quantity" value={internal?.quantity} />
                    <Field label="Timeline" value={internal?.timeline} />
                    <Field label="Location" value={internal?.location} />
                    <Field label="Budget" value={internal?.budget} />
                    <Field label="Urgency" value={internal?.urgency} />
                    <Field label="Confidentiality" value={internal?.confidentiality} />
                    <Field label="Suggested next action" value={internal?.suggested_next_action} />
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#615F72]">
                        Missing info
                      </p>
                      <Chips items={internal?.missing_info} />
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#615F72]">
                        Best vendor categories
                      </p>
                      <Chips items={internal?.best_vendor_categories} />
                    </div>
                  </div>

                  <ApproveReject
                    status={approval.internal}
                    onApprove={() => setApproval((p) => ({ ...p, internal: 'approved' }))}
                    onReject={() => setApproval((p) => ({ ...p, internal: 'rejected' }))}
                  />
                </div>

                {/* 2. Protected Quote Packet Draft */}
                <div className="rounded-2xl border border-[#E2DFEC] bg-white/90 p-6 shadow-[0_18px_60px_rgba(20,19,32,0.08)]">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-[#141320]">Protected Quote Packet Draft</h3>
                    <div className="flex items-center gap-2">
                      <DraftPill />
                      <span className="text-[11px] text-[#615F72]">{provider}</span>
                    </div>
                  </div>

                  <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#CFC6F0] bg-[#EFEDF5] px-3 py-1 text-xs font-semibold text-[#4A3DB0]">
                    Client identity hidden · Budget hidden
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="General industry" value={packet?.general_industry} />
                    <Field label="General location" value={packet?.general_location} />
                    <Field label="Problem summary" value={packet?.problem_summary} />
                    <Field label="Scope" value={packet?.scope} />
                    <Field label="Quantity" value={packet?.quantity} />
                    <Field label="Timeline" value={packet?.timeline} />
                    <Field label="Urgency" value={packet?.urgency} />
                    <Field label="Quote deadline" value={packet?.quote_deadline} />
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <BulletList label="Requirements" items={packet?.requirements} />
                    <BulletList label="Questions for vendor" items={packet?.questions_for_vendor} />
                  </div>

                  <div className="mt-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#615F72]">
                      Editable packet body
                    </p>
                    <textarea
                      value={packetText}
                      onChange={(e) => setPacketText(e.target.value)}
                      rows={10}
                      className="mt-1 w-full rounded-xl border border-[#E2DFEC] bg-[#F8F7FB] px-4 py-3 font-mono text-xs leading-relaxed text-[#141320] outline-none transition focus:border-[#6C5CE0] focus:ring-2 focus:ring-[#A99DF2]/40"
                    />
                  </div>

                  <ApproveReject
                    status={approval.packet}
                    onApprove={() => setApproval((p) => ({ ...p, packet: 'approved' }))}
                    onReject={() => setApproval((p) => ({ ...p, packet: 'rejected' }))}
                  />
                </div>

                {/* 3. Vendor Outreach Draft */}
                <div className="rounded-2xl border border-[#E2DFEC] bg-white/90 p-6 shadow-[0_18px_60px_rgba(20,19,32,0.08)]">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="flex items-center gap-2 text-base font-semibold text-[#141320]">
                      <Send className="h-4 w-4 text-[#615F72]" /> Vendor Outreach Draft
                    </h3>
                    <div className="flex items-center gap-2">
                      <DraftPill />
                      <span className="text-[11px] text-[#615F72]">{provider}</span>
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-[#615F72]">
                    Two language versions — English (EN) and Spanish (ES). Edit before approving.
                  </p>

                  <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#615F72]">English (EN)</p>
                      <textarea
                        value={outreachEn}
                        onChange={(e) => setOutreachEn(e.target.value)}
                        rows={9}
                        className="mt-1 w-full rounded-xl border border-[#E2DFEC] bg-[#F8F7FB] px-4 py-3 text-xs leading-relaxed text-[#141320] outline-none transition focus:border-[#6C5CE0] focus:ring-2 focus:ring-[#A99DF2]/40"
                      />
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#615F72]">Spanish (ES)</p>
                      <textarea
                        value={outreachEs}
                        onChange={(e) => setOutreachEs(e.target.value)}
                        rows={9}
                        className="mt-1 w-full rounded-xl border border-[#E2DFEC] bg-[#F8F7FB] px-4 py-3 text-xs leading-relaxed text-[#141320] outline-none transition focus:border-[#6C5CE0] focus:ring-2 focus:ring-[#A99DF2]/40"
                      />
                    </div>
                  </div>

                  <ApproveReject
                    status={approval.outreach}
                    onApprove={() => setApproval((p) => ({ ...p, outreach: 'approved' }))}
                    onReject={() => setApproval((p) => ({ ...p, outreach: 'rejected' }))}
                  />
                </div>
              </>
            )}

            {!draft && !draftLoading && !draftError && (
              <div className="rounded-2xl border border-dashed border-[#E2DFEC] bg-white/70 p-8 text-center">
                <FileText className="mx-auto h-7 w-7 text-[#615F72]" />
                <p className="mt-2 text-sm font-semibold text-[#141320]">No drafts yet</p>
                <p className="mt-1 text-xs leading-6 text-[#615F72]">
                  {selectedRequest
                    ? 'Click “Generate quote-ready drafts” to produce an internal summary, a protected quote packet, and bilingual vendor outreach.'
                    : 'Select a request to generate AI drafts.'}
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
