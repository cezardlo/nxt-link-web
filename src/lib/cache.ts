import { createClient } from '@supabase/supabase-js';

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const db = getDb();
    const { data } = await db
      .from('cache_store')
      .select('data, expires_at')
      .eq('cache_key', key)
      .single();
    if (!data) return null;
    if (new Date(data.expires_at) < new Date()) {
      db.from('cache_store').delete().eq('cache_key', key).then(() => {});
      return null;
    }
    return data.data as T;
  } catch {
    return null;
  }
}

export async function setCache(key: string, data: unknown, ttlMinutes: number = 240): Promise<void> {
  try {
    const db = getDb();
    const expires_at = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
    await db
      .from('cache_store')
      .upsert({ cache_key: key, data, expires_at }, { onConflict: 'cache_key' });
  } catch {
    // Silent fail
  }
}

export async function logQuota(agent: string, endpoint: string, tokensIn: number, tokensOut: number): Promise<void> {
  try {
    const db = getDb();
    await db.from('api_quota_log').insert({
      agent_name: agent,
      endpoint,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
    });
  } catch {
    // Silent fail
  }
}

export async function getTodayQuotaCount(): Promise<number> {
  try {
    const db = getDb();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count } = await db
      .from('api_quota_log')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());
    return count || 0;
  } catch {
    return 0;
  }
}
