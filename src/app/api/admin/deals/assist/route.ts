// POST /api/admin/deals/assist — NXT AI Commission Co-pilot.
// The admin types plain English ("Log Acme Forklifts deal $100k for buyer XYZ"
// or "summary today"); this parses intent and either (a) returns a deal draft
// with the commission the REAL fee engine computes — nothing is saved until the
// admin confirms on the form — or (b) returns today's running summary.

export const dynamic = 'force-dynamic';
export const maxDuration = 30;
import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/assistant/auth';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { aiDraft } from '@/lib/assistant/llm';
import { calculateFee, firstDealDiscountAmount } from '@/lib/fees/engine';

const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

interface Parsed { intent: 'log_deal' | 'summary' | 'unknown'; vendor_name: string; buyer_company: string; net_amount: number | null; }

// Deterministic fallback parser so the co-pilot works without an LLM key.
function fallbackParse(msg: string): Parsed {
  const m = msg.trim();
  if (/\b(summary|today|report|recap)\b/i.test(m) && !/\$|\d{3,}/.test(m)) {
    return { intent: 'summary', vendor_name: '', buyer_company: '', net_amount: null };
  }
  // Amount: $100,000 / 100k / 1.2m
  let net: number | null = null;
  const am = m.match(/\$?\s*([\d][\d,]*(?:\.\d+)?)\s*([km])?/i);
  if (am) {
    let n = Number(am[1].replace(/,/g, ''));
    const suf = (am[2] || '').toLowerCase();
    if (suf === 'k') n *= 1000; else if (suf === 'm') n *= 1_000_000;
    if (Number.isFinite(n) && n > 0) net = n;
  }
  // Buyer: after "for [buyer]" / "buyer X"
  let buyer = '';
  const bm = m.match(/\b(?:for\s+)?buyer\s+(.+)$/i) || m.match(/\bfor\s+(.+)$/i);
  if (bm) buyer = bm[1].replace(/[.,]$/, '').trim();
  // Vendor: strip leading verbs, then take text before "deal"/amount/"for".
  let vendor = m.replace(/^\s*(please\s+)?(log|record|add|create|new|enter)\s+(a\s+)?(deal\s+(for\s+)?)?/i, '');
  vendor = vendor.split(/\bdeal\b|\bfor\b|\$|\d/i)[0].trim().replace(/[.,]$/, '');
  const intent: Parsed['intent'] = net ? 'log_deal' : 'unknown';
  return { intent, vendor_name: vendor, buyer_company: buyer, net_amount: net };
}

export async function POST(req: Request) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false, message: 'Admin only' }, { status: 401 });
  let body: { message?: string; source_quote_id?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }
  const message = String(body.message || '').trim().slice(0, 500);
  if (!message) return NextResponse.json({ ok: false, message: 'Say something like: Log Acme Forklifts deal $100k for buyer XYZ' }, { status: 400 });
  // Optional: carried straight through to the returned draft so a caller
  // converting a specific accepted quote (Payments S0 Phase C) can round-trip
  // it into the confirm step (POST /api/admin/deals), which dedupes on it.
  // This route never writes to manual_deals itself — nothing to dedupe here.
  const sourceQuoteId = typeof body.source_quote_id === 'string' && body.source_quote_id.trim() ? body.source_quote_id.trim().slice(0, 100) : null;

  const draft = await aiDraft<Parsed>({
    systemPrompt: 'You parse an admin\'s plain-English deal command for an industrial marketplace. Return JSON {"intent":"log_deal"|"summary"|"unknown","vendor_name":string,"buyer_company":string,"net_amount":number|null}. net_amount is the numeric USD net value (expand 100k=100000, 1.2m=1200000). "summary"/"today"/"recap" with no amount → intent "summary". Extract vendor and buyer names verbatim; leave blank if absent.',
    userPrompt: message,
    temperature: 0.1,
    parse: (content: string) => {
      const o = JSON.parse(content) as Partial<Parsed>;
      const intent = o.intent === 'log_deal' || o.intent === 'summary' ? o.intent : 'unknown';
      const net = typeof o.net_amount === 'number' && Number.isFinite(o.net_amount) && o.net_amount > 0 ? o.net_amount : null;
      return { intent, vendor_name: String(o.vendor_name || '').slice(0, 200), buyer_company: String(o.buyer_company || '').slice(0, 200), net_amount: net };
    },
    fallback: () => fallbackParse(message),
  });
  const p = draft.result;

  // Summary: today's logged deals + commission.
  if (p.intent === 'summary') {
    if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, action: 'summary', reply: 'Summary is unavailable — storage not configured.' });
    const db = getSupabaseClient({ admin: true });
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const { data } = await db.from('manual_deals').select('commission_amount, net_amount, status, vendor_name').gte('created_at', start.toISOString());
    const rows = data || [];
    const commission = rows.reduce((s, r) => s + (Number(r.commission_amount) || 0), 0);
    const gross = rows.reduce((s, r) => s + (Number(r.net_amount) || 0), 0);
    const reply = rows.length === 0
      ? 'No deals logged yet today.'
      : `Today: ${rows.length} deal${rows.length === 1 ? '' : 's'} logged, ${money(gross)} in net value, ${money(commission)} in NXT//LINK commission.`;
    return NextResponse.json({ ok: true, action: 'summary', reply });
  }

  // Log a deal → draft only. Compute commission with the authoritative engine.
  if (p.intent === 'log_deal' && p.net_amount) {
    const fee = calculateFee(p.net_amount);
    const reply = `Ready to log: ${p.vendor_name || 'vendor'}${p.buyer_company ? ` → ${p.buyer_company}` : ''} at ${money(p.net_amount)}. Commission ${money(fee.fee)} (${(fee.effectiveRate * 100).toFixed(2)}%)${fee.appliedMaximum ? ', $20,000 cap applied' : ''}. I've filled the form — review and press “Record deal” to confirm. First-deal 50% off (−${money(firstDealDiscountAmount(fee.fee))}) is optional.`;
    return NextResponse.json({
      ok: true, action: 'prefill_deal', reply,
      draft: { vendor_name: p.vendor_name, buyer_company: p.buyer_company, net_amount: p.net_amount, source_quote_id: sourceQuoteId },
      commission: fee.fee, effective_rate: fee.effectiveRate, applied_cap: fee.appliedMaximum,
    });
  }

  return NextResponse.json({ ok: true, action: 'unknown', reply: 'I can log a deal or give today\'s summary. Try: “Log Acme Forklifts deal $100k for buyer El Paso Distribution”, or “summary today”.' });
}
