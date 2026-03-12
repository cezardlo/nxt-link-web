// src/lib/intelligence/conference-scorer.ts
// NXT//LINK Conference Importance Scoring Engine

// ─── ConferenceProfile type ────────────────────────────────────────
// Canonical type definition. @/lib/data/conference-profiles must satisfy this.

export type ConferenceSpeaker = {
  name: string;
  org: string;
  title: string;
};

export type ConferenceProfile = {
  id: string;
  name: string;
  industry: string;
  location: string;
  monthTypically: number; // 1-12
  exhibitorCount: number;
  speakerCount: number;
  exhibitors: string[];
  sponsors: string[];
  speakers: ConferenceSpeaker[];
  productsShowcased: string[];
  technologies: string[];
  website: string;
};

export type ConferenceScore = {
  total: number;          // 0-100
  tier: 1 | 2 | 3;       // 1=flagship(80+), 2=major(50-79), 3=significant(<50)
  breakdown: {
    exhibitorScore: number;
    companyPresenceScore: number;
    researchPresenceScore: number;
    mediaCoverageScore: number;
    techAnnouncementScore: number;
  };
  grade: 'A' | 'B' | 'C' | 'D';
};

// Major company names for company presence scoring
const MAJOR_COMPANIES = new Set([
  'Amazon', 'Google', 'Microsoft', 'NVIDIA', 'Meta', 'Apple', 'IBM',
  'Lockheed Martin', 'Raytheon', 'Northrop Grumman', 'Boeing', 'L3Harris',
  'General Dynamics', 'BAE Systems', 'Palantir', 'Anduril',
  'CrowdStrike', 'Palo Alto Networks', 'Fortinet', 'Zscaler',
  'Salesforce', 'ServiceNow', 'Snowflake', 'Databricks',
  'Tesla', 'Siemens', 'ABB', 'Honeywell', 'Rockwell Automation',
  'Fanuc', 'KUKA', 'Universal Robots', 'Boston Dynamics',
  'Maersk', 'FedEx', 'UPS', 'DHL', 'Flexport',
  'Pfizer', 'Johnson Johnson', 'Medtronic', 'Abbott',
  'ExxonMobil', 'Chevron', 'NextEra Energy', 'First Solar',
]);

// Research institutions for research presence scoring
const RESEARCH_INSTITUTIONS = new Set([
  'MIT', 'Stanford', 'Carnegie Mellon', 'Georgia Tech', 'Caltech',
  'DARPA', 'NIST', 'DOE', 'NSF', 'NIH', 'NASA',
  'Sandia', 'Los Alamos', 'Oak Ridge', 'Argonne',
  'UTEP', 'Texas A&M', 'UT Austin',
]);

export function scoreConference(conf: ConferenceProfile): ConferenceScore {
  // 1. Exhibitor count score (0-100, log scale)
  const exhibitorScore = Math.min(100, Math.round(
    (Math.log10(Math.max(conf.exhibitorCount, 1)) / Math.log10(3000)) * 100
  ));

  // 2. Company presence score (0-100, based on major companies in exhibitors/sponsors)
  const allCompanies = [...conf.exhibitors, ...conf.sponsors];
  const majorCount = allCompanies.filter(c =>
    Array.from(MAJOR_COMPANIES as Iterable<string>).some(mc =>
      c.toLowerCase().includes(mc.toLowerCase())
    )
  ).length;
  const companyPresenceScore = Math.min(100, majorCount * 12);

  // 3. Research presence score (0-100, based on speakers from research institutions)
  const researchCount = conf.speakers.filter(s =>
    Array.from(RESEARCH_INSTITUTIONS as Iterable<string>).some(ri =>
      s.org.toLowerCase().includes(ri.toLowerCase())
    )
  ).length;
  const researchPresenceScore = Math.min(100, researchCount * 20);

  // 4. Media coverage score (proxy: speaker count + exhibitor count combined)
  const mediaCoverageScore = Math.min(100, Math.round(
    ((conf.speakerCount + conf.exhibitorCount) / 50) * 10
  ));

  // 5. Tech announcement score (based on productsShowcased count)
  const techAnnouncementScore = Math.min(100, conf.productsShowcased.length * 14);

  // Weighted total
  const total = Math.round(
    exhibitorScore * 0.25 +
    companyPresenceScore * 0.25 +
    researchPresenceScore * 0.20 +
    mediaCoverageScore * 0.15 +
    techAnnouncementScore * 0.15
  );

  const tier: 1 | 2 | 3 = total >= 80 ? 1 : total >= 50 ? 2 : 3;
  const grade: 'A' | 'B' | 'C' | 'D' =
    total >= 80 ? 'A' : total >= 60 ? 'B' : total >= 40 ? 'C' : 'D';

  return {
    total,
    tier,
    breakdown: {
      exhibitorScore,
      companyPresenceScore,
      researchPresenceScore,
      mediaCoverageScore,
      techAnnouncementScore,
    },
    grade,
  };
}

export function getTierColor(tier: 1 | 2 | 3): string {
  switch (tier) {
    case 1: return '#00ff88';   // green — flagship
    case 2: return '#ffd700';   // gold — major
    case 3: return '#ffffff40'; // dim — significant
  }
}

export function getTierLabel(tier: 1 | 2 | 3): string {
  switch (tier) {
    case 1: return 'TIER-1 FLAGSHIP';
    case 2: return 'TIER-2 MAJOR';
    case 3: return 'TIER-3';
  }
}
