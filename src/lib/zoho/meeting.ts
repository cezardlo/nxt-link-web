// Zoho Meeting — schedule a meeting and get a join link.
// Falls back to a proposed time slot (no live link) when Zoho is not configured,
// so the assistant can still offer a meeting and a human can finalize it.

import { getZohoConfig, isZohoConfigured, zohoFetch } from './client';

export interface CreateMeetingInput {
  topic: string;
  agenda?: string;
  /** ISO start time */
  startTime: string;
  /** minutes */
  durationMinutes?: number;
  timezone?: string;
  presenterEmail?: string;
}

export interface CreateMeetingResult {
  ok: boolean;
  scheduled: boolean;
  provider: 'zoho' | 'fallback';
  joinUrl?: string;
  meetingId?: string;
  startTime: string;
  error?: string;
}

function isMeetingConfigured(): boolean {
  return isZohoConfigured() && Boolean(getZohoConfig().meetingZsoid);
}

export async function createZohoMeeting(input: CreateMeetingInput): Promise<CreateMeetingResult> {
  const startTime = input.startTime;
  if (!isMeetingConfigured()) {
    // Degrade gracefully: propose the slot; a human confirms + sends the link.
    return { ok: true, scheduled: false, provider: 'fallback', startTime };
  }
  const c = getZohoConfig();
  try {
    const res = await zohoFetch(`https://meeting.zoho.com/api/v2/${c.meetingZsoid}/sessions.json`, {
      method: 'POST',
      body: JSON.stringify({
        session: {
          topic: input.topic,
          agenda: input.agenda || '',
          presenter: input.presenterEmail || c.fromAddress,
          startTime,
          duration: (input.durationMinutes || 30) * 60,
          timezone: input.timezone || 'America/Denver',
        },
      }),
    });
    if (!res) return { ok: true, scheduled: false, provider: 'fallback', startTime };
    const data = (await res.json().catch(() => ({}))) as {
      session?: { meetingKey?: string; joinLink?: string; startUrl?: string };
    };
    if (!res.ok) {
      return { ok: false, scheduled: false, provider: 'zoho', startTime, error: `Zoho Meeting HTTP ${res.status}` };
    }
    return {
      ok: true,
      scheduled: true,
      provider: 'zoho',
      startTime,
      meetingId: data?.session?.meetingKey,
      joinUrl: data?.session?.joinLink || data?.session?.startUrl,
    };
  } catch (e) {
    return { ok: false, scheduled: false, provider: 'zoho', startTime, error: e instanceof Error ? e.message : 'schedule failed' };
  }
}
