// ─── Company Logo Resolution ─────────────────────────────────────────────────
// Uses Clearbit Logo API (free, no key required) to resolve company logos
// from domain names. Falls back to website URL domain extraction.
//
// Usage:
//   getCompanyLogoUrl('Palantir')         → 'https://logo.clearbit.com/palantir.com'
//   getCompanyLogoUrl('Unknown Startup')  → null
//   domainFromUrl('https://l3harris.com') → 'l3harris.com'

const COMPANY_DOMAINS: Record<string, string> = {
  // ── Big Tech / AI ──
  'openai': 'openai.com',
  'anthropic': 'anthropic.com',
  'meta': 'meta.com',
  'meta ai': 'meta.com',
  'google': 'google.com',
  'google cloud': 'cloud.google.com',
  'deepmind': 'deepmind.com',
  'microsoft': 'microsoft.com',
  'azure': 'azure.microsoft.com',
  'aws': 'aws.amazon.com',
  'amazon': 'amazon.com',
  'apple': 'apple.com',
  'nvidia': 'nvidia.com',
  'ibm': 'ibm.com',
  'oracle': 'oracle.com',
  'salesforce': 'salesforce.com',
  'cisco': 'cisco.com',
  'intel': 'intel.com',
  'qualcomm': 'qualcomm.com',
  'samsung': 'samsung.com',
  'tesla': 'tesla.com',

  // ── AI / ML Companies ──
  'palantir': 'palantir.com',
  'palantir technologies': 'palantir.com',
  'scale ai': 'scale.com',
  'databricks': 'databricks.com',
  'figure ai': 'figure.ai',
  'mistral ai': 'mistral.ai',
  'xai': 'x.ai',
  'cohere': 'cohere.com',
  'hugging face': 'huggingface.co',
  'stability ai': 'stability.ai',

  // ── Defense / Aerospace ──
  'l3harris': 'l3harris.com',
  'l3harris technologies': 'l3harris.com',
  'raytheon': 'rtx.com',
  'rtx': 'rtx.com',
  'lockheed martin': 'lockheedmartin.com',
  'boeing': 'boeing.com',
  'northrop grumman': 'northropgrumman.com',
  'bae systems': 'baesystems.com',
  'general dynamics': 'gd.com',
  'gdit': 'gdit.com',
  'saic': 'saic.com',
  'leidos': 'leidos.com',
  'anduril': 'anduril.com',
  'anduril industries': 'anduril.com',
  'shield ai': 'shield.ai',
  'sarcos': 'sarcos.com',

  // ── Cybersecurity ──
  'crowdstrike': 'crowdstrike.com',
  'palo alto networks': 'paloaltonetworks.com',
  'fortinet': 'fortinet.com',
  'zscaler': 'zscaler.com',
  'sentinelone': 'sentinelone.com',
  'mandiant': 'mandiant.com',
  'fireeye': 'fireeye.com',
  'tenable': 'tenable.com',
  'rapid7': 'rapid7.com',
  'trellix': 'trellix.com',

  // ── Enterprise / Data ──
  'datadog': 'datadoghq.com',
  'snowflake': 'snowflake.com',
  'splunk': 'splunk.com',
  'elastic': 'elastic.co',
  'confluent': 'confluent.io',
  'hashicorp': 'hashicorp.com',
  'twilio': 'twilio.com',
  'stripe': 'stripe.com',

  // ── Security / Surveillance ──
  'verkada': 'verkada.com',
  'flock safety': 'flocksafety.com',
  'motorola solutions': 'motorolasolutions.com',
  'motorola': 'motorolasolutions.com',
  'axon': 'axon.com',

  // ── Government / Education (El Paso) ──
  'utep': 'utep.edu',
  'nmsu': 'nmsu.edu',
  'texas tech': 'ttu.edu',
  'fort bliss': 'army.mil',
  'cbp': 'cbp.gov',
  'dhs': 'dhs.gov',
  'sandia': 'sandia.gov',
  'los alamos': 'lanl.gov',

  // ── El Paso Local ──
  'el paso electric': 'epelectric.com',
  'hunt companies': 'huntcompanies.com',
  'borderplex alliance': 'borderplexalliance.org',
  'digital bridge': 'digitalbridge.com',
  'helen of troy': 'helenoftroy.com',
  'western refining': 'wnr.com',
};

/**
 * Extract domain from a full URL.
 * 'https://www.l3harris.com/products' → 'l3harris.com'
 */
export function domainFromUrl(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    return hostname || null;
  } catch {
    return null;
  }
}

/**
 * Get Clearbit logo URL for a company.
 *
 * Priority order (fully automatic):
 *   1. Website URL domain extraction — works for all vendors with a website
 *   2. Manual mapping exact match — covers name→domain mismatches (RTX, etc.)
 *   3. Manual mapping fuzzy match — substring matching
 *   4. Domain guess from company name — "Palantir" → palantir.com
 *
 * Most companies resolve at step 1 with zero configuration.
 */
export function getCompanyLogoUrl(
  companyName: string,
  websiteUrl?: string,
): string | null {
  // 1. Website URL — most reliable, fully automatic
  if (websiteUrl) {
    const domain = domainFromUrl(websiteUrl);
    if (domain) {
      return `https://logo.clearbit.com/${domain}`;
    }
  }

  const lower = companyName.toLowerCase().trim();

  // 2. Exact match in manual mapping
  if (COMPANY_DOMAINS[lower]) {
    return `https://logo.clearbit.com/${COMPANY_DOMAINS[lower]}`;
  }

  // 3. Fuzzy match — company name contains known key or vice versa
  for (const [key, domain] of Object.entries(COMPANY_DOMAINS)) {
    if (lower.includes(key) || key.includes(lower)) {
      return `https://logo.clearbit.com/${domain}`;
    }
  }

  // 4. Domain guess — "Palantir Technologies" → palantir.com
  const guess = lower
    .replace(/\b(inc|llc|corp|ltd|technologies|solutions|systems|group|co)\b/gi, '')
    .trim()
    .replace(/\s+/g, '');
  if (guess.length >= 3) {
    return `https://logo.clearbit.com/${guess}.com`;
  }

  return null;
}

/**
 * Generate initials fallback for companies without logos.
 * 'L3Harris Technologies' → 'L3'
 * 'El Paso Electric' → 'EP'
 */
export function companyInitials(name: string): string {
  const words = name.split(/[\s\-]+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
