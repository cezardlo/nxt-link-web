import { agent, tool } from '@21st-sdk/agent';
import { z } from 'zod';

// NXT LINK Intelligence Agent — powered by @21st-sdk/agent
// Exposes key platform engines as callable tools for AI interactions

export const POST = agent({
  model: 'claude-sonnet-4-6',
  systemPrompt: `You are the NXT LINK Intelligence Agent — an expert technology acquisition analyst.
You track patents, research papers, government contracts, funding events, and market signals
across every industry. Answer questions with structured intelligence briefings.
Always cite sources and confidence levels. Use data from the tools available to you.`,
  tools: {
    searchIntelligence: tool({
      description: 'Search across all intelligence sources for a topic or industry',
      inputSchema: z.object({
        query: z.string().describe('Industry, technology, or topic to search'),
        depth: z.enum(['quick', 'deep']).default('quick').describe('Search depth'),
      }),
      execute: async ({ query, depth }) => {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
        const res = await fetch(`${baseUrl}/api/ask`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, depth }),
        });
        if (!res.ok) return { content: [{ type: 'text', text: `Search failed: ${res.status}` }] };
        const data = await res.json();
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              summary: data.expertBrief,
              topCompanies: data.keyPlayers?.slice(0, 5),
              innovations: data.innovationPipeline,
              marketSize: data.market?.size,
            }),
          }],
        };
      },
    }),

    getIndustryProfile: tool({
      description: 'Get a full intelligence profile for an industry',
      inputSchema: z.object({
        slug: z.string().describe('Industry slug e.g. cybersecurity, battery-storage, ai-ml'),
      }),
      execute: async ({ slug }) => {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
        const res = await fetch(`${baseUrl}/api/industry/${slug}/profile`);
        if (!res.ok) return { content: [{ type: 'text', text: 'Industry not found' }] };
        const data = await res.json();
        return {
          content: [{ type: 'text', text: JSON.stringify(data) }],
        };
      },
    }),

    getOpportunities: tool({
      description: 'Get top market opportunities detected by the platform',
      inputSchema: z.object({
        limit: z.number().default(10).describe('Number of opportunities to return'),
      }),
      execute: async ({ limit }) => {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
        const res = await fetch(`${baseUrl}/api/opportunities`);
        if (!res.ok) return { content: [{ type: 'text', text: 'Failed to fetch opportunities' }] };
        const data = await res.json();
        const ops = (data.opportunities ?? []).slice(0, limit);
        return {
          content: [{ type: 'text', text: JSON.stringify(ops) }],
        };
      },
    }),

    getWhatChanged: tool({
      description: 'Get latest signals, news, and changes across all industries',
      inputSchema: z.object({}),
      execute: async () => {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
        const res = await fetch(`${baseUrl}/api/what-changed`);
        if (!res.ok) return { content: [{ type: 'text', text: 'Failed to fetch signals' }] };
        const data = await res.json();
        return {
          content: [{ type: 'text', text: JSON.stringify(data) }],
        };
      },
    }),
  },
});
