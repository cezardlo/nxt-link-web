// Geo-classifier — derives continent and country from lat/lon + location string
// Used to classify every conference in the static catalog by continent.

import type { Continent, ConferenceRecord } from './types';

// ── Country detection from location string ──────────────────────────────────

const COUNTRY_PATTERNS: Array<{ pattern: RegExp; country: string; continent: Continent }> = [
  // North America
  { pattern: /\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\b/, country: 'United States', continent: 'North America' },
  { pattern: /\bCanada\b/i, country: 'Canada', continent: 'North America' },
  { pattern: /\b(Toronto|Vancouver|Montreal|Ottawa|Calgary)\b/i, country: 'Canada', continent: 'North America' },
  { pattern: /\bMexico\b/i, country: 'Mexico', continent: 'North America' },
  { pattern: /\b(Ciudad Ju[aá]rez|Monterrey|Puebla|Mexico City|Guadalajara|Canc[uú]n)\b/i, country: 'Mexico', continent: 'North America' },

  // Europe
  { pattern: /\b(United Kingdom|UK|England|Scotland)\b/i, country: 'United Kingdom', continent: 'Europe' },
  { pattern: /\b(London|Birmingham|Manchester|Edinburgh|Farnborough)\b/i, country: 'United Kingdom', continent: 'Europe' },
  { pattern: /\bGermany\b/i, country: 'Germany', continent: 'Europe' },
  { pattern: /\b(Berlin|Munich|M[uü]nchen|Hannover|Frankfurt|Hamburg|D[uü]sseldorf|Stuttgart|Cologne|K[oö]ln|Nuremberg|N[uü]rnberg)\b/i, country: 'Germany', continent: 'Europe' },
  { pattern: /\bFrance\b/i, country: 'France', continent: 'Europe' },
  { pattern: /\b(Paris|Cannes|Lyon|Marseille|Le Bourget|Villepinte)\b/i, country: 'France', continent: 'Europe' },
  { pattern: /\b(Netherlands|Holland)\b/i, country: 'Netherlands', continent: 'Europe' },
  { pattern: /\b(Amsterdam|Rotterdam|The Hague|Utrecht)\b/i, country: 'Netherlands', continent: 'Europe' },
  { pattern: /\bItaly\b/i, country: 'Italy', continent: 'Europe' },
  { pattern: /\b(Milan|Milano|Rome|Roma|Bologna|Turin|Torino|Venice|Verona)\b/i, country: 'Italy', continent: 'Europe' },
  { pattern: /\bSpain\b/i, country: 'Spain', continent: 'Europe' },
  { pattern: /\b(Barcelona|Madrid|Valencia|Bilbao|Seville|Sevilla)\b/i, country: 'Spain', continent: 'Europe' },
  { pattern: /\bSwitzerland\b/i, country: 'Switzerland', continent: 'Europe' },
  { pattern: /\b(Geneva|Gen[eè]ve|Zurich|Z[uü]rich|Basel|Bern|Davos)\b/i, country: 'Switzerland', continent: 'Europe' },
  { pattern: /\bAustria\b/i, country: 'Austria', continent: 'Europe' },
  { pattern: /\b(Vienna|Wien|Salzburg)\b/i, country: 'Austria', continent: 'Europe' },
  { pattern: /\bBelgium\b/i, country: 'Belgium', continent: 'Europe' },
  { pattern: /\b(Brussels|Bruxelles|Antwerp)\b/i, country: 'Belgium', continent: 'Europe' },
  { pattern: /\bSweden\b/i, country: 'Sweden', continent: 'Europe' },
  { pattern: /\b(Stockholm|Gothenburg|G[oö]teborg|Malm[oö])\b/i, country: 'Sweden', continent: 'Europe' },
  { pattern: /\bNorway\b/i, country: 'Norway', continent: 'Europe' },
  { pattern: /\b(Oslo|Bergen|Stavanger)\b/i, country: 'Norway', continent: 'Europe' },
  { pattern: /\bDenmark\b/i, country: 'Denmark', continent: 'Europe' },
  { pattern: /\b(Copenhagen|K[oø]benhavn)\b/i, country: 'Denmark', continent: 'Europe' },
  { pattern: /\bFinland\b/i, country: 'Finland', continent: 'Europe' },
  { pattern: /\b(Helsinki|Tampere)\b/i, country: 'Finland', continent: 'Europe' },
  { pattern: /\bPortugal\b/i, country: 'Portugal', continent: 'Europe' },
  { pattern: /\b(Lisbon|Lisboa|Porto)\b/i, country: 'Portugal', continent: 'Europe' },
  { pattern: /\bPoland\b/i, country: 'Poland', continent: 'Europe' },
  { pattern: /\b(Warsaw|Warszawa|Krakow|Krak[oó]w)\b/i, country: 'Poland', continent: 'Europe' },
  { pattern: /\bCzech\b/i, country: 'Czech Republic', continent: 'Europe' },
  { pattern: /\bPrague\b/i, country: 'Czech Republic', continent: 'Europe' },
  { pattern: /\bIreland\b/i, country: 'Ireland', continent: 'Europe' },
  { pattern: /\bDublin\b/i, country: 'Ireland', continent: 'Europe' },
  { pattern: /\bGreece\b/i, country: 'Greece', continent: 'Europe' },
  { pattern: /\b(Athens|Thessaloniki)\b/i, country: 'Greece', continent: 'Europe' },
  { pattern: /\bTurkey\b|T[uü]rkiye\b/i, country: 'Turkey', continent: 'Europe' },
  { pattern: /\b(Istanbul|Ankara)\b/i, country: 'Turkey', continent: 'Europe' },
  { pattern: /\bRomania\b/i, country: 'Romania', continent: 'Europe' },
  { pattern: /\bBucharest\b/i, country: 'Romania', continent: 'Europe' },
  { pattern: /\bHungary\b/i, country: 'Hungary', continent: 'Europe' },
  { pattern: /\bBudapest\b/i, country: 'Hungary', continent: 'Europe' },

  // Middle East
  { pattern: /\b(UAE|United Arab Emirates)\b/i, country: 'UAE', continent: 'Middle East' },
  { pattern: /\b(Dubai|Abu Dhabi|Sharjah)\b/i, country: 'UAE', continent: 'Middle East' },
  { pattern: /\bSaudi Arabia\b/i, country: 'Saudi Arabia', continent: 'Middle East' },
  { pattern: /\b(Riyadh|Jeddah|NEOM)\b/i, country: 'Saudi Arabia', continent: 'Middle East' },
  { pattern: /\bIsrael\b/i, country: 'Israel', continent: 'Middle East' },
  { pattern: /\bTel Aviv\b/i, country: 'Israel', continent: 'Middle East' },
  { pattern: /\bQatar\b/i, country: 'Qatar', continent: 'Middle East' },
  { pattern: /\bDoha\b/i, country: 'Qatar', continent: 'Middle East' },
  { pattern: /\bBahrain\b/i, country: 'Bahrain', continent: 'Middle East' },
  { pattern: /\bManama\b/i, country: 'Bahrain', continent: 'Middle East' },
  { pattern: /\bOman\b/i, country: 'Oman', continent: 'Middle East' },
  { pattern: /\bMuscat\b/i, country: 'Oman', continent: 'Middle East' },
  { pattern: /\bKuwait\b/i, country: 'Kuwait', continent: 'Middle East' },
  { pattern: /\bJordan\b/i, country: 'Jordan', continent: 'Middle East' },
  { pattern: /\bAmman\b/i, country: 'Jordan', continent: 'Middle East' },

  // Asia
  { pattern: /\bJapan\b/i, country: 'Japan', continent: 'Asia' },
  { pattern: /\b(Tokyo|Osaka|Yokohama|Makuhari|Nagoya|Kobe)\b/i, country: 'Japan', continent: 'Asia' },
  { pattern: /\bChina\b/i, country: 'China', continent: 'Asia' },
  { pattern: /\b(Shanghai|Beijing|Shenzhen|Guangzhou|Chengdu|Hangzhou|Hong Kong)\b/i, country: 'China', continent: 'Asia' },
  { pattern: /\bSouth Korea\b/i, country: 'South Korea', continent: 'Asia' },
  { pattern: /\b(Seoul|Busan|Incheon)\b/i, country: 'South Korea', continent: 'Asia' },
  { pattern: /\bSingapore\b/i, country: 'Singapore', continent: 'Asia' },
  { pattern: /\bIndia\b/i, country: 'India', continent: 'Asia' },
  { pattern: /\b(Mumbai|Bengaluru|Bangalore|New Delhi|Delhi|Hyderabad|Chennai|Pune)\b/i, country: 'India', continent: 'Asia' },
  { pattern: /\bTaiwan\b/i, country: 'Taiwan', continent: 'Asia' },
  { pattern: /\bTaipei\b/i, country: 'Taiwan', continent: 'Asia' },
  { pattern: /\bThailand\b/i, country: 'Thailand', continent: 'Asia' },
  { pattern: /\bBangkok\b/i, country: 'Thailand', continent: 'Asia' },
  { pattern: /\bVietnam\b/i, country: 'Vietnam', continent: 'Asia' },
  { pattern: /\b(Hanoi|Ho Chi Minh)\b/i, country: 'Vietnam', continent: 'Asia' },
  { pattern: /\bMalaysia\b/i, country: 'Malaysia', continent: 'Asia' },
  { pattern: /\bKuala Lumpur\b/i, country: 'Malaysia', continent: 'Asia' },
  { pattern: /\bIndonesia\b/i, country: 'Indonesia', continent: 'Asia' },
  { pattern: /\bJakarta\b/i, country: 'Indonesia', continent: 'Asia' },
  { pattern: /\bPhilippines\b/i, country: 'Philippines', continent: 'Asia' },
  { pattern: /\bManila\b/i, country: 'Philippines', continent: 'Asia' },

  // South America
  { pattern: /\bBrazil\b/i, country: 'Brazil', continent: 'South America' },
  { pattern: /\b(S[aã]o Paulo|Rio de Janeiro|Bras[ií]lia)\b/i, country: 'Brazil', continent: 'South America' },
  { pattern: /\bArgentina\b/i, country: 'Argentina', continent: 'South America' },
  { pattern: /\bBuenos Aires\b/i, country: 'Argentina', continent: 'South America' },
  { pattern: /\bChile\b/i, country: 'Chile', continent: 'South America' },
  { pattern: /\bSantiago\b/i, country: 'Chile', continent: 'South America' },
  { pattern: /\bColombia\b/i, country: 'Colombia', continent: 'South America' },
  { pattern: /\b(Bogot[aá]|Medell[ií]n|Cartagena)\b/i, country: 'Colombia', continent: 'South America' },
  { pattern: /\bPeru\b/i, country: 'Peru', continent: 'South America' },
  { pattern: /\bLima\b/i, country: 'Peru', continent: 'South America' },

  // Africa
  { pattern: /\bSouth Africa\b/i, country: 'South Africa', continent: 'Africa' },
  { pattern: /\b(Johannesburg|Cape Town|Durban)\b/i, country: 'South Africa', continent: 'Africa' },
  { pattern: /\bNigeria\b/i, country: 'Nigeria', continent: 'Africa' },
  { pattern: /\bLagos\b/i, country: 'Nigeria', continent: 'Africa' },
  { pattern: /\bKenya\b/i, country: 'Kenya', continent: 'Africa' },
  { pattern: /\bNairobi\b/i, country: 'Kenya', continent: 'Africa' },
  { pattern: /\bEgypt\b/i, country: 'Egypt', continent: 'Africa' },
  { pattern: /\bCairo\b/i, country: 'Egypt', continent: 'Africa' },
  { pattern: /\bRwanda\b/i, country: 'Rwanda', continent: 'Africa' },
  { pattern: /\bKigali\b/i, country: 'Rwanda', continent: 'Africa' },
  { pattern: /\bMorocco\b/i, country: 'Morocco', continent: 'Africa' },
  { pattern: /\b(Marrakech|Casablanca)\b/i, country: 'Morocco', continent: 'Africa' },
  { pattern: /\bEthiopia\b/i, country: 'Ethiopia', continent: 'Africa' },
  { pattern: /\bAddis Ababa\b/i, country: 'Ethiopia', continent: 'Africa' },
  { pattern: /\bGhana\b/i, country: 'Ghana', continent: 'Africa' },
  { pattern: /\bAccra\b/i, country: 'Ghana', continent: 'Africa' },
  { pattern: /\bTanzania\b/i, country: 'Tanzania', continent: 'Africa' },
  { pattern: /\bDar es Salaam\b/i, country: 'Tanzania', continent: 'Africa' },

  // Oceania
  { pattern: /\bAustralia\b/i, country: 'Australia', continent: 'Oceania' },
  { pattern: /\b(Sydney|Melbourne|Brisbane|Perth|Adelaide)\b/i, country: 'Australia', continent: 'Oceania' },
  { pattern: /\bNew Zealand\b/i, country: 'New Zealand', continent: 'Oceania' },
  { pattern: /\b(Auckland|Wellington)\b/i, country: 'New Zealand', continent: 'Oceania' },
];

// ── Lat/lon fallback for continent ──────────────────────────────────────────

function continentFromCoords(lat: number, lon: number): Continent {
  // Middle East
  if (lat >= 12 && lat <= 42 && lon >= 25 && lon <= 63) return 'Middle East';
  // Asia (east of Middle East)
  if (lat >= -10 && lat <= 55 && lon >= 63 && lon <= 180) return 'Asia';
  // Oceania
  if (lat >= -50 && lat <= 0 && lon >= 100 && lon <= 180) return 'Oceania';
  // Africa
  if (lat >= -35 && lat <= 37 && lon >= -20 && lon <= 55) return 'Africa';
  // Europe
  if (lat >= 35 && lat <= 72 && lon >= -25 && lon <= 45) return 'Europe';
  // South America
  if (lat >= -56 && lat <= 15 && lon >= -82 && lon <= -34) return 'South America';
  // North America (default for western hemisphere above equator)
  if (lat >= 5 && lat <= 85 && lon >= -170 && lon <= -30) return 'North America';
  // Fallback
  return 'North America';
}

// ── Main classifier ─────────────────────────────────────────────────────────

export function classifyConference(
  conf: ConferenceRecord,
): { country: string; continent: Continent } {
  // If already classified, return as-is
  if (conf.country && conf.continent) {
    return { country: conf.country, continent: conf.continent };
  }

  const text = conf.location;

  // Try pattern matching on location string
  for (const { pattern, country, continent } of COUNTRY_PATTERNS) {
    if (pattern.test(text)) {
      return { country, continent };
    }
  }

  // Fallback to lat/lon
  const continent = continentFromCoords(conf.lat, conf.lon);

  // Try to extract a generic country name from location
  const parts = text.split(',').map((s) => s.trim());
  const lastPart = parts[parts.length - 1];

  return { country: lastPart || 'Unknown', continent };
}

/**
 * Classify all conferences in bulk, returning them with country/continent set.
 */
export function classifyAll(
  conferences: readonly ConferenceRecord[],
): (ConferenceRecord & { country: string; continent: Continent })[] {
  return conferences.map((c) => {
    const { country, continent } = classifyConference(c);
    return { ...c, country, continent };
  });
}

/**
 * Group conferences by continent.
 */
export function groupByContinent(
  conferences: readonly ConferenceRecord[],
): Record<Continent, (ConferenceRecord & { country: string; continent: Continent })[]> {
  const classified = classifyAll(conferences);
  const groups: Record<Continent, typeof classified> = {
    'North America': [],
    'South America': [],
    'Europe': [],
    'Asia': [],
    'Africa': [],
    'Oceania': [],
    'Middle East': [],
  };

  for (const c of classified) {
    groups[c.continent].push(c);
  }

  return groups;
}

/**
 * Get continent stats.
 */
export function getContinentStats(
  conferences: readonly ConferenceRecord[],
): Array<{ continent: Continent; count: number; totalExhibitors: number; countries: string[] }> {
  const groups = groupByContinent(conferences);
  return (Object.entries(groups) as [Continent, typeof groups[Continent]][])
    .map(([continent, confs]) => ({
      continent,
      count: confs.length,
      totalExhibitors: confs.reduce((s, c) => s + c.estimatedExhibitors, 0),
      countries: [...new Set(confs.map((c) => c.country))].sort(),
    }))
    .filter((g) => g.count > 0)
    .sort((a, b) => b.count - a.count);
}
