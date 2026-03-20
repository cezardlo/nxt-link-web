// Client Persona Agents — 8 buyer archetypes that scan the USA for intelligence
// Each persona watches the country through their own lens: what contracts are moving,
// what regulations are changing, what technologies are shifting, what competitors are doing.
// They think like REAL clients — picky, skeptical, focused on what affects THEIR business.

import { runParallelJsonEnsemble } from '@/lib/llm/parallel-router';
import { boundedDataPrompt } from '@/lib/llm/sanitize';
import { parseAgentJson } from '@/lib/agents/types';
import { getStoredFeedItems } from '@/lib/agents/feed-agent';

// ── Persona Definitions ─────────────────────────────────────────────────────

export type PersonaId =
  | 'ops_director'
  | 'startup_founder'
  | 'procurement_officer'
  | 'plant_manager'
  | 'ciso'
  | 'logistics_vp'
  | 'base_commander'
  | 'hospital_cto';

export type ClientPersona = {
  id: PersonaId;
  title: string;
  company: string;
  industry: string;
  city: string;
  budget: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  tech_savvy: 'low' | 'medium' | 'high';
  decision_style: string;
  pain_points: string[];
  what_they_search: string[];
  what_they_ignore: string[];
  deal_breakers: string[];
  trust_signals: string[];
};

export const CLIENT_PERSONAS: ClientPersona[] = [
  {
    id: 'ops_director',
    title: 'Director of Operations',
    company: 'Mid-size manufacturing company (500 employees)',
    industry: 'Manufacturing',
    city: 'El Paso, Texas',
    budget: '$50K-$200K/year',
    urgency: 'high',
    tech_savvy: 'medium',
    decision_style: 'Needs ROI proof within 90 days. Won\'t buy without a pilot. Trusts peer recommendations over sales decks.',
    pain_points: [
      'Production line downtime costs $15K/hour but we only detect failures after they happen',
      'Can\'t find skilled workers — need automation but afraid of disrupting current workflows',
      'Competitors in Juárez have lower costs, need to offset with efficiency gains',
      'Quality inspection is manual and slow, missing 3-5% of defects',
    ],
    what_they_search: ['predictive maintenance manufacturing', 'quality inspection AI', 'how to reduce downtime', 'industry 4.0 El Paso'],
    what_they_ignore: ['Enterprise-only pricing without numbers', 'Products that need 6+ months to deploy', 'Vendors with no manufacturing case studies'],
    deal_breakers: ['No Spanish language support', 'Requires replacing existing MES system', 'Minimum 1000+ employee requirement'],
    trust_signals: ['Used by similar-sized manufacturers', 'Has Fort Bliss / defense contracts', 'Local or regional presence', 'Clear pricing on website'],
  },
  {
    id: 'startup_founder',
    title: 'CEO / Founder',
    company: 'Early-stage defense tech startup (12 people)',
    industry: 'Defense',
    city: 'El Paso, Texas',
    budget: '$5K-$30K/year',
    urgency: 'critical',
    tech_savvy: 'high',
    decision_style: 'Moves fast, decides in days not months. Values open-source and API-first. Will hack a solution together before buying enterprise.',
    pain_points: [
      'Need CMMC compliance to bid on DoD contracts but can\'t afford a dedicated security team',
      'Building a demo for Fort Bliss but need realistic test data and simulation environments',
      'Trying to find DoD contract opportunities before they hit SAM.gov publicly',
      'Need to prove our tech works at military scale without military-scale budget',
    ],
    what_they_search: ['CMMC compliance startup', 'DoD SBIR opportunities', 'defense contract pipeline', 'FedRAMP cheap'],
    what_they_ignore: ['Products marketed to Fortune 500 only', 'Anything requiring a "contact sales" call', 'Heavy enterprise onboarding'],
    deal_breakers: ['No free tier or trial', 'Annual contracts only', 'No API access'],
    trust_signals: ['Y Combinator or AFWERX funded', 'Open-source components', 'Used by other defense startups', 'Transparent pricing'],
  },
  {
    id: 'procurement_officer',
    title: 'Procurement & Contracts Officer',
    company: 'City of El Paso / Government',
    industry: 'Government',
    city: 'El Paso, Texas',
    budget: '$100K-$1M (requires RFP process)',
    urgency: 'low',
    tech_savvy: 'low',
    decision_style: 'Risk-averse. Needs documentation, compliance proof, and references. Decisions take 6-12 months. Must justify every dollar to council.',
    pain_points: [
      'Water infrastructure monitoring is outdated — sensors from 2008',
      'Need smart city tech but previous vendor failed to deliver and we got burned',
      'Citizens expect digital services but our IT team is understaffed',
      'Border security coordination with federal agencies is manual and slow',
    ],
    what_they_search: ['smart city water monitoring', 'government technology vendors Texas', 'FedRAMP approved solutions', 'NASPO contract vehicles'],
    what_they_ignore: ['Startup vendors without government references', 'Products without compliance documentation', 'AI hype without concrete use cases'],
    deal_breakers: ['Not on any government contract vehicle', 'No data residency in US', 'Cannot provide 3+ government references', 'No ADA compliance'],
    trust_signals: ['Existing government contracts', 'StateRAMP or FedRAMP', 'Texas DIR contract', 'Case studies from similar-sized cities'],
  },
  {
    id: 'plant_manager',
    title: 'Plant Manager',
    company: 'Maquiladora / Cross-border manufacturer',
    industry: 'Manufacturing',
    city: 'Ciudad Juárez / El Paso',
    budget: '$20K-$100K/year',
    urgency: 'medium',
    tech_savvy: 'medium',
    decision_style: 'Practical, results-driven. Needs to see it work on one line before rolling out. Reports to HQ in another country. Bilingual operations.',
    pain_points: [
      'Managing inventory across border crossings — customs delays kill our JIT schedule',
      'High worker turnover means constant retraining, need faster onboarding tech',
      'Energy costs are 30% of overhead and climbing, need monitoring and optimization',
      'Corporate wants Industry 4.0 metrics but our systems don\'t talk to each other',
    ],
    what_they_search: ['cross border supply chain software', 'maquiladora ERP', 'energy monitoring manufacturing', 'worker training automation'],
    what_they_ignore: ['US-only solutions', 'English-only interfaces', 'Products that assume first-world internet connectivity'],
    deal_breakers: ['No Mexico operations support', 'Requires cloud-only (our factory has spotty internet)', 'No Spanish UI'],
    trust_signals: ['Used in Mexico manufacturing', 'Nearshoring experience', 'Bilingual support team', 'Works offline or with low bandwidth'],
  },
  {
    id: 'ciso',
    title: 'Chief Information Security Officer',
    company: 'Regional bank (800 employees)',
    industry: 'Finance',
    city: 'El Paso, Texas',
    budget: '$200K-$500K/year',
    urgency: 'high',
    tech_savvy: 'high',
    decision_style: 'Deeply technical evaluator. Reads CVEs and architecture docs before taking a meeting. Board reports quarterly on risk posture.',
    pain_points: [
      'Ransomware attacks on regional banks are up 300% — board is demanding action',
      'Our SIEM generates 10,000 alerts/day and analysts can only review 200',
      'Need to pass OCC examination with zero critical findings this year',
      'Remote workforce doubled but VPN infrastructure is from 2019',
    ],
    what_they_search: ['EDR comparison 2026', 'SIEM alert fatigue solution', 'OCC compliance automation', 'zero trust network access regional bank'],
    what_they_ignore: ['Marketing buzzwords without technical depth', 'Vendors who won\'t share architecture diagrams', 'Products without SOC 2 Type II'],
    deal_breakers: ['No SOC 2 Type II audit', 'Data leaves US jurisdiction', 'No 24/7 SOC support option', 'Opaque pricing'],
    trust_signals: ['MITRE ATT&CK coverage map', 'Independent test results (AV-TEST, SE Labs)', 'Bank and credit union references', 'Incident response SLA in contract'],
  },
  {
    id: 'logistics_vp',
    title: 'VP of Logistics',
    company: 'Cross-border freight company (200 trucks)',
    industry: 'Logistics',
    city: 'El Paso, Texas',
    budget: '$50K-$150K/year',
    urgency: 'high',
    tech_savvy: 'medium',
    decision_style: 'Numbers-driven. If it doesn\'t show up in cost-per-mile or on-time delivery rate, it\'s not real. Pilot first, scale second.',
    pain_points: [
      'Border crossing wait times are unpredictable — drivers idle 2-4 hours at BOTA',
      'Fuel costs are killing margins, need route optimization that accounts for border delays',
      'Customers want real-time tracking but our system only updates at checkpoints',
      'CTPAT compliance documentation is a nightmare across 200 trucks',
    ],
    what_they_search: ['border crossing wait time prediction', 'fleet management cross border', 'CTPAT compliance software', 'route optimization Mexico US'],
    what_they_ignore: ['Solutions designed for domestic-only fleets', 'Products that don\'t integrate with existing ELD devices', 'AI that can\'t explain its routing decisions'],
    deal_breakers: ['No Mexico coverage', 'Requires replacing onboard hardware', 'No mobile app for drivers', 'Annual contract with no pilot option'],
    trust_signals: ['Used by other cross-border fleets', 'Integrates with existing ELD/TMS', 'Has CBP/customs expertise', 'Shows ROI calculator'],
  },
  {
    id: 'base_commander',
    title: 'Deputy Garrison Commander',
    company: 'Fort Bliss / US Army',
    industry: 'Defense',
    city: 'Fort Bliss, Texas',
    budget: '$500K-$5M (government procurement)',
    urgency: 'medium',
    tech_savvy: 'medium',
    decision_style: 'Follows acquisition regulations strictly. Needs ITAR compliance, existing contract vehicles. Values proven over innovative.',
    pain_points: [
      'Base infrastructure monitoring is reactive — need predictive maintenance for facilities',
      'Soldier readiness tracking across 30,000+ personnel is still spreadsheet-based',
      'Energy costs for base operations are $40M/year — need smart grid and solar integration',
      'Cybersecurity incidents increased 400% — need better endpoint protection across NIPR/SIPR',
    ],
    what_they_search: ['Army smart installation technology', 'military base energy management', 'FedRAMP high endpoint protection', 'soldier readiness platform'],
    what_they_ignore: ['Commercial-only products without ITAR compliance', 'Vendors not on GSA schedule', 'Solutions that need internet in classified environments'],
    deal_breakers: ['No FedRAMP authorization', 'No GSA or Army contract vehicle', 'Cannot operate air-gapped', 'Foreign-owned company (ITAR)'],
    trust_signals: ['Existing DoD contracts', 'FedRAMP High or IL5+ authorization', 'Used at other Army installations', 'ATO documentation available'],
  },
  {
    id: 'hospital_cto',
    title: 'Chief Technology Officer',
    company: 'Regional hospital system (3 facilities)',
    industry: 'Healthcare',
    city: 'El Paso, Texas',
    budget: '$100K-$500K/year',
    urgency: 'medium',
    tech_savvy: 'high',
    decision_style: 'Consensus builder — needs buy-in from physicians, nurses, and administration. HIPAA is non-negotiable. Integrates with Epic EHR or it\'s a non-starter.',
    pain_points: [
      'Patient no-show rate is 22% — wasting $3M/year in unused appointment slots',
      'Clinical documentation takes physicians 2 hours/day — they want AI scribing',
      'Supply chain for medical devices is still fax-and-phone with distributors',
      'Telehealth adoption stalled after COVID — patients in colonias have connectivity issues',
    ],
    what_they_search: ['AI clinical documentation Epic integration', 'patient no show prediction', 'medical supply chain automation', 'telehealth low bandwidth'],
    what_they_ignore: ['Products without HIPAA BAA', 'AI that can\'t explain clinical decisions', 'Solutions requiring physician workflow changes > 5 minutes'],
    deal_breakers: ['No HIPAA BAA', 'No Epic/Cerner integration', 'Requires PHI to leave US', 'No Spanish patient-facing support'],
    trust_signals: ['HITRUST certified', 'Epic App Orchard listing', 'Used by similar-sized health systems', 'Published clinical validation studies'],
  },
];

// ── Intelligence Briefing Types ──────────────────────────────────────────────

export type IntelItem = {
  headline: string;
  why_it_matters: string;
  urgency: 'act_now' | 'this_week' | 'monitor' | 'background';
  sector: string;
  region: string;
  source_hint: string;
  affected_companies: string[];
  opportunity_or_threat: 'opportunity' | 'threat' | 'both';
  action: string;
};

export type PersonaBriefing = {
  persona_id: PersonaId;
  persona_title: string;
  company_context: string;
  generated_at: string;
  top_headline: string;
  top_action: string;
  intel: IntelItem[];
  blind_spots: string[];
  what_competitors_see: string[];
  market_mood: string;
  one_sentence: string;
};

// ── Intelligence Scanner ─────────────────────────────────────────────────────
// Each persona scans the USA for what matters to THEIR world.
// They consume real feed data and filter it through their buyer lens.

const SCANNER_SYSTEM_PROMPT = `You are an intelligence analyst embedded inside a specific client's organization. Your job is to scan everything happening in the USA right now and report ONLY what this person needs to know to make better business decisions THIS WEEK.

You think like a picky, demanding buyer — not like a journalist or a researcher. You filter ruthlessly:
- If it doesn't affect their P&L, their compliance, their competitive position, or their operational efficiency → SKIP IT
- If they can't ACT on it within 30 days → mark it "monitor" or "background"
- If a competitor could use this information against them → flag it as urgent
- If a regulation, contract, or market shift could cost them money → that's "act_now"

You are the smartest person in their industry. You read between the lines. You connect dots that others miss. You don't just report news — you tell them WHAT IT MEANS for their specific situation and WHAT TO DO about it.

For each intel item:
- headline: Sharp, specific, no fluff. "DOD shifts $2B from legacy to autonomous systems" not "Defense spending changes"
- why_it_matters: Written directly to this person. "Your Patriot contracts could be reallocated" not "This affects defense contractors"
- action: One concrete thing they should do. "Call your SAIC program manager Monday" not "Monitor the situation"

Return valid JSON:
{
  "top_headline": "The single most important thing this person needs to know right now",
  "top_action": "The single most important thing they should DO about it",
  "intel": [
    {
      "headline": "Sharp specific headline",
      "why_it_matters": "Why THIS person cares — written to them directly",
      "urgency": "act_now|this_week|monitor|background",
      "sector": "Defense|AI|Cybersecurity|Energy|Manufacturing|Healthcare|Logistics|Finance|Government",
      "region": "National|Texas|Border|El Paso|specific state or city",
      "source_hint": "Type of source: contract filing|regulatory notice|earnings call|patent filing|news report|hiring data",
      "affected_companies": ["Company names affected"],
      "opportunity_or_threat": "opportunity|threat|both",
      "action": "One concrete action step"
    }
  ],
  "blind_spots": ["Things this person probably ISN'T watching but SHOULD be — 3-5 items"],
  "what_competitors_see": ["What their competitors are likely acting on that they might miss — 2-3 items"],
  "market_mood": "One sentence: is their market getting better, worse, or shifting?",
  "one_sentence": "If you could only tell this person ONE thing today, what would it be?"
}`;

function buildScannerPrompt(persona: ClientPersona, feedHeadlines: string[]): string {
  const feedContext = feedHeadlines.length > 0
    ? `\n\nRECENT FEED HEADLINES (from 70,000+ RSS sources):\n${feedHeadlines.slice(0, 40).map((h, i) => `${i + 1}. ${h}`).join('\n')}`
    : '';

  return boundedDataPrompt(
    'INTELLIGENCE SCAN REQUEST',
    `CLIENT PROFILE:
Role: ${persona.title}
Company: ${persona.company}
Industry: ${persona.industry}
Location: ${persona.city}
Budget: ${persona.budget}
Urgency Level: ${persona.urgency}
Decision Style: ${persona.decision_style}

THEIR CURRENT PAIN POINTS:
${persona.pain_points.map((p, i) => `${i + 1}. ${p}`).join('\n')}

WHAT THEY TYPICALLY CARE ABOUT:
${persona.what_they_search.join(', ')}

THEIR DEAL BREAKERS (things that make them walk away):
${persona.deal_breakers.join(', ')}

TRUST SIGNALS (what makes them believe a source):
${persona.trust_signals.join(', ')}
${feedContext}

DATE: ${new Date().toISOString().slice(0, 10)}

Scan the entire USA landscape and report 8-15 intelligence items that THIS SPECIFIC PERSON needs to know about. Include:
- Contract awards, procurement shifts, and budget reallocations in their sector
- Regulatory changes, compliance deadlines, and policy shifts affecting them
- Competitor moves, market entries, and vendor consolidation
- Technology shifts, product launches, and adoption signals in their space
- Workforce trends, hiring signals, and talent market shifts
- Supply chain disruptions, trade policy changes, and logistics shifts
- Funding rounds, M&A activity, and market valuation changes
- Security threats, breach disclosures, and vulnerability alerts relevant to them

Be SPECIFIC. Use real company names, real agencies, real regulations. No generic platitudes.`,
  );
}

function parseBriefingOutput(raw: string, persona: ClientPersona): PersonaBriefing {
  const parsed = parseAgentJson(raw) as Record<string, unknown>;

  const intel = Array.isArray(parsed.intel)
    ? parsed.intel
        .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
        .map((item) => ({
          headline: typeof item.headline === 'string' ? item.headline : '',
          why_it_matters: typeof item.why_it_matters === 'string' ? item.why_it_matters : '',
          urgency: (['act_now', 'this_week', 'monitor', 'background'].includes(String(item.urgency)) ? String(item.urgency) : 'monitor') as IntelItem['urgency'],
          sector: typeof item.sector === 'string' ? item.sector : persona.industry,
          region: typeof item.region === 'string' ? item.region : 'National',
          source_hint: typeof item.source_hint === 'string' ? item.source_hint : 'news report',
          affected_companies: Array.isArray(item.affected_companies) ? item.affected_companies.filter((s): s is string => typeof s === 'string') : [],
          opportunity_or_threat: (['opportunity', 'threat', 'both'].includes(String(item.opportunity_or_threat)) ? String(item.opportunity_or_threat) : 'both') as IntelItem['opportunity_or_threat'],
          action: typeof item.action === 'string' ? item.action : '',
        }))
    : [];

  return {
    persona_id: persona.id,
    persona_title: persona.title,
    company_context: persona.company,
    generated_at: new Date().toISOString(),
    top_headline: typeof parsed.top_headline === 'string' ? parsed.top_headline : '',
    top_action: typeof parsed.top_action === 'string' ? parsed.top_action : '',
    intel,
    blind_spots: Array.isArray(parsed.blind_spots) ? parsed.blind_spots.filter((s): s is string => typeof s === 'string') : [],
    what_competitors_see: Array.isArray(parsed.what_competitors_see) ? parsed.what_competitors_see.filter((s): s is string => typeof s === 'string') : [],
    market_mood: typeof parsed.market_mood === 'string' ? parsed.market_mood : '',
    one_sentence: typeof parsed.one_sentence === 'string' ? parsed.one_sentence : '',
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Get recent feed headlines to ground the LLM in real data */
function getRecentHeadlines(): string[] {
  const store = getStoredFeedItems();
  if (!store || !store.items.length) return [];
  return store.items
    .slice(0, 60)
    .map((item) => `[${item.category}] ${item.title}`)
    .filter((h) => h.length > 10);
}

/** Run intelligence scan for one persona */
export async function runPersonaScan(personaId: PersonaId): Promise<PersonaBriefing> {
  const persona = CLIENT_PERSONAS.find((p) => p.id === personaId);
  if (!persona) throw new Error(`Unknown persona: ${personaId}`);

  const headlines = getRecentHeadlines();

  const { result } = await runParallelJsonEnsemble<PersonaBriefing>({
    systemPrompt: SCANNER_SYSTEM_PROMPT,
    userPrompt: buildScannerPrompt(persona, headlines),
    temperature: 0.6,
    maxProviders: 1,
    parse: (content) => parseBriefingOutput(content, persona),
  });
  return result;
}

/** Run ALL 8 personas in parallel — full USA intelligence sweep */
export async function runFullIntelSweep(): Promise<{
  briefings: PersonaBriefing[];
  sweep_summary: {
    generated_at: string;
    personas_scanned: number;
    total_intel_items: number;
    act_now_count: number;
    this_week_count: number;
    top_sectors: string[];
    cross_persona_themes: string[];
    all_blind_spots: string[];
  };
}> {
  const results = await Promise.allSettled(
    CLIENT_PERSONAS.map((p) => runPersonaScan(p.id)),
  );

  const briefings = results
    .filter((r): r is PromiseFulfilledResult<PersonaBriefing> => r.status === 'fulfilled')
    .map((r) => r.value);

  const allIntel = briefings.flatMap((b) => b.intel);
  const actNow = allIntel.filter((i) => i.urgency === 'act_now');
  const thisWeek = allIntel.filter((i) => i.urgency === 'this_week');

  // Find sectors with most activity
  const sectorCounts = new Map<string, number>();
  for (const item of allIntel) {
    sectorCounts.set(item.sector, (sectorCounts.get(item.sector) ?? 0) + 1);
  }
  const topSectors = [...sectorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([sector, count]) => `${sector} (${count})`);

  // Find themes that appear across multiple personas
  const headlineWords = new Map<string, number>();
  for (const item of allIntel) {
    const words = item.headline.toLowerCase().split(/\s+/).filter((w) => w.length > 5);
    for (const word of words) {
      headlineWords.set(word, (headlineWords.get(word) ?? 0) + 1);
    }
  }
  const crossThemes = [...headlineWords.entries()]
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);

  const allBlindSpots = [...new Set(briefings.flatMap((b) => b.blind_spots))].slice(0, 10);

  return {
    briefings,
    sweep_summary: {
      generated_at: new Date().toISOString(),
      personas_scanned: briefings.length,
      total_intel_items: allIntel.length,
      act_now_count: actNow.length,
      this_week_count: thisWeek.length,
      top_sectors: topSectors,
      cross_persona_themes: crossThemes,
      all_blind_spots: allBlindSpots,
    },
  };
}
