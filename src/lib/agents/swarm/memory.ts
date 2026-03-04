// Swarm shared memory (blackboard) — NXT//LINK platform
// All agents write findings here; other agents read and act on them.

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';

export type SwarmEntryType = 'finding' | 'entity' | 'signal' | 'risk' | 'trend' | 'recommendation';

export type SwarmMemoryEntry = {
  id: string;
  agent_name: string;
  entry_type: SwarmEntryType;
  topic: string;
  content: Record<string, unknown>;
  confidence: number;
  tags: string[];
  created_at: string;
  expires_at: string;
  read_by: string[];
};

export type SwarmMemoryFilter = {
  topic?: string;
  entry_type?: SwarmEntryType;
  agent_name?: string;
  tags?: string[];
  min_confidence?: number;
  limit?: number;
};

// In-memory fallback when Supabase isn't configured
const memoryStore = new Map<string, SwarmMemoryEntry>();
let memoryCounter = 0;

export async function swarmMemoryWrite(
  entry: Omit<SwarmMemoryEntry, 'id' | 'created_at' | 'expires_at' | 'read_by'>,
): Promise<string> {
  if (!isSupabaseConfigured()) {
    const id = `local-${++memoryCounter}`;
    const full: SwarmMemoryEntry = {
      ...entry,
      id,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      read_by: [],
    };
    memoryStore.set(id, full);
    return id;
  }

  const supabase = createClient({ admin: true });
  const { data, error } = await supabase
    .from('swarm_memory')
    .insert({
      agent_name: entry.agent_name,
      entry_type: entry.entry_type,
      topic: entry.topic,
      content: entry.content,
      confidence: entry.confidence,
      tags: entry.tags,
    })
    .select('id')
    .single();

  if (error) {
    console.warn('[SwarmMemory] Write failed:', error.message);
    // Fall back to local store
    const id = `local-${++memoryCounter}`;
    memoryStore.set(id, {
      ...entry,
      id,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      read_by: [],
    });
    return id;
  }

  return (data as { id: string }).id;
}

export async function swarmMemoryRead(filters: SwarmMemoryFilter = {}): Promise<SwarmMemoryEntry[]> {
  if (!isSupabaseConfigured()) {
    let entries = Array.from(memoryStore.values() as Iterable<SwarmMemoryEntry>);
    if (filters.topic) entries = entries.filter((e) => e.topic === filters.topic);
    if (filters.entry_type) entries = entries.filter((e) => e.entry_type === filters.entry_type);
    if (filters.agent_name) entries = entries.filter((e) => e.agent_name === filters.agent_name);
    if (filters.min_confidence !== undefined) {
      const min = filters.min_confidence;
      entries = entries.filter((e) => e.confidence >= min);
    }
    if (filters.tags?.length) {
      const filterTags = filters.tags;
      entries = entries.filter((e) => filterTags.some((t) => e.tags.includes(t)));
    }
    entries.sort((a, b) => b.confidence - a.confidence);
    return entries.slice(0, filters.limit ?? 50);
  }

  const supabase = createClient({ admin: true });
  let query = supabase
    .from('swarm_memory')
    .select('*')
    .order('confidence', { ascending: false })
    .limit(filters.limit ?? 50);

  if (filters.topic) query = query.eq('topic', filters.topic);
  if (filters.entry_type) query = query.eq('entry_type', filters.entry_type);
  if (filters.agent_name) query = query.eq('agent_name', filters.agent_name);
  if (filters.min_confidence !== undefined) query = query.gte('confidence', filters.min_confidence);
  if (filters.tags?.length) query = query.overlaps('tags', filters.tags);

  const { data, error } = await query;
  if (error) {
    console.warn('[SwarmMemory] Read failed:', error.message);
    return [];
  }
  return (data ?? []) as SwarmMemoryEntry[];
}

export async function swarmMemoryReadRecent(limit = 20): Promise<SwarmMemoryEntry[]> {
  if (!isSupabaseConfigured()) {
    return Array.from(memoryStore.values() as Iterable<SwarmMemoryEntry>)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);
  }

  const supabase = createClient({ admin: true });
  const { data, error } = await supabase
    .from('swarm_memory')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('[SwarmMemory] ReadRecent failed:', error.message);
    return [];
  }
  return (data ?? []) as SwarmMemoryEntry[];
}

export async function swarmMemoryMarkRead(entryId: string, agentName: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    const entry = memoryStore.get(entryId);
    if (entry && !entry.read_by.includes(agentName)) {
      entry.read_by.push(agentName);
    }
    return;
  }

  const supabase = createClient({ admin: true });
  await supabase
    .rpc('swarm_memory_mark_read', { entry_id: entryId, reader: agentName })
    .then(() => {});
}
