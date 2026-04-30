export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase/client';

type VendorHuntPayload = {
  category?: string;
  problem?: string;
  timeline?: string;
  email?: string;
};

function buildMailto(payload: VendorHuntPayload) {
  const category = payload.category || 'industrial tech';
  const subject = `Find my Top 5 ${category} vendors`;
  const body = [
    'Hi NXT Link,',
    '',
    'I want help finding my Top 5 vendors.',
    '',
    `Category: ${category}`,
    `Problem: ${payload.problem || 'Not filled yet'}`,
    `Timeline: ${payload.timeline || 'Not filled yet'}`,
    `Contact email: ${payload.email || 'Not filled yet'}`,
    '',
    'Please send me the vendor hunt path.',
  ].join('\n');

  return `mailto:hello@nxtlinktech.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({})) as VendorHuntPayload;
  const category = String(payload.category || '').trim();
  const problem = String(payload.problem || '').trim();
  const timeline = String(payload.timeline || '').trim();
  const email = String(payload.email || '').trim();

  if (!category) {
    return NextResponse.json({ ok: false, error: 'Category is required' }, { status: 400 });
  }

  let stored = false;
  try {
    const supabase = getSupabaseClient({ admin: true });
    const { error } = await supabase.from('vendor_hunt_requests').insert({
      category,
      problem: problem || null,
      timeline: timeline || null,
      email: email || null,
      source: 'homepage',
    });

    stored = !error;
  } catch {
    stored = false;
  }

  return NextResponse.json({
    ok: true,
    stored,
    mailto: buildMailto({ category, problem, timeline, email }),
  });
}
