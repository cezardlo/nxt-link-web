import { runParallelJsonEnsemble } from '@/lib/llm/parallel-router';
import { updatePlatformDoc, type DocSection } from '@/lib/google-docs';

/**
 * Feature manifest — every user-facing feature of NXT//LINK.
 * The LLM generates a plain-English description for each one.
 */
const FEATURE_MANIFEST = [
  {
    key: 'landing_page',
    title: 'Landing Page',
    context:
      'Full-screen black page with NXT//LINK branding and an "ENTER PLATFORM" button that takes users to the main map. Sets the tone: Bloomberg Terminal meets Palantir.',
  },
  {
    key: 'map_platform',
    title: 'Map Platform (Main View)',
    context:
      '3-column layout: left panel for layer toggles, center map with deck.gl markers, right panel for intelligence tabs. Shows El Paso, TX area with real-time data overlays.',
  },
  {
    key: 'layer_panel',
    title: 'Layer Panel (Left Side)',
    context:
      'Toggle switches organized in groups: LIVE (flights, military, seismic, border trade, crime, live TV), VENDORS (companies, products, funding, patents, hiring, news), MOMENTUM (momentum, adoption), INTEL (IKER scores, IKER risk). Each toggle shows/hides a data layer on the map.',
  },
  {
    key: 'right_panel',
    title: 'Intelligence Panel (Right Side)',
    context:
      '5 tabs: BRIEFING (AI-generated mission briefing about El Paso tech landscape), DOSSIER (detailed vendor profiles), IKER (vendor scoring 0-100), FEEDS (live RSS news sorted by category), MTM (market-to-market analysis). The CRIME tab is always visible.',
  },
  {
    key: 'crime_intelligence',
    title: 'Crime Intelligence',
    context:
      'Real-time crime news from KTSM, Google News, CBP. Articles are clustered using Jaccard similarity. Each cluster gets a severity badge (CRITICAL/HIGH/MODERATE/RESOLVED). Shows convergence when 3+ sources report the same story. Velocity detection flags spikes in crime reporting.',
  },
  {
    key: 'live_tv',
    title: 'Live TV',
    context:
      'Embedded YouTube live streams from El Paso news channels (KTSM, KFOX14, KVIA, EP Matters). Users can switch channels, mute/unmute, and the feed auto-pauses after 5 minutes of inactivity.',
  },
  {
    key: 'border_data',
    title: 'Border Data',
    context:
      'Live border wait times from CBP (passenger and commercial lanes at El Paso, Ysleta, and Fabens ports). Trade volume data from BTS showing trucks, personal vehicles crossing. Camera availability notices.',
  },
  {
    key: 'feed_bar',
    title: 'Feed Bar (Bottom Ticker)',
    context:
      'Horizontal scrolling ticker at the bottom showing the latest RSS headlines. Pulls from tech, cybersecurity, defense, and local news sources. Updates every 5 minutes.',
  },
  {
    key: 'vendor_pages',
    title: 'Vendor Deep-Dive Pages',
    context:
      'Individual pages for each vendor at /vendor/[id]. Shows IKER score gauge (0-100), company dossier, products, funding history, patent portfolio, hiring signals, and news mentions. The IKER score evaluates vendors on Innovation, Knowledge, Execution, and Reliability.',
  },
  {
    key: 'vendor_discovery',
    title: 'Vendor Discovery',
    context:
      'The /vendors page lists all tracked technology vendors in the El Paso area. Filterable and searchable. Links to individual vendor deep-dive pages.',
  },
  {
    key: 'signal_engine',
    title: 'Signal Intelligence Engine',
    context:
      'Detects patterns across news feeds: vendor mentions, contract alerts, velocity spikes, source convergence, sector activity spikes, and security impacts. Scores 6 sectors (AI/ML, Cybersecurity, Defense, Enterprise, Supply Chain, Energy) from 0-100.',
  },
  {
    key: 'ai_agents',
    title: 'AI Agent System',
    context:
      'Background agents that run automatically: Discovery Agent (finds new vendors), Vetting Agent (scores them), Comparison Agent (side-by-side analysis), Pilot Design Agent (creates trial plans), Market Intel Agent (tracks trends). All powered by Gemini with fallback to other LLMs.',
  },
];

const SYSTEM_PROMPT = `You are writing a feature guide for NXT//LINK, a technology intelligence platform.

Your audience is NON-TECHNICAL — business owners, investors, and city officials.

For each feature, write a clear explanation in 2-3 sentences:
- What does this feature do for the user?
- Why does it matter?

Rules:
- Use simple, everyday language. No jargon.
- Write like you're explaining to a smart friend who doesn't work in tech.
- Be specific about what the user sees and can do.
- Do NOT use buzzwords like "leverage", "synergy", "ecosystem", "paradigm".

Return valid JSON only:
{
  "features": [
    {
      "key": "feature_key",
      "description": "Your plain-English explanation here."
    }
  ]
}`;

type DocsOutput = {
  features: Array<{ key: string; description: string }>;
};

function buildUserPrompt(): string {
  const featureList = FEATURE_MANIFEST.map(
    (f) => `- ${f.key}: ${f.title} — ${f.context}`,
  ).join('\n');

  return `Here are the features of NXT//LINK. Write a simple, non-technical description for each one.\n\n${featureList}`;
}

function parseOutput(raw: string): DocsOutput {
  const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  const parsed = JSON.parse(cleaned) as DocsOutput;
  if (!Array.isArray(parsed.features)) throw new Error('Missing features array');
  return parsed;
}

/**
 * Generates plain-English feature descriptions via LLM and writes them to a Google Doc.
 */
export async function runDocsAgent(): Promise<{ sectionsWritten: number; provider: string }> {
  const { result, selectedProvider } = await runParallelJsonEnsemble<DocsOutput>({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: buildUserPrompt(),
    temperature: 0.3,
    maxProviders: 1,
    budget: { preferLowCostProviders: true, reserveCompletionTokens: 2000 },
    parse: (content) => parseOutput(content),
  });

  // Map LLM output back to sections with proper titles
  const sections: DocSection[] = FEATURE_MANIFEST.map((feature) => {
    const match = result.features.find((f) => f.key === feature.key);
    return {
      title: feature.title,
      body: match?.description ?? feature.context,
    };
  });

  await updatePlatformDoc(sections);

  return { sectionsWritten: sections.length, provider: selectedProvider };
}
