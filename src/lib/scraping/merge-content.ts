// src/lib/scraping/merge-content.ts
// Merges cleaned page contents into a single structured text blob for LLM extraction.

import type { CleanedContent } from './clean-content';

export type MergedContent = {
  text: string;
  totalChars: number;
  pageCount: number;
  sources: string[];
};

const MAX_MERGED_CHARS = 80_000; // Stay well within LLM context limits
const MAX_PER_PAGE_CHARS = 20_000;

/**
 * Merges multiple cleaned pages into one structured text blob.
 * Prioritizes exhibitor/sponsor pages by placing them first.
 * Deduplicates content across pages.
 */
export function mergeContent(pages: CleanedContent[]): MergedContent {
  if (pages.length === 0) {
    return { text: '', totalChars: 0, pageCount: 0, sources: [] };
  }

  const sections: string[] = [];
  const sources: string[] = [];
  let totalChars = 0;

  // Sort: exhibitor-like pages first (they have the most useful data)
  const sorted = [...pages].sort((a, b) => {
    const aScore = pageRelevanceScore(a);
    const bScore = pageRelevanceScore(b);
    return bScore - aScore;
  });

  for (const page of sorted) {
    if (totalChars >= MAX_MERGED_CHARS) break;

    const remaining = MAX_MERGED_CHARS - totalChars;
    const pageText = truncateContent(page, Math.min(remaining, MAX_PER_PAGE_CHARS));

    if (pageText.length < 50) continue;

    sections.push(pageText);
    sources.push(page.url);
    totalChars += pageText.length;
  }

  const text = sections.join('\n\n---\n\n');

  return {
    text,
    totalChars: text.length,
    pageCount: sources.length,
    sources,
  };
}

function pageRelevanceScore(page: CleanedContent): number {
  const url = page.url.toLowerCase();
  if (/exhibitor|vendor|company|expo|marketplace/i.test(url)) return 100;
  if (/sponsor|partner/i.test(url)) return 80;
  if (/attend|audience|visitor|delegate/i.test(url)) return 70;
  if (/speaker|keynote/i.test(url)) return 60;
  if (/agenda|schedule|program/i.test(url)) return 50;
  if (/about|overview/i.test(url)) return 40;
  return 10;
}

function truncateContent(page: CleanedContent, maxChars: number): string {
  const parts: string[] = [];

  // Title
  if (page.title) {
    parts.push(`# ${page.title}`);
  }

  // Source URL
  parts.push(`Source: ${page.url}`);

  // Headings provide structure
  if (page.headings.length > 0) {
    parts.push(`Key sections: ${page.headings.slice(0, 20).join(' | ')}`);
  }

  // List items (often contain exhibitor names/descriptions)
  if (page.lists.length > 0) {
    parts.push('Listed items:');
    for (const item of page.lists.slice(0, 50)) {
      parts.push(`- ${item}`);
    }
  }

  // Main text content
  if (page.text) {
    parts.push(page.text);
  }

  const merged = parts.join('\n');
  return merged.slice(0, maxChars);
}
