// src/lib/scraping/clean-content.ts
// Strips noise from scraped HTML, keeps meaningful text content.

export type CleanedContent = {
  url: string;
  title: string;
  text: string;
  headings: string[];
  lists: string[];
  charCount: number;
};

/**
 * Strips an HTML string down to clean, structured text.
 * Removes nav, footer, scripts, styles, ads, and other noise.
 */
export function cleanHtml(html: string, url: string): CleanedContent {
  let cleaned = html;

  // Remove entire blocks that are never useful
  const removeBlocks = [
    /<script[\s\S]*?<\/script>/gi,
    /<style[\s\S]*?<\/style>/gi,
    /<noscript[\s\S]*?<\/noscript>/gi,
    /<nav[\s\S]*?<\/nav>/gi,
    /<footer[\s\S]*?<\/footer>/gi,
    /<header[\s\S]*?<\/header>/gi,
    /<!--[\s\S]*?-->/g,
    /<iframe[\s\S]*?<\/iframe>/gi,
    /<svg[\s\S]*?<\/svg>/gi,
    /<form[\s\S]*?<\/form>/gi,
  ];

  for (const pattern of removeBlocks) {
    cleaned = cleaned.replace(pattern, ' ');
  }

  // Extract title
  const titleMatch = cleaned.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch?.[1]?.trim().replace(/\s+/g, ' ') ?? '';

  // Extract headings for structure
  const headings: string[] = [];
  const headingRegex = /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi;
  let headingMatch: RegExpExecArray | null;
  while ((headingMatch = headingRegex.exec(cleaned)) !== null) {
    const text = stripTags(headingMatch[1]).trim();
    if (text.length > 2 && text.length < 200) {
      headings.push(text);
    }
  }

  // Extract list items (often contain exhibitor/product info)
  const lists: string[] = [];
  const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let liMatch: RegExpExecArray | null;
  while ((liMatch = liRegex.exec(cleaned)) !== null) {
    const text = stripTags(liMatch[1]).trim();
    if (text.length > 5 && text.length < 500) {
      lists.push(text);
    }
  }

  // Strip all remaining HTML tags
  let text = stripTags(cleaned);

  // Clean up whitespace
  text = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#\d+;/g, ' ')
    .replace(/\t/g, ' ')
    .replace(/ {2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Remove very short lines (likely nav remnants)
  text = text
    .split('\n')
    .filter(line => line.trim().length > 3)
    .join('\n');

  return {
    url,
    title,
    text,
    headings: [...new Set(headings)].slice(0, 50),
    lists: lists.slice(0, 100),
    charCount: text.length,
  };
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
}

/**
 * Cleans multiple scraped pages.
 */
export function cleanPages(
  pages: Array<{ url: string; html: string }>,
): CleanedContent[] {
  return pages
    .map(p => cleanHtml(p.html, p.url))
    .filter(c => c.charCount > 50); // Drop pages with almost no content
}
