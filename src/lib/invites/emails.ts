// Bilingual (EN/ES) copy for the vendor invite funnel emails, shared by
// POST /api/admin/invites (Email 1) and /api/cron/invite-reminders (day 2 /
// day 5 / day 9). Copy source: workplace/plans/growth-and-invites.md §2 —
// Email 1 uses the no-match variant (we never invent buyer demand), Email 3
// is VARIANT B (pre-escrow), the day-9 email is the honest close.
//
// ⚠️ COPY GATES (MASTER-PLAN §3 — binding):
//   - NEVER promise escrow or say "NXT//LINK holds your money" — Variant B
//     copy only, until Payments P1 is live.
//   - The $1,250 first-deal credit is NOT mentioned (pending attorney sign-off).
//   - Fee facts we MAY state: 5% on the first $50k, 3% above, capped at
//     $20,000, charged only when a deal closes. Quoting is free.
//   - Every email carries the unsubscribe link (hard stop rule).

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://nxt-link-web.vercel.app').replace(/\/$/, '');

export type InviteWave = 'invite' | 'day2' | 'day5' | 'day9';

export interface InviteEmailInput {
  token: string;
  contact_name: string | null;
  company_name: string | null;
  locale: string | null;          // 'en' | 'es' — which language leads
  invited_by?: string | null;     // operator label; signature name
}

const SEP = '\n\n——————————————————————————\n\n';

function firstName(name: string | null | undefined): string {
  return (name || '').trim().split(/\s+/)[0] || '';
}

export function joinUrl(token: string): string {
  return `${SITE}/join/${token}`;
}

export function unsubscribeUrl(token: string): string {
  return `${SITE}/api/invites/unsubscribe?token=${encodeURIComponent(token)}`;
}

function footer(token: string): string {
  return `Don’t want these emails? Unsubscribe: ${unsubscribeUrl(token)}\n¿No quiere recibir estos correos? Darse de baja: ${unsubscribeUrl(token)}`;
}

export function inviteEmail(inv: InviteEmailInput, wave: InviteWave): { subject: string; body: string } {
  const name = firstName(inv.contact_name);
  const company = (inv.company_name || '').trim() || 'your company';
  const companyEs = (inv.company_name || '').trim() || 'su empresa';
  const operator = (inv.invited_by || '').trim() || 'The NXT//LINK team';
  const operatorEs = (inv.invited_by || '').trim() || 'El equipo de NXT//LINK';
  const link = joinUrl(inv.token);
  const es = inv.locale === 'es';

  let subjectEn = '', subjectEs = '', bodyEn = '', bodyEs = '';

  if (wave === 'invite') {
    // Email 1 — the invite (Day 0), no-match variant. Promise: a direct,
    // personal invite. No invented demand, no credit-card, no paperwork.
    subjectEn = `${company} is invited to NXT//LINK`;
    subjectEs = `${companyEs} está invitada a NXT//LINK`;
    bodyEn =
`Hi ${name || 'there'},

I’m with NXT//LINK — the El Paso–Juárez marketplace where industrial buyers post what they need and local vendors quote it.

We’re inviting a small group of companies in the Borderplex that buyers on the platform ask for. When a matching request comes in, ${company} will see it first.

Sending a quote is free · no commitment. You only ever pay a commission when a deal actually closes — the rates are published on the site.

Your account takes under a minute — no credit card, no paperwork:

Create my free account → ${link}

Questions? Reply to this email. Hablamos español.

${operator}
NXT//LINK · El Paso–Juárez Borderplex`;
    bodyEs =
`Hola ${name || ''}:

Le escribo de NXT//LINK — el marketplace de El Paso y Juárez donde compradores industriales publican lo que necesitan y proveedores locales cotizan.

Estamos invitando a un grupo pequeño de empresas de la región fronteriza que los compradores de la plataforma buscan. Cuando llegue una solicitud que coincida, ${companyEs} la verá primero.

Enviar una cotización es gratis · sin compromiso. Solo se paga una comisión cuando un trato se cierra de verdad — las tarifas están publicadas en el sitio.

Su cuenta toma menos de un minuto — sin tarjeta, sin papeleo:

Crear mi cuenta gratis → ${link}

¿Dudas? Responda este correo.

${operatorEs}
NXT//LINK · Región fronteriza El Paso–Juárez`;
  } else if (wave === 'day2') {
    // Email 2 — reminder (Day 2). ONE promise: quoting is free.
    subjectEn = 'Quoting is free on NXT//LINK — no commitment';
    subjectEs = 'Cotizar en NXT//LINK es gratis — sin compromiso';
    bodyEn =
`Hi ${name || 'there'},

Quick follow-up on the invite I sent ${company}. Your page on NXT//LINK is still waiting — it takes about a minute to claim.

What it costs to look, to sign up, and to send quotes: nothing. Free to send · no commitment. A commission applies only if you close a deal, and the rates are published — no surprises.

Create my free account → ${link}

If it’s not a fit, reply “not for us” and I won’t bother you again.

${operator} · NXT//LINK`;
    bodyEs =
`Hola ${name || ''}:

Le doy seguimiento a la invitación que le envié a ${companyEs}. Su página en NXT//LINK sigue esperando — reclamarla toma alrededor de un minuto.

Lo que cuesta ver la plataforma, registrarse y cotizar: nada. Gratis · sin compromiso. La comisión aplica solo si cierra un trato, y las tarifas están publicadas — sin sorpresas.

Crear mi cuenta gratis → ${link}

Si no es para ustedes, responda “no nos interesa” y no le vuelvo a escribir.

${operatorEs} · NXT//LINK`;
  } else if (wave === 'day5') {
    // Email 3 — reminder (Day 5), VARIANT B (pre-escrow). ONE promise: the
    // fee rules, in writing. ⚠️ Do NOT swap in the escrow variant until
    // Payments P1 is live (MASTER-PLAN copy gate).
    subjectEn = 'Our fee rules, in writing — no monthly fee, no surprises';
    subjectEs = 'Nuestras tarifas, por escrito — sin mensualidad, sin sorpresas';
    bodyEn =
`Hi ${name || 'there'},

Before you decide, here’s exactly how the money works — in writing:

• No monthly fee. No fee to quote. Free to send · no commitment.
• Commission only when a deal closes: 5% on the first $50k, 3% above that, capped at $20,000.
• Deal refunded in full? You owe nothing.

That’s the whole model. We make money only when ${company} does.

Create my free account → ${link}

${operator} · NXT//LINK`;
    bodyEs =
`Hola ${name || ''}:

Antes de decidir, así funciona el dinero — por escrito:

• Sin mensualidad. Cotizar no cuesta. Gratis · sin compromiso.
• Comisión solo cuando un trato se cierra: 5% sobre los primeros $50,000 USD, 3% sobre el resto, con tope de $20,000.
• ¿Trato reembolsado por completo? Usted no debe nada.

Ese es todo el modelo. Nosotros ganamos solo cuando ${companyEs} gana.

Crear mi cuenta gratis → ${link}

${operatorEs} · NXT//LINK`;
  } else {
    // Final email — the honest close (Day 9). The sequence ends permanently
    // after this one; the /join link stays valid until the 30-day expiry.
    subjectEn = 'Last note from me — the door stays open';
    subjectEs = 'Último mensaje de mi parte — la puerta queda abierta';
    bodyEn =
`Hi ${name || 'there'},

I’ll keep this short: this is my last email about the invite. No hard feelings if the timing’s wrong — you know your business.

Three things that stay true:

• Your invite stays open: ${link}
• If you’d rather I check back in a few months, just reply “later.”
• If you never want to hear from us, reply “stop” — or use the link at the bottom — and that’s that.

Whatever you choose — good luck out there, and thanks for reading.

${operator} · NXT//LINK`;
    bodyEs =
`Hola ${name || ''}:

Seré breve: este es mi último correo sobre la invitación. Sin problema si no es el momento — usted conoce su negocio.

Tres cosas que siguen en pie:

• Su invitación queda abierta: ${link}
• Si prefiere que le escriba en unos meses, responda “después”.
• Si prefiere que no le escribamos más, responda “no” — o use el enlace de abajo — y así será.

Decida lo que decida — mucho éxito, y gracias por leer.

${operatorEs} · NXT//LINK`;
  }

  // Locale-first ordering (same convention as the approval welcome email).
  const subject = es ? subjectEs : subjectEn;
  const body = (es ? `${bodyEs}${SEP}${bodyEn}` : `${bodyEn}${SEP}${bodyEs}`) + `\n\n——\n${footer(inv.token)}`;
  return { subject, body };
}
