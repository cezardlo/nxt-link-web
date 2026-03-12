// src/lib/data/continent-departments.ts
// Continent-level intelligence departments for NXT//LINK
// Each continent is a "bureau" that tracks industries, companies, and signals
// All bureaus report to Central HQ (the industries page)

export type ContinentId = 'americas' | 'europe' | 'asia-pacific' | 'middle-east' | 'africa';

export type ContinentIndustryFocus = {
  industry: string;
  weight: number; // 0–1 relevance to this continent
  keywords: string[];
};

export type ContinentDepartment = {
  id: ContinentId;
  label: string;
  shortLabel: string; // 2-3 char abbreviation
  color: string;
  countryCodes: string[]; // ISO 3166-1 alpha-2
  industryFocus: ContinentIndustryFocus[];
  description: string;
};

export const CONTINENT_DEPARTMENTS: ContinentDepartment[] = [
  {
    id: 'americas',
    label: 'Americas',
    shortLabel: 'AMR',
    color: '#a855f7', // purple
    countryCodes: ['US', 'CA', 'MX', 'BR', 'AR', 'CO', 'CL'],
    industryFocus: [
      { industry: 'AI/ML', weight: 1.0, keywords: ['silicon valley AI', 'OpenAI', 'DARPA', 'NVIDIA'] },
      { industry: 'Defense', weight: 1.0, keywords: ['Pentagon', 'DoD contract', 'Lockheed', 'Anduril'] },
      { industry: 'Cybersecurity', weight: 0.9, keywords: ['CrowdStrike', 'Palo Alto Networks', 'NSA'] },
      { industry: 'Semiconductors', weight: 0.9, keywords: ['CHIPS Act', 'Intel fab', 'AMD', 'Qualcomm'] },
      { industry: 'Space', weight: 0.8, keywords: ['SpaceX', 'NASA', 'Rocket Lab', 'Blue Origin'] },
      { industry: 'FinTech', weight: 0.7, keywords: ['Nubank', 'Stripe', 'Plaid', 'Latin America fintech'] },
      { industry: 'AgTech', weight: 0.6, keywords: ['Brazil agtech', 'precision agriculture', 'John Deere'] },
      { industry: 'Energy', weight: 0.7, keywords: ['Tesla energy', 'US renewable', 'Brazil clean energy'] },
    ],
    description: 'Silicon Valley AI dominance, Pentagon defense tech, CHIPS Act semiconductor reshoring, Latin American fintech boom',
  },
  {
    id: 'europe',
    label: 'Europe',
    shortLabel: 'EUR',
    color: '#00d4ff', // cyan
    countryCodes: [
      'GB', 'DE', 'FR', 'NL', 'SE', 'CH', 'FI', 'DK', 'NO', 'PL',
      'IT', 'ES', 'PT', 'IE', 'AT', 'BE', 'CZ', 'RO', 'UA', 'EE',
      'LT', 'LV', 'GR',
    ],
    industryFocus: [
      { industry: 'Manufacturing', weight: 1.0, keywords: ['Siemens', 'Industry 4.0', 'German manufacturing'] },
      { industry: 'Defense', weight: 0.9, keywords: ['NATO', 'Rheinmetall', 'BAE Systems', 'SAAB', 'EU defense'] },
      { industry: 'Semiconductors', weight: 1.0, keywords: ['ASML', 'EUV lithography', 'ARM Holdings'] },
      { industry: 'Aerospace', weight: 0.9, keywords: ['Airbus', 'Safran', 'Rolls-Royce', 'ESA'] },
      { industry: 'Energy', weight: 0.8, keywords: ['Vestas', 'Ørsted', 'Northvolt', 'wind energy', 'nuclear'] },
      { industry: 'AI/ML', weight: 0.8, keywords: ['DeepMind', 'Mistral AI', 'EU AI Act'] },
      { industry: 'Cybersecurity', weight: 0.7, keywords: ['Darktrace', 'Baltic cyber', 'EU digital sovereignty'] },
      { industry: 'Automotive', weight: 0.8, keywords: ['BMW', 'Volkswagen EV', 'Volvo autonomous'] },
    ],
    description: 'ASML semiconductor monopoly, NATO defense modernization, Industry 4.0 manufacturing, EU AI regulation, Nordic cleantech',
  },
  {
    id: 'asia-pacific',
    label: 'Asia-Pacific',
    shortLabel: 'APAC',
    color: '#00ff88', // green
    countryCodes: [
      'JP', 'CN', 'KR', 'TW', 'IN', 'SG', 'AU', 'NZ',
      'ID', 'VN', 'TH', 'MY', 'PH', 'PK', 'BD',
    ],
    industryFocus: [
      { industry: 'Semiconductors', weight: 1.0, keywords: ['TSMC', 'Samsung foundry', 'SK Hynix', 'SMIC'] },
      { industry: 'AI/ML', weight: 1.0, keywords: ['Baidu AI', 'DeepSeek', 'SoftBank', 'Preferred Networks'] },
      { industry: 'Robotics', weight: 0.9, keywords: ['Fanuc', 'Yaskawa', 'Keyence', 'Foxconn automation'] },
      { industry: 'Defense', weight: 0.8, keywords: ['AUKUS', 'Japan defense', 'India HAL', 'Korea KAI'] },
      { industry: 'EVs & Batteries', weight: 0.9, keywords: ['BYD', 'CATL', 'LG Energy', 'Hyundai EV'] },
      { industry: 'Drones', weight: 0.7, keywords: ['DJI', 'China drone', 'India UAV'] },
      { industry: 'FinTech', weight: 0.7, keywords: ['Grab', 'Sea Group', 'Paytm', 'Singapore fintech'] },
      { industry: 'IT Services', weight: 0.8, keywords: ['Infosys', 'TCS', 'Wipro', 'India IT'] },
    ],
    description: 'TSMC chip supremacy, China AI race, Japan robotics leadership, India IT powerhouse, ASEAN startup surge',
  },
  {
    id: 'middle-east',
    label: 'Middle East',
    shortLabel: 'ME',
    color: '#ffd700', // gold
    countryCodes: ['IL', 'AE', 'SA', 'QA', 'BH', 'JO', 'TR'],
    industryFocus: [
      { industry: 'Defense', weight: 1.0, keywords: ['Elbit', 'Rafael', 'Baykar', 'EDGE Group', 'ASELSAN'] },
      { industry: 'Cybersecurity', weight: 1.0, keywords: ['CyberArk', 'Check Point', 'Wiz', 'Unit 8200'] },
      { industry: 'AI/ML', weight: 0.8, keywords: ['G42', 'Presight AI', 'UAE AI investment'] },
      { industry: 'Energy', weight: 0.9, keywords: ['Aramco digital', 'NEOM', 'Saudi Vision 2030'] },
      { industry: 'Drones', weight: 0.9, keywords: ['Bayraktar', 'Turkish drone', 'IAI drone'] },
      { industry: 'Smart Cities', weight: 0.7, keywords: ['NEOM', 'Dubai smart city', 'Abu Dhabi tech'] },
      { industry: 'Space', weight: 0.6, keywords: ['UAE space', 'Israel space', 'Turkey satellite'] },
      { industry: 'FinTech', weight: 0.6, keywords: ['Bahrain fintech', 'Dubai finance hub'] },
    ],
    description: 'Israeli cyber dominance, Turkish drone revolution, Gulf sovereign AI investment, Saudi Vision 2030 tech transformation',
  },
  {
    id: 'africa',
    label: 'Africa',
    shortLabel: 'AFR',
    color: '#f97316', // orange
    countryCodes: ['ZA', 'NG', 'KE', 'EG', 'MA', 'ET', 'GH', 'RW', 'TZ'],
    industryFocus: [
      { industry: 'FinTech', weight: 1.0, keywords: ['M-Pesa', 'Flutterwave', 'Chipper Cash', 'African fintech'] },
      { industry: 'AgTech', weight: 0.9, keywords: ['African agriculture', 'precision farming Africa', 'Aerobotics'] },
      { industry: 'Mining Tech', weight: 0.8, keywords: ['South Africa mining', 'Anglo American tech', 'rare earth Africa'] },
      { industry: 'Energy', weight: 0.8, keywords: ['Africa solar', 'off-grid energy', 'M-KOPA', 'African renewable'] },
      { industry: 'Telecommunications', weight: 0.7, keywords: ['Safaricom', 'MTN', 'Africa 5G', 'Vodacom'] },
      { industry: 'Healthcare', weight: 0.6, keywords: ['mHealth Africa', 'Zipline drone', 'Africa pharma'] },
      { industry: 'Defense', weight: 0.5, keywords: ['Paramount Group', 'Egyptian military', 'Morocco defense'] },
      { industry: 'Smart Cities', weight: 0.5, keywords: ['Konza Technopolis', 'Rwanda smart', 'Lagos tech hub'] },
    ],
    description: 'Mobile-first fintech revolution, mining tech modernization, agricultural innovation, leapfrog energy solutions',
  },
];

// ── Lookup helpers ──────────────────────────────────────────────────────────

const _byId = new Map(CONTINENT_DEPARTMENTS.map(d => [d.id, d]));

const _byCountry = new Map<string, ContinentDepartment>();
for (const dept of CONTINENT_DEPARTMENTS) {
  for (const code of dept.countryCodes) {
    _byCountry.set(code, dept);
  }
}

export function getContinentById(id: ContinentId): ContinentDepartment | undefined {
  return _byId.get(id);
}

export function getContinentByCountryCode(code: string): ContinentDepartment | undefined {
  return _byCountry.get(code.toUpperCase());
}

export function getContinentsForIndustry(industry: string): ContinentDepartment[] {
  const lower = industry.toLowerCase();
  return CONTINENT_DEPARTMENTS.filter(d =>
    d.industryFocus.some(f => f.industry.toLowerCase().includes(lower)),
  );
}

export function getAllContinentIds(): ContinentId[] {
  return CONTINENT_DEPARTMENTS.map(d => d.id);
}

/** Total countries tracked across all continents */
export const CONTINENT_STATS = {
  totalContinents: CONTINENT_DEPARTMENTS.length,
  totalCountries: CONTINENT_DEPARTMENTS.reduce((sum, d) => sum + d.countryCodes.length, 0),
  totalIndustryFoci: CONTINENT_DEPARTMENTS.reduce((sum, d) => sum + d.industryFocus.length, 0),
} as const;