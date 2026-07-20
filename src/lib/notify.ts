// Tiny in-app notification helper. Best-effort: never blocks or fails the
// action that triggered it.

import type { SupabaseClient } from '@supabase/supabase-js';

export async function notifyVendor(db: SupabaseClient, vendorId: string, quoteRequestId: string | null, type: string, title: string) {
  try {
    await db.from('notifications').insert({ recipient: 'vendor', vendor_id: vendorId, quote_request_id: quoteRequestId, type, title });
  } catch { /* best effort */ }
}

export async function notifyBuyer(db: SupabaseClient, buyerEmail: string, quoteRequestId: string | null, type: string, title: string) {
  if (!buyerEmail) return;
  try {
    await db.from('notifications').insert({ recipient: 'buyer', buyer_email: buyerEmail, quote_request_id: quoteRequestId, type, title });
  } catch { /* best effort */ }
}
