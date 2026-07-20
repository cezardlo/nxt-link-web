// Browser Supabase client that stores the session in COOKIES (via
// @supabase/ssr), not localStorage — pairs with createServerSupabaseClient()
// so server routes (using next/headers cookies()) can see the same session.
// Use this for any client-side sign-in/sign-up flow whose session server API
// routes need to read (e.g. the vendor portal).

import { createBrowserClient } from '@supabase/ssr';

export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
