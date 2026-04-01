// src/lib/agents/agents/tech-cluster-detector.ts
// Shared technology cluster detection — used by conference-intel-agent and exhibitor-scraper-agent.

// ─── Technology Cluster Detection ───────────────────────────────────────────────

export const TECH_CLUSTERS: Array<{ cluster: string; keywords: RegExp }> = [
  { cluster: 'Warehouse Automation', keywords: /\b(warehouse|fulfillment|picking|sorting|conveyor)\b/i },
  { cluster: 'Robotics', keywords: /\b(robot|autonomous|drone|UAV|unmanned|automated)\b/i },
  { cluster: 'AI & Machine Learning', keywords: /\b(AI|artificial\s+intelligence|machine\s+learning|deep\s+learning|GPT|LLM|neural)\b/i },
  { cluster: 'Cybersecurity', keywords: /\b(cyber|security|zero\s+trust|threat|ransomware|encryption)\b/i },
  { cluster: 'Clean Energy', keywords: /\b(solar|wind|battery|hydrogen|renewable|grid|EV|electric\s+vehicle)\b/i },
  { cluster: 'Biotech & Health', keywords: /\b(biotech|pharma|medical|health|clinical|genomic|CRISPR|therapy)\b/i },
  { cluster: 'Manufacturing Tech', keywords: /\b(3D\s+print|additive|CNC|industrial|manufacturing|factory)\b/i },
  { cluster: 'Supply Chain', keywords: /\b(supply\s+chain|logistics|freight|shipping|last\s+mile|tracking)\b/i },
  { cluster: 'AgTech', keywords: /\b(agriculture|farming|crop|precision\s+ag|irrigation|livestock)\b/i },
  { cluster: 'Construction Tech', keywords: /\b(construction|BIM|modular|prefab|infrastructure|smart\s+building)\b/i },
  { cluster: 'Fintech', keywords: /\b(fintech|blockchain|payment|banking|DeFi|cryptocurrency)\b/i },
  { cluster: 'Space & Aerospace', keywords: /\b(space|satellite|rocket|launch|orbit|aerospace|aviation)\b/i },
  { cluster: 'Fleet Management', keywords: /\b(fleet|telematics|ELD|dispatch|route\s+optim|fuel\s+management)\b/i },
  { cluster: 'Trucking Tech', keywords: /\b(truck|CDL|freight\s+broker|TMS|load\s+board|drayage|LTL|FTL)\b/i },
];

/**
 * Detect the primary technology cluster from text.
 * Returns the first matching cluster name, or null.
 */
export function detectTechCluster(text: string): string | null {
  for (const { cluster, keywords } of TECH_CLUSTERS) {
    if (keywords.test(text)) return cluster;
  }
  return null;
}

/**
 * Detect ALL matching technology clusters from text.
 * Returns array of cluster names.
 */
export function detectAllTechClusters(text: string): string[] {
  const matches: string[] = [];
  for (const { cluster, keywords } of TECH_CLUSTERS) {
    if (keywords.test(text)) matches.push(cluster);
  }
  return matches;
}
