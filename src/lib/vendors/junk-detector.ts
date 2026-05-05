// Heuristics for detecting scraping artifacts that ended up in the vendors
// table — mid-sentence text fragments, JS variable names, page chrome
// strings, sponsorship-tier labels, etc. Designed to err on the side of
// false negatives (let some junk through) rather than false positives
// (kill a real company). Never run against rows whose source is 'yc'.

const STOP_END = /\s(the|and|or|in|on|at|to|for|of|with|from|by|including|during|when|that|this|these|those)\s*$/i;
const ARTICLE_START = /^(the|a|an)\s+/i;
const PAGE_CHROME = /(during the show|posted on|show floor|exhibit hall|networking break|coffee break|opening reception|closing reception|move-?in|move-?out|breakdown|booth setup|press kits|use it to send|take advantage of|attend to evaluate|expert support for|boost(s|) your visibility|key prospects)/i;
const SPONSOR_LABEL = /^(stand|booth|table|hall|level|silver|gold|bronze|platinum)\s*[-:—]/i;
const PRICE_TIER = /^\$|—\$|^bronze\s*—|^silver\s*—|^gold\s*—|^platinum\s*—/i;
const ADMIN_HEADERS = /^(meeting cadence|actual date|breakdown|exhibit$|sponsors?\s*&?\s*partners|webinars(\s*&\s*demos)?|training events|new exhibitors|regional events|patroc(i|í)nadora\s+anfitriãa?\s+\d{4}|share recent|navigate the show|another successful)/i;
// Single common english stopwords / fragment words that real brands don't typically equal
const STOP_WORDS = new Set([
  'the','and','or','of','for','with','from','by','in','on','at','to','as','is','are','was','were',
  'breakdown','breakdown.','convention','exhibit','exhibitor','exhibition','sponsor','sponsorship','event','events',
  'free','professional','enterprise','startup','resource','technology','engineering','consulting','consulting.','government',
  'mid-market','small','medium','large','services','provider','providers','solution','solutions',
  'world','global','regional','local',
  'speakersfeature','autoselectedcurrency','dynamic_base','currentnav', // JS variable artefacts seen in samples
]);

export function isJunkVendorName(rawName: string | null | undefined): boolean {
  if (!rawName) return true;
  const name = rawName.trim();
  if (name.length < 3 || name.length > 100) return true;
  if (/^\d+$/.test(name)) return true;
  if (/^[\W_]+$/.test(name)) return true;
  if (/,\s*$/.test(name)) return true;
  if (STOP_END.test(name)) return true;
  if (ARTICLE_START.test(name)) return true;
  if (PAGE_CHROME.test(name)) return true;
  if (SPONSOR_LABEL.test(name)) return true;
  if (PRICE_TIER.test(name)) return true;
  if (ADMIN_HEADERS.test(name)) return true;
  if (STOP_WORDS.has(name.toLowerCase())) return true;

  // Lowercase-start handling: real brands exist (byrd, stripe, hoop.dev, etc.)
  // but lowercase + multi-word usually = mid-sentence text. Allow lowercase
  // single-token brands of any reasonable length; flag multi-word lowercase
  // and very-short lowercase tokens.
  if (/^[a-z]/.test(name)) {
    if (/\s/.test(name)) return true; // multi-word lowercase: junk
    if (name.length < 4 && /^[a-z]+$/.test(name)) return true; // 3-letter pure lowercase: probably a stopword
  }

  // Names with five or more words AND no uppercase letter past the first
  // are almost certainly mid-sentence text.
  if (name.split(/\s+/).length >= 5 && !/[A-Z]{2,}|[A-Z]\w*\s+[A-Z]/.test(name)) {
    // Multi-word phrase with at most one capitalised word: page chrome
    return true;
  }

  return false;
}

// Given a sponsor-style URL pattern, decide if the row is a sponsor-page
// reference rather than a real vendor (e.g. leaders-in-logistics.com/sponsors/X)
const SPONSOR_URL_PATTERNS = [
  /\/sponsors?\//i,
  /\/exhibitors?\/[^/]+\/?$/i,
  /wbresearch\.com/i,
  /amarillothermoking\.com/i,
];
export function looksLikeSponsorTemplateUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return SPONSOR_URL_PATTERNS.some((re) => re.test(url));
}

// ---------------------------------------------------------------------------
// Junk descriptions: scraping artefacts where a vendor row ended up with text
// from an unrelated page — Microsoft sign-in chrome, hotel booking
// boilerplate, sponsor-event blurbs, etc. Better to blank than to mislead.

const JUNK_DESC_PATTERNS = [
  /^posted on\s*[.!]?$/i,
  /^lorem ipsum/i,
  /kostenlose e-mail-?adresse/i,        // German Microsoft sign-in template
  /book direct with .*\.com/i,           // Hotel booking boilerplate
  /find your stay from our economic/i,
  /save now!/i,
  /create a free .* account/i,
  /sign in with (your|microsoft|google|apple)/i,
  /benefit from our special rates/i,
  /congresos? eventos y ferias/i,        // Spanish event mgmt boilerplate
  /^the leader in american-made/i,
  /^see attached/i,
  /^click here/i,
  /^read more/i,
  /^learn more/i,
  /^visit (us|our)/i,
  /^[•·\-*]\s/,                          // bullet list fragments
];

export function isJunkDescription(desc: string | null | undefined): boolean {
  if (!desc) return false; // null is NOT junk — it just means no description
  const d = desc.trim();
  if (d.length < 10) return true;        // too short
  if (d.length > 5000) return true;       // probably a page dump
  if (JUNK_DESC_PATTERNS.some((re) => re.test(d))) return true;
  return false;
}

// Strip common HTML entities from a description in place. Cheap pass.
export function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}
