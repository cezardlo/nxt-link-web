// POST /api/zoho/meeting  { topic, agenda?, startTime, durationMinutes?, vendor_id?, to?, email? }
// Admin: schedule (or propose) a Zoho Meeting and log it. If `to`/`email` and a
// link exist, also email the invite via Zoho Mail.
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { isAdminRequest } from '@/lib/assistant/auth';
import { createZohoMeeting } from '@/lib/zoho/meeting';
import { sendZohoMail } from '@/lib/zoho/mail';

export async function POST(req: Request) {
  if (!(await isAdminRequest(req)))
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });

  let body: { topic?: string; agenda?: string; startTime?: string; durationMinutes?: number;
    vendor_id?: string; to?: string; email?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }

  const topic = String(body.topic || '').trim();
  const startTime = String(body.startTime || '').trim();
  if (!topic || !startTime)
    return NextResponse.json({ ok: false, message: 'topic and startTime are required' }, { status: 400 });

  const meeting = await createZohoMeeting({
    topic,
    agenda: body.agenda,
    startTime,
    durationMinutes: body.durationMinutes || 30,
  });

  const to = String(body.to || body.email || '').trim();
  let emailed = false;
  if (to && meeting.joinUrl) {
    const m = await sendZohoMail({
      to,
      subject: `Meeting invite: ${topic}`,
      body: `<p>You're invited to a meeting: <b>${topic}</b></p>
        <p>When: ${new Date(startTime).toLocaleString()}</p>
        <p>Join: <a href="${meeting.joinUrl}">${meeting.joinUrl}</a></p>`,
    }).catch(() => ({ sent: false } as { sent: boolean }));
    emailed = Boolean(m.sent);
  }

  if (isSupabaseConfigured()) {
    try {
      const db = getSupabaseClient({ admin: true });
      await db.from('zoho_outbox').insert({
        kind: 'meeting',
        vendor_id: body.vendor_id || null,
        to_address: to || null,
        meeting_topic: topic,
        meeting_start: startTime,
        meeting_url: meeting.joinUrl || null,
        status: meeting.scheduled ? 'scheduled' : 'draft',
        provider: meeting.provider,
        error: meeting.error || null,
        zoho_id: meeting.meetingId || null,
      });
    } catch { /* ignore */ }
  }

  return NextResponse.json({
    ok: meeting.ok,
    scheduled: meeting.scheduled,
    provider: meeting.provider,
    join_url: meeting.joinUrl || null,
    emailed,
    message: meeting.scheduled ? 'Meeting scheduled in Zoho Meeting'
      : 'Proposed a time — connect Zoho Meeting to create the live link automatically',
  }, { status: meeting.ok ? 200 : 502 });
}
