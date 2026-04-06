import path from 'path';
import { promises as fs } from 'fs';

import {
  addRelationship,
  type EntityType,
  upsertEntity,
} from '@/db/queries/knowledge-graph';

export type ObsidianNoteEntity = {
  id: string;
  slug: string;
  type: EntityType;
  name: string;
  sourcePath: string;
  tags: string[];
  aliases: string[];
  metadata: Record<string, unknown>;
};

export type ObsidianRelationship = {
  source: string;
  target: string;
  type: 'related_to' | 'belongs_to';
  confidence: number;
  evidence: string;
};

export type ObsidianImportReport = {
  vaultPath: string;
  notesScanned: number;
  entities: ObsidianNoteEntity[];
  relationships: ObsidianRelationship[];
};

type ParsedNote = {
  filePath: string;
  relativePath: string;
  title: string;
  entityType: EntityType;
  tags: string[];
  aliases: string[];
  wikiLinks: string[];
};

const NOTE_TYPE_MAP: Record<string, EntityType> = {
  company: 'company',
  vendor: 'company',
  industry: 'industry',
  technology: 'technology',
  product: 'product',
  event: 'event',
  location: 'location',
  signal: 'signal',
  problem: 'problem',
  policy: 'policy',
  opportunity: 'opportunity',
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function deriveEntityType(relativePath: string, frontmatterType?: string): EntityType {
  const direct = frontmatterType ? NOTE_TYPE_MAP[frontmatterType.trim().toLowerCase()] : undefined;
  if (direct) return direct;

  const lowered = relativePath.toLowerCase();
  if (lowered.includes('vendor')) return 'company';
  if (lowered.includes('compan')) return 'company';
  if (lowered.includes('industr')) return 'industry';
  if (lowered.includes('technolog')) return 'technology';
  if (lowered.includes('product')) return 'product';
  if (lowered.includes('event') || lowered.includes('conference')) return 'event';
  if (lowered.includes('location') || lowered.includes('place') || lowered.includes('region')) return 'location';
  if (lowered.includes('policy')) return 'policy';
  if (lowered.includes('signal')) return 'signal';
  return 'discovery';
}

function parseFrontmatter(text: string): { body: string; fields: Record<string, string> } {
  if (!text.startsWith('---\n') && !text.startsWith('---\r\n')) {
    return { body: text, fields: {} };
  }

  const lines = text.split(/\r?\n/);
  if (lines[0] !== '---') {
    return { body: text, fields: {} };
  }

  const fields: Record<string, string> = {};
  let endIndex = -1;
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line === '---') {
      endIndex = i;
      break;
    }
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.+)$/);
    if (match) {
      fields[match[1].toLowerCase()] = match[2].trim();
    }
  }

  if (endIndex === -1) {
    return { body: text, fields: {} };
  }

  return {
    body: lines.slice(endIndex + 1).join('\n'),
    fields,
  };
}

function parseInlineTags(text: string): string[] {
  return Array.from(new Set(Array.from(text.matchAll(/(^|\s)#([a-zA-Z0-9/_-]+)/g)).map((match) => match[2].toLowerCase())));
}

function parseWikiLinks(text: string): string[] {
  return Array.from(
    new Set(
      Array.from(text.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g))
        .map((match) => match[1].trim())
        .filter(Boolean)
    )
  );
}

function parseAliases(value?: string): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

async function collectMarkdownFiles(root: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await fs.readdir(root, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.')) continue;
      results.push(...(await collectMarkdownFiles(fullPath)));
      continue;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      results.push(fullPath);
    }
  }

  return results;
}

async function parseNote(vaultPath: string, filePath: string): Promise<ParsedNote> {
  const raw = await fs.readFile(filePath, 'utf8');
  const relativePath = path.relative(vaultPath, filePath);
  const { body, fields } = parseFrontmatter(raw);

  const heading = body.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const baseName = path.basename(filePath, '.md');
  const title = fields.title || heading || baseName;
  const tags = [
    ...parseAliases(fields.tags),
    ...parseInlineTags(body),
  ].map((tag) => tag.replace(/^#/, '').toLowerCase());

  return {
    filePath,
    relativePath,
    title,
    entityType: deriveEntityType(relativePath, fields.type),
    tags: Array.from(new Set(tags)),
    aliases: parseAliases(fields.aliases),
    wikiLinks: parseWikiLinks(body),
  };
}

export async function loadObsidianImportReport(vaultPath = process.env.OBSIDIAN_VAULT_PATH): Promise<ObsidianImportReport> {
  if (!vaultPath) {
    throw new Error('OBSIDIAN_VAULT_PATH is not set.');
  }

  const resolvedVaultPath = path.resolve(vaultPath);
  const stats = await fs.stat(resolvedVaultPath).catch(() => null);
  if (!stats?.isDirectory()) {
    throw new Error(`Obsidian vault not found: ${resolvedVaultPath}`);
  }

  const markdownFiles = await collectMarkdownFiles(resolvedVaultPath);
  const parsedNotes = await Promise.all(markdownFiles.map((filePath) => parseNote(resolvedVaultPath, filePath)));

  const entities: ObsidianNoteEntity[] = parsedNotes.map((note) => ({
    id: `note:${slugify(note.relativePath)}`,
    slug: slugify(note.title),
    type: note.entityType,
    name: note.title,
    sourcePath: note.relativePath,
    tags: note.tags,
    aliases: note.aliases,
    metadata: {
      vault_path: note.relativePath,
      tags: note.tags,
      aliases: note.aliases,
    },
  }));

  const noteByTitle = new Map<string, ObsidianNoteEntity>();
  for (const entity of entities) {
    noteByTitle.set(entity.name.toLowerCase(), entity);
  }

  const relationships: ObsidianRelationship[] = [];

  for (const note of parsedNotes) {
    const source = noteByTitle.get(note.title.toLowerCase());
    if (!source) continue;

    for (const link of note.wikiLinks) {
      const target = noteByTitle.get(link.toLowerCase());
      if (!target || target.id === source.id) continue;
      relationships.push({
        source: source.id,
        target: target.id,
        type: 'related_to',
        confidence: 0.85,
        evidence: `${source.name} -> [[${link}]]`,
      });
    }

    for (const tag of note.tags) {
      const tagId = `tag:${slugify(tag)}`;
      relationships.push({
        source: source.id,
        target: tagId,
        type: 'belongs_to',
        confidence: 0.62,
        evidence: `${source.name} tagged #${tag}`,
      });
    }
  }

  const tagEntities: ObsidianNoteEntity[] = Array.from(
    new Set(parsedNotes.flatMap((note) => note.tags))
  ).map((tag) => ({
    id: `tag:${slugify(tag)}`,
    slug: slugify(tag),
    type: 'discovery',
    name: tag,
    sourcePath: '#tag',
    tags: [],
    aliases: [],
    metadata: {
      source: 'obsidian-tag',
    },
  }));

  return {
    vaultPath: resolvedVaultPath,
    notesScanned: parsedNotes.length,
    entities: [...entities, ...tagEntities],
    relationships,
  };
}

export async function persistObsidianImportReport(report: ObsidianImportReport): Promise<{ entities: number; relationships: number }> {
  const entityIdMap = new Map<string, string>();
  let entities = 0;
  let relationships = 0;

  for (const entity of report.entities) {
    const persistedId = await upsertEntity({
      entity_type: entity.type,
      name: entity.name,
      slug: entity.slug,
      metadata: entity.metadata,
      aliases: entity.aliases,
    });
    if (!persistedId) continue;
    entities += 1;
    entityIdMap.set(entity.id, persistedId);
  }

  for (const relationship of report.relationships) {
    const sourceId = entityIdMap.get(relationship.source);
    const targetId = entityIdMap.get(relationship.target);
    if (!sourceId || !targetId) continue;
    const relId = await addRelationship(
      sourceId,
      targetId,
      relationship.type,
      relationship.confidence,
      relationship.evidence
    );
    if (relId) relationships += 1;
  }

  return { entities, relationships };
}
