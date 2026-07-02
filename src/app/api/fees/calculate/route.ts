// POST /api/fees/calculate — the live success-fee calculator behind quote and
// deal screens. Deterministic: runs src/lib/fees/engine.ts and returns the
// eligible subtotal, exclusions, bracket-by-bracket math, effective rate, and
// a bilingual plain-language explanation. STATELESS — persisting a
// fee_calculations row happens in the deal flow (requires the 20260707
// migration applied); this endpoint never finalizes a fee and AI never calls
// it to send anything.

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isAdminRequest } from '@/lib/assistant/auth';
import { checkRateLimit } from '@/lib/http/rate-limit';
import {
  DEFAULT_FEE_POLICY,
  applyAdjustments,
  calculateFee,
  computeEligibleSubtotal,
  explainFee,
  type FeePolicy,
} from '@/lib/fees/engine';

const lineSchema = z.object({
  amount: z.coerce.number().finite(),
  kind: z.enum(['product', 'service', 'pilot', 'installation', 'subscription', 'shipping', 'tax', 'deposit', 'passthrough']),
  description: z.string().trim().max(300).optional(),
  excluded: z.boolean().optional(),
  exclusionReason: z.string().trim().max(300).optional(),
});

const bodySchema = z.object({
  lines: z.array(lineSchema).min(1).max(200),
  refunds: z.coerce.number().min(0).optional(),
  credits: z.coerce.number().min(0).optional(),
  cancelled: z.coerce.number().min(0).optional(),
  policy: z
    .object({
      version: z.string().trim().min(1).max(100),
      label: z.string().trim().min(1).max(300),
      brackets: z.array(z.object({ upTo: z.number().positive().nullable(), rate: z.number().min(0).max(1) })).min(1),
      minimumFee: z.number().min(0).nullable().optional(),
      maximumFee: z.number().min(0).nullable().optional(),
      negotiatedRate: z.number().min(0).max(1).nullable().optional(),
    })
    .optional(),
  adjustments: z
    .array(
      z.object({
        amount: z.coerce.number().finite(),
        reason: z.string().trim().min(3).max(500),
        approvedBy: z.string().trim().min(1).max(200),
      }),
    )
    .max(20)
    .optional(),
});

function clientKey(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  return `fees:calculate:${forwarded ? forwarded.split(',')[0].trim() : 'local'}`;
}

export async function POST(req: Request) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }
  const limit = checkRateLimit({ key: clientKey(req), maxRequests: 60, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json({ ok: false, message: 'Too many requests' }, { status: 429 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { ok: false, message: `${issue.path.join('.') || 'body'}: ${issue.message}` },
      { status: 400 },
    );
  }

  const { lines, refunds, credits, cancelled, policy, adjustments } = parsed.data;
  const eligible = computeEligibleSubtotal({ lines, refunds, credits, cancelled });
  const feePolicy: FeePolicy = policy ?? DEFAULT_FEE_POLICY;
  const base = calculateFee(eligible.eligible, feePolicy);
  const result = adjustments && adjustments.length > 0 ? applyAdjustments(base, adjustments) : base;

  return NextResponse.json({
    ok: true,
    eligible,
    fee: result,
    explanation: explainFee(base),
    note: 'Estimate only — an authorized admin finalizes fees; policy requires legal/tax review before launch.',
  });
}
