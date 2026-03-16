// src/lib/feeds/mega/media-entertainment-sources.ts
// NXT//LINK Media & Entertainment Mega-Registry
// Matrices × cross-product expansion = 4,000+ unique Google News RSS feeds

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

// ─── MATRIX 1: MEDIA COMPANIES ────────────────────────────────────────────────
// 60 entities × 25 contexts = 1,500 entries
const MEDIA_COMPANIES: TopicMatrix = {
  prefix: 'med-co',
  category: 'General',
  tier: 3,
  region: 'global',
  entities: [
    'Disney streaming',
    'Netflix',
    'Amazon Studios',
    'Apple TV+',
    'HBO Max Warner Bros',
    'Paramount+',
    'Peacock NBCUniversal',
    'Hulu',
    'YouTube',
    'TikTok ByteDance',
    'Instagram Meta',
    'Facebook Meta',
    'X Twitter',
    'Snapchat',
    'Pinterest',
    'Reddit',
    'LinkedIn Microsoft',
    'Discord',
    'Twitch Amazon',
    'Spotify',
    'Apple Music',
    'Amazon Music',
    'YouTube Music',
    'Tidal music',
    'Deezer',
    'SoundCloud',
    'Pandora',
    'iHeartMedia',
    'SiriusXM',
    'Audible audiobook',
    'Pocket Casts podcast',
    'New York Times',
    'Washington Post',
    'Wall Street Journal',
    'Bloomberg media',
    'Reuters news',
    'AP news',
    'CNN',
    'Fox News',
    'MSNBC',
    'BBC',
    'Al Jazeera',
    'Substack newsletter',
    'Medium',
    'WordPress Automattic',
    'Conde Nast',
    'Hearst media',
    'Meredith media',
    'Dotdash Meredith',
    'BuzzFeed',
    'Vice Media',
    'Vox Media',
    'Insider Business',
    'The Athletic',
    'Axios',
    'Punchbowl News',
    'Semafor',
    'The Information',
    'Morning Brew',
    'Politico',
  ],
  contexts: [
    'revenue',
    'subscribers',
    'viewership',
    'content',
    'original',
    'licensing',
    'advertising',
    'streaming',
    'podcast',
    'newsletter',
    'paywall',
    'bundling',
    'partnership',
    'acquisition',
    'layoff',
    'hiring',
    'AI',
    'algorithm',
    'recommendation',
    'moderation',
    'regulation',
    'antitrust',
    'privacy',
    'creator economy',
    'monetization',
  ],
};

// ─── MATRIX 2: GAMING COMPANIES ───────────────────────────────────────────────
// 50 entities × 25 contexts = 1,250 entries
const GAMING_COMPANIES: TopicMatrix = {
  prefix: 'med-game',
  category: 'General',
  tier: 3,
  region: 'global',
  entities: [
    'Sony PlayStation',
    'Microsoft Xbox',
    'Nintendo',
    'Valve Steam',
    'Epic Games',
    'Tencent Gaming',
    'NetEase Games',
    'miHoYo Genshin',
    'Activision Blizzard',
    'EA Electronic Arts',
    'Take-Two Interactive',
    'Ubisoft',
    'Square Enix',
    'Capcom',
    'Sega',
    'Bandai Namco',
    'Konami',
    'Embracer Group',
    'THQ Nordic',
    'Deep Silver',
    'Roblox',
    'Unity Technologies',
    'Unreal Engine Epic',
    'Godot game engine',
    'Amazon Games',
    'NVIDIA GeForce Now',
    'Xbox Cloud Gaming',
    'PlayStation Now',
    'Amazon Luna',
    'Riot Games',
    'Supercell',
    'King Candy Crush',
    'Zynga Take-Two',
    'Niantic',
    'Scopely',
    'AppLovin',
    'IronSource Unity',
    'Appsflyer',
    'Adjust mobile',
    'Liftoff mobile',
    'Voodoo games',
    'CrazyLabs',
    'SayGames',
    'Jam City',
    'Garena Sea Limited',
    'Krafton PUBG',
    'Com2uS',
    'NCSoft',
    'Nexon',
    'Devolver Digital',
  ],
  contexts: [
    'revenue',
    'game launch',
    'console',
    'PC',
    'mobile',
    'VR',
    'AR',
    'metaverse',
    'cloud gaming',
    'esports',
    'streaming',
    'acquisition',
    'studio',
    'layoff',
    'hiring',
    'funding',
    'IPO',
    'technology',
    'engine',
    'AI',
    'procedural generation',
    'UGC',
    'live service',
    'battle pass',
    'microtransaction',
  ],
};

// ─── MATRIX 3: CREATIVE TECH ──────────────────────────────────────────────────
// 50 entities × 25 contexts = 1,250 entries
const CREATIVE_TECH: TopicMatrix = {
  prefix: 'med-crtv',
  category: 'General',
  tier: 3,
  region: 'global',
  entities: [
    'Adobe Creative Cloud',
    'Canva',
    'Figma',
    'Sketch design',
    'InVision design',
    'Framer design',
    'Webflow',
    'Bubble no-code',
    'Retool',
    'Notion',
    'Coda',
    'Airtable',
    'Monday.com',
    'Asana',
    'ClickUp',
    'Linear',
    'Jira Atlassian',
    'Confluence Atlassian',
    'Miro whiteboard',
    'FigJam',
    'Lucidchart',
    'Whimsical',
    'Pitch deck',
    'Beautiful.ai',
    'Gamma presentation',
    'Tome AI',
    'Runway ML video',
    'Midjourney AI',
    'DALL-E OpenAI',
    'Stable Diffusion',
    'Leonardo AI',
    'Pika Labs video',
    'Sora OpenAI video',
    'Runway Gen-2',
    'Synthesia AI video',
    'HeyGen AI avatar',
    'D-ID AI video',
    'Eleven Labs voice',
    'Murf AI voice',
    'Descript podcast',
    'CapCut video',
    'DaVinci Resolve',
    'Final Cut Pro',
    'Adobe Premiere Pro',
    'After Effects Adobe',
    'Cinema 4D',
    'Blender 3D',
    'Autodesk Maya',
    'Houdini SideFX',
    'ZBrush Maxon',
  ],
  contexts: [
    'revenue',
    'users',
    'funding',
    'acquisition',
    'AI',
    'generative',
    'automation',
    'template',
    'collaboration',
    'enterprise',
    'pricing',
    'freemium',
    'competition',
    'partnership',
    'integration',
    'API',
    'plugin',
    'marketplace',
    'creator',
    'designer',
    'developer',
    'marketer',
    'educator',
    'content',
    'workflow',
  ],
};

// ─── EXPORT ────────────────────────────────────────────────────────────────────

export const MEDIA_ENTERTAINMENT_MEGA_SOURCES: FeedSourceEntry[] = [
  ...expandMatrix(MEDIA_COMPANIES),    // 60 × 25 = 1,500
  ...expandMatrix(GAMING_COMPANIES),   // 50 × 25 = 1,250
  ...expandMatrix(CREATIVE_TECH),      // 50 × 25 = 1,250
  // ─────────────────────────────────────────────────────────
  // TOTAL: 4,000 entries
];

export type { FeedSourceEntry };
