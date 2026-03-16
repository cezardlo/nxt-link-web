// src/lib/feeds/mega/education-workforce-sources.ts
// NXT//LINK Education & Workforce Mega-Registry
// Matrices × cross-product expansion = ~4,300 unique Google News RSS feeds

import type { FeedCategory } from '@/lib/agents/feed-agent';

type TopicMatrix = {
  prefix: string;
  category: FeedCategory;
  tier: 1 | 2 | 3 | 4;
  region?: 'el-paso' | 'texas' | 'national' | 'global';
  entities: string[];
  contexts: string[];
};

const GN = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;

type FeedSourceEntry = {
  id: string;
  name: string;
  url: string;
  category: FeedCategory;
  tags: string[];
  tier: 1 | 2 | 3 | 4;
  region?: 'el-paso' | 'texas' | 'national' | 'global';
};

function expandMatrix(m: TopicMatrix): FeedSourceEntry[] {
  const results: FeedSourceEntry[] = [];
  for (const entity of m.entities) {
    for (const context of m.contexts) {
      const slug = `${entity} ${context}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, 40);
      const id = `${m.prefix}-${slug}`;
      const query = `${entity} ${context}`;
      results.push({
        id,
        name: `GN: ${entity.slice(0, 18)} ${context.slice(0, 10)}`,
        url: GN(query),
        category: m.category,
        tags: query
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 2),
        tier: m.tier,
        region: m.region ?? 'national',
      });
    }
  }
  return results;
}

// ─── MATRIX 1: EDTECH COMPANIES MEGA ──────────────────────────────────────────
// 60 entities × 25 contexts = 1,500 entries
const EDTECH_COMPANIES_MEGA: TopicMatrix = {
  prefix: 'edu-tech',
  category: 'General',
  tier: 3,
  region: 'global',
  entities: [
    'Coursera',
    'Udemy',
    'edX 2U',
    'Skillshare',
    'Pluralsight',
    'LinkedIn Learning',
    'Codecademy',
    'DataCamp',
    'Brilliant.org',
    'Khan Academy',
    'Duolingo',
    'Babbel',
    'Busuu',
    'Rosetta Stone',
    'Chegg',
    'Course Hero',
    'Quizlet',
    'Brainly',
    'Photomath',
    'Wolfram Alpha',
    'Turnitin',
    'Grammarly',
    'ProWritingAid',
    'Canva Education',
    'Google Classroom',
    'Microsoft Teams Education',
    'Zoom Education',
    'Canvas LMS Instructure',
    'Blackboard Anthology',
    'Moodle',
    'D2L Brightspace',
    'Schoology PowerSchool',
    'PowerSchool',
    'Infinite Campus',
    'Clever',
    'ClassLink',
    'Renaissance Learning',
    'NWEA',
    'Curriculum Associates',
    'DreamBox Learning',
    'IXL Learning',
    'Amplify Education',
    'Newsela',
    'CommonLit',
    'Nearpod',
    'Pear Deck',
    'Kahoot',
    'Quizizz',
    'Socrative',
    'Proctorio',
    'ExamSoft',
    'Respondus',
    'ProctorU Meazure',
    'Honorlock',
    'BioSig-ID',
    'Top Hat',
    'Echo360',
    'Panopto',
    'YuJa',
    'Instructure',
  ],
  contexts: [
    'revenue',
    'funding',
    'IPO',
    'users',
    'acquisition',
    'partnership',
    'AI',
    'GPT',
    'adaptive learning',
    'personalization',
    'assessment',
    'credential',
    'certificate',
    'degree',
    'workforce',
    'reskilling',
    'upskilling',
    'enterprise training',
    'K-12',
    'higher education',
    'community college',
    'bootcamp',
    'micro-credential',
    'competency-based',
    'gamification',
  ],
};

// ─── MATRIX 2: WORKFORCE PLATFORMS MEGA ───────────────────────────────────────
// 50 entities × 20 contexts = 1,000 entries
const WORKFORCE_PLATFORMS_MEGA: TopicMatrix = {
  prefix: 'edu-work',
  category: 'General',
  tier: 3,
  region: 'national',
  entities: [
    'Indeed',
    'LinkedIn',
    'ZipRecruiter',
    'Glassdoor',
    'Monster',
    'CareerBuilder',
    'Dice',
    'Hired',
    'AngelList Talent',
    'Wellfound',
    'Lever',
    'Greenhouse',
    'Workday Recruiting',
    'iCIMS',
    'Jobvite',
    'SmartRecruiters',
    'Bullhorn',
    'Avature',
    'Phenom People',
    'Eightfold AI',
    'HiredScore',
    'Paradox Olivia AI',
    'XOR AI',
    'AllyO',
    'Textio',
    'Datapeople',
    'Handshake',
    'RippleMatch',
    'Symba',
    'Parker Dewey',
    'Forage',
    'Springboard',
    'Thinkful',
    'Flatiron School',
    'General Assembly',
    'Lambda School Bloom',
    'Galvanize',
    'Hack Reactor',
    'App Academy',
    'Karat',
    'CodeSignal',
    'HackerRank',
    'LeetCode',
    'Codility',
    'TestGorilla',
    'Criteria Corp',
    'Wonderlic',
    'Pymetrics',
    'HireVue',
    'Vervoe',
  ],
  contexts: [
    'hiring',
    'talent',
    'market',
    'trend',
    'layoff',
    'automation',
    'AI screening',
    'bias',
    'DEI',
    'remote work',
    'hybrid',
    'gig economy',
    'freelance',
    'contractor',
    'benefits',
    'compensation',
    'salary',
    'equity',
    'retention',
    'engagement',
  ],
};

// ─── MATRIX 3: RESEARCH UNIVERSITIES MEGA ─────────────────────────────────────
// 60 entities × 30 contexts = 1,800 entries
const RESEARCH_UNIVERSITIES_MEGA: TopicMatrix = {
  prefix: 'edu-uni',
  category: 'General',
  tier: 4,
  region: 'national',
  entities: [
    'MIT',
    'Stanford University',
    'Harvard University',
    'Caltech',
    'Princeton University',
    'Yale University',
    'Columbia University',
    'University of Chicago',
    'Duke University',
    'Northwestern University',
    'Johns Hopkins University',
    'University of Pennsylvania',
    'Cornell University',
    'Brown University',
    'Dartmouth College',
    'Rice University',
    'Vanderbilt University',
    'Notre Dame',
    'Georgetown University',
    'Emory University',
    'Carnegie Mellon University',
    'Georgia Tech',
    'UC Berkeley',
    'UCLA',
    'UC San Diego',
    'UCSF',
    'UC Davis',
    'UC Irvine',
    'UC Santa Barbara',
    'University of Michigan',
    'University of Wisconsin',
    'University of Illinois UIUC',
    'Purdue University',
    'Ohio State University',
    'Penn State University',
    'University of Minnesota',
    'University of Iowa',
    'Indiana University',
    'University of Maryland',
    'University of Virginia',
    'UNC Chapel Hill',
    'University of Texas Austin',
    'Texas A&M University',
    'University of Florida',
    'University of Georgia',
    'University of Washington',
    'University of Oregon',
    'University of Colorado',
    'University of Arizona',
    'Arizona State University',
    'UTEP University of Texas El Paso',
    'University of New Mexico',
    'Sandia National Laboratories',
    'Los Alamos National Laboratory',
    'Oak Ridge National Laboratory',
    'Argonne National Laboratory',
    'Brookhaven National Laboratory',
    'Fermilab',
    'JPL Caltech',
    'NREL National Renewable Energy',
  ],
  contexts: [
    'research',
    'grant',
    'funding',
    'NIH',
    'NSF',
    'DOE',
    'DOD',
    'DARPA',
    'ARPA-H',
    'ARPA-E',
    'patent',
    'spin-off',
    'startup',
    'publication',
    'breakthrough',
    'Nobel',
    'Fields Medal',
    'Turing Award',
    'faculty',
    'student',
    'enrollment',
    'tuition',
    'endowment',
    'donation',
    'ranking',
    'accreditation',
    'online program',
    'partnership',
    'industry collaboration',
    'technology transfer',
  ],
};

// ─── EXPORT ────────────────────────────────────────────────────────────────────

export const EDUCATION_WORKFORCE_MEGA_SOURCES: FeedSourceEntry[] = [
  ...expandMatrix(EDTECH_COMPANIES_MEGA),       // 60 × 25 = 1,500
  ...expandMatrix(WORKFORCE_PLATFORMS_MEGA),    // 50 × 20 = 1,000
  ...expandMatrix(RESEARCH_UNIVERSITIES_MEGA),  // 60 × 30 = 1,800
  // ─────────────────────────────────────────────────────────
  // TOTAL: 4,300 entries
];

export type { FeedSourceEntry };
