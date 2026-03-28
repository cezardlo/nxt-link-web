// src/lib/agents/agents/conference-exhibitor-detector.ts
// Conference Exhibitor Detector — scans incoming signals/feed items for
// conference and exhibitor-related content, marking them for the vendor pipeline.
// Hooks into the existing intel-discovery flow as a post-processor.

import type { ParsedItem } from '@/lib/rss/parser';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type ConferenceSignal = {
  title: string;
  link: string;
  source: string;
  conference_name: string;
  signal_type: 'exhibitor_list' | 'sponsor_list' | 'vendor_directory' | 'conference_announcement' | 'expo_coverage';
  confidence: number;
  detected_keywords: string[];
  detected_at: string;
};

// ─── Detection Patterns ─────────────────────────────────────────────────────────

const EXHIBITOR_PATTERNS: Array<{ type: ConferenceSignal['signal_type']; patterns: RegExp[]; weight: number }> = [
  {
    type: 'exhibitor_list',
    weight: 0.95,
    patterns: [
      /\bexhibitor\s+list\b/i,
      /\bexhibitors?\s+(?:directory|guide|catalog)\b/i,
      /\bwho(?:'s| is)\s+exhibiting\b/i,
      /\bbooth\s+(?:list|assignments?|map)\b/i,
      /\bexpo\s+(?:hall|floor|map|guide)\b/i,
    ],
  },
  {
    type: 'sponsor_list',
    weight: 0.90,
    patterns: [
      /\bsponsor\s+(?:list|directory|guide)\b/i,
      /\bsponsors?\s+announced\b/i,
      /\bplatinum|gold|silver|bronze\s+sponsor/i,
    ],
  },
  {
    type: 'vendor_directory',
    weight: 0.85,
    patterns: [
      /\bvendor\s+(?:directory|list|showcase)\b/i,
      /\bsolution\s+providers?\b/i,
      /\bparticipating\s+companies\b/i,
      /\bstartup\s+showcase\b/i,
    ],
  },
  {
    type: 'conference_announcement',
    weight: 0.70,
    patterns: [
      /\bconference\s+(?:20\d{2}|announce|registration)\b/i,
      /\btrade\s+show\b/i,
      /\bsummit\s+(?:20\d{2}|announce|open)\b/i,
      /\bexpo\s+(?:20\d{2}|announce|open|registration)\b/i,
    ],
  },
  {
    type: 'expo_coverage',
    weight: 0.65,
    patterns: [
      /\bat\s+(?:the\s+)?(?:conference|expo|summit|show|convention)\b/i,
      /\bexhibit(?:ed|ing)\s+at\b/i,
      /\bshowcas(?:ed|ing)\s+at\b/i,
      /\bdemonstrat(?:ed|ing)\s+at\b/i,
    ],
  },
];

const INDUSTRY_KEYWORDS = [
  'logistics', 'manufacturing', 'warehouse', 'automation', 'robotics',
  'trucking', 'supply chain', 'material handling', 'fleet', 'EV',
  'industrial', 'IoT', 'AI', 'cybersecurity', 'defense', 'energy',
  'construction', 'healthcare', 'pharma', 'biotech', 'agriculture',
  'mining', 'aviation', 'maritime', 'rail', 'automotive',
];

// Known conference name patterns
const CONFERENCE_NAME_RE = /\b(CES|MATS|MODEX|ProMat|Hannover\s+Messe|AUSA|DSEI|RSAC?|RSA\s+Conference|Black\s+Hat|DEF\s+CON|re:Invent|AWS\s+Summit|GTC|Automate|IMTS|FABTECH|PACK\s+EXPO|NPE|OTC|CERA\s+Week|World\s+Gas|HIMSS|MEDICA|BIO|CPhI|Agritechnica|SIMA|bauma|ConExpo|World\s+of\s+Concrete|CONEXPO|NRF|SXSW|Web\s+Summit|TechCrunch\s+Disrupt|Collision|MWC|IFA|Gartner\s+(?:Supply\s+Chain|IT|Security))\b/i;

// ─── Detector ───────────────────────────────────────────────────────────────────

/**
 * Scan a single feed item for conference/exhibitor signals.
 */
export function detectConferenceSignal(item: ParsedItem): ConferenceSignal | null {
  const text = `${item.title} ${item.description}`;
  const detectedKeywords: string[] = [];
  let bestMatch: { type: ConferenceSignal['signal_type']; weight: number } | null = null;

  // Check exhibitor patterns
  for (const group of EXHIBITOR_PATTERNS) {
    for (const pattern of group.patterns) {
      if (pattern.test(text)) {
        detectedKeywords.push(pattern.source.replace(/\\b/g, '').slice(0, 40));
        if (!bestMatch || group.weight > bestMatch.weight) {
          bestMatch = { type: group.type, weight: group.weight };
        }
      }
    }
  }

  if (!bestMatch) return null;

  // Check for industry relevance
  const hasIndustry = INDUSTRY_KEYWORDS.some((kw) =>
    text.toLowerCase().includes(kw),
  );

  // Try to extract conference name
  const confMatch = text.match(CONFERENCE_NAME_RE);
  const conferenceName = confMatch ? confMatch[1] : 'Unknown Conference';

  // Confidence boost if industry keyword present
  const confidence = Math.min(1, bestMatch.weight + (hasIndustry ? 0.05 : 0));

  return {
    title: item.title,
    link: item.link,
    source: item.source,
    conference_name: conferenceName,
    signal_type: bestMatch.type,
    confidence,
    detected_keywords: detectedKeywords,
    detected_at: new Date().toISOString(),
  };
}

/**
 * Batch scan feed items for conference/exhibitor signals.
 */
export function scanForConferenceSignals(items: ParsedItem[]): ConferenceSignal[] {
  const results: ConferenceSignal[] = [];
  for (const item of items) {
    const signal = detectConferenceSignal(item);
    if (signal) results.push(signal);
  }
  return results.sort((a, b) => b.confidence - a.confidence);
}

/**
 * RSS keyword search queries for conference/exhibitor discovery.
 * Use these with Google News RSS or similar feed aggregators.
 */
export const CONFERENCE_DISCOVERY_QUERIES = [
  // Exhibitor-focused
  '"exhibitor list" (logistics OR manufacturing OR warehouse OR automation)',
  '"exhibitor directory" (conference OR expo OR summit OR trade show)',
  '"vendor directory" (supply chain OR industrial OR trucking)',
  '"sponsor list" (technology OR AI OR robotics OR cybersecurity)',
  '"who is exhibiting" (conference OR expo OR show)',
  '"expo hall" (logistics OR manufacturing OR defense OR energy)',
  // Conference coverage
  '"startup showcase" (supply chain OR manufacturing OR logistics)',
  '"booth" "company" (trade show OR expo OR conference)',
  '"participating companies" (summit OR expo OR conference)',
];

/**
 * Google News RSS feed URLs for conference discovery.
 * These can be added to the feed-sources-registry for automated scanning.
 */
export function getConferenceDiscoveryFeeds(): Array<{
  id: string;
  name: string;
  url: string;
  cadenceHours: number;
}> {
  return CONFERENCE_DISCOVERY_QUERIES.map((query, i) => ({
    id: `conf-discovery-${i}`,
    name: `Conference Discovery: ${query.slice(0, 40)}...`,
    url: `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`,
    cadenceHours: 4,
  }));
}
