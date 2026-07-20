// GET /api/invites/unsubscribe?token=<invite token> — one-click opt-out,
// linked from the footer of every invite/reminder email. Marks the invite
// opted_out (an absolute stop: the reminder cron filters it out forever and
// the resend endpoint refuses it) and renders a tiny bilingual confirmation
// page. The page looks identical for unknown tokens — no information leaks.
// First unsubscribe mechanism in the codebase; kept generic enough to reuse.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';

const PAGE = `<!doctype html><html lang="en"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="robots" content="noindex"/>
<title>Unsubscribed · NXT//LINK</title>
<style>
  body{margin:0;background:#F8F7FB;color:#141320;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;display:flex;flex-direction:column;align-items:center;padding:48px 16px;}
  .brand{font-weight:800;letter-spacing:1.5px;font-size:16px;margin-bottom:22px;}
  .brand i{color:#6C5CE0;font-style:normal;}
  .card{width:100%;max-width:420px;background:#fff;border:1px solid #E2DFEC;border-radius:16px;padding:26px 22px;box-shadow:0 8px 30px rgba(74,61,176,.08);}
  h1{font-size:18px;margin:0 0 8px;}
  p{font-size:14px;color:#615F72;line-height:1.6;margin:0 0 14px;}
  .es{border-top:1px solid #E2DFEC;padding-top:14px;}
  a{color:#6C5CE0;}
</style></head><body>
<div class="brand">NXT<i>//</i>LINK</div>
<div class="card">
  <h1>You won’t hear from us again</h1>
  <p>You’re unsubscribed — no more invite emails will be sent to this address. If you change your mind, you’re always welcome at <a href="/vendor-signup">nxt-link</a>.</p>
  <div class="es">
    <h1>No volverá a saber de nosotros</h1>
    <p>Se dio de baja — no le enviaremos más correos de invitación a esta dirección. Si cambia de opinión, siempre será bienvenido en <a href="/vendor-signup">nxt-link</a>.</p>
  </div>
</div>
</body></html>`;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = String(url.searchParams.get('token') || '');

  if (token && isSupabaseConfigured()) {
    try {
      const db = getSupabaseClient({ admin: true });
      const { data: inv } = await db.from('vendor_invites').select('id, status').eq('token', token).maybeSingle();
      // Only pre-account statuses flip to opted_out (an account-holder's email
      // preferences are a different system); the stamp is recorded regardless.
      if (inv && ['invited', 'reminded', 'clicked'].includes(inv.status as string)) {
        await db.from('vendor_invites').update({ status: 'opted_out', opted_out_at: new Date().toISOString() }).eq('id', inv.id);
      } else if (inv) {
        await db.from('vendor_invites').update({ opted_out_at: new Date().toISOString() }).eq('id', inv.id);
      }
    } catch { /* still show the confirmation page */ }
  }

  return new NextResponse(PAGE, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
