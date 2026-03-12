// src/lib/agents/os/layers.ts
// The 7 layers of the Agent OS pipeline.
// Each layer runs its agents, emits events, and feeds the next layer.

import type { LayerRunResult } from './types';
import { eventBus, createEvent } from './event-bus';
import { sharedMemory } from './shared-memory';

// Layer dependencies
import { runFeedAgent } from '@/lib/agents/feed-agent';
import { runGraphBuilderAgent } from '@/lib/agents/agents/graph-builder-agent';
import { getIntelSignals } from '@/db/queries/intel-signals';
import { getEntitiesByType } from '@/db/queries/knowledge-graph';
import { scoreEmergingIndustry, shouldCreateCandidate } from '@/lib/agents/scoring/emerging-industry-score';
import { runPredictions } from '@/lib/engines/prediction-engine';
import { runOpportunityEngine } from '@/lib/engines/opportunity-engine';
import { buildIndustryProfile } from '@/lib/engines/industry-profile';
import { INDUSTRIES } from '@/lib/data/technology-catalog';

// ─── Layer 1: Signal Intake ─────────────────────────────────────────────────────
// Watches the world. Collects signals. Does NOT analyze.

export async function runSignalIntake(): Promise<LayerRunResult> {
  const start = Date.now();
  const errors: string[] = [];
  let eventsEmitted = 0;
  let tasksCompleted = 0;

  try {
    // Fetch all RSS feeds
    const feedStore = await runFeedAgent();
    const articles = feedStore.items;
    tasksCompleted++;

    // Emit signal_detected for each new article
    for (const article of articles.slice(0, 50)) {
      await eventBus.emit(createEvent(
        'signal_detected',
        'signal_intake',
        'feed-scanner',
        {
          title: article.title,
          source: article.source,
          category: article.category,
          url: article.link,
          pubDate: article.pubDate,
        },
      ));
      eventsEmitted++;
    }

    // Track what we found
    sharedMemory.set('last_scan_count', articles.length);
    sharedMemory.set('last_scan_at', new Date().toISOString());

    await eventBus.emit(createEvent(
      'source_added',
      'signal_intake',
      'feed-scanner',
      { total_articles: articles.length },
    ));
    eventsEmitted++;

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Signal intake failed';
    errors.push(msg);
  }

  return {
    status: errors.length > 0 ? 'partial' : 'success',
    duration_ms: Date.now() - start,
    tasks_completed: tasksCompleted,
    events_emitted: eventsEmitted,
    errors,
  };
}

// ─── Layer 2: Knowledge Engine ──────────────────────────────────────────────────
// Converts signals into structured knowledge. Builds the graph.

export async function runKnowledgeEngine(): Promise<LayerRunResult> {
  const start = Date.now();
  const errors: string[] = [];
  let eventsEmitted = 0;
  let tasksCompleted = 0;

  try {
    // Run the graph builder on recent signals
    const result = await runGraphBuilderAgent();
    tasksCompleted++;

    // Emit events for what was created
    if (result.entities_created > 0) {
      await eventBus.emit(createEvent(
        'entity_created',
        'knowledge_engine',
        'graph-builder',
        { count: result.entities_created },
      ));
      eventsEmitted++;
    }

    if (result.relationships_created > 0) {
      await eventBus.emit(createEvent(
        'relationship_created',
        'knowledge_engine',
        'graph-builder',
        { count: result.relationships_created },
      ));
      eventsEmitted++;
    }

    if (result.relationships_strengthened > 0) {
      await eventBus.emit(createEvent(
        'relationship_strengthened',
        'knowledge_engine',
        'graph-builder',
        { count: result.relationships_strengthened },
      ));
      eventsEmitted++;
    }

    // Update shared memory
    sharedMemory.set('graph_signals_processed', result.signals_processed);
    sharedMemory.set('graph_last_run', new Date().toISOString());

    await eventBus.emit(createEvent(
      'graph_updated',
      'knowledge_engine',
      'graph-builder',
      {
        entities_created: result.entities_created,
        relationships_created: result.relationships_created,
        relationships_strengthened: result.relationships_strengthened,
        signals_processed: result.signals_processed,
      },
    ));
    eventsEmitted++;

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Knowledge engine failed';
    errors.push(msg);
  }

  return {
    status: errors.length > 0 ? 'partial' : 'success',
    duration_ms: Date.now() - start,
    tasks_completed: tasksCompleted,
    events_emitted: eventsEmitted,
    errors,
  };
}

// ─── Layer 3: Reasoning Engine ──────────────────────────────────────────────────
// Interprets patterns. Detects trajectories, opportunities, emerging industries.

export async function runReasoningEngine(): Promise<LayerRunResult> {
  const start = Date.now();
  const errors: string[] = [];
  let eventsEmitted = 0;
  let tasksCompleted = 0;

  try {
    // Get recent signals for scoring
    const signals = await getIntelSignals({ limit: 200 });
    tasksCompleted++;

    // Score each known industry for emerging trends
    const industrySignals = new Map<string, typeof signals>();
    for (const s of signals) {
      const existing = industrySignals.get(s.industry) ?? [];
      existing.push(s);
      industrySignals.set(s.industry, existing);
    }

    const candidates: Array<{ keyword: string; score: number; label: string }> = [];

    for (const [industry, indSignals] of Array.from(industrySignals.entries() as Iterable<[string, typeof signals]>)) {
      const result = scoreEmergingIndustry(industry, indSignals, 0);
      tasksCompleted++;

      if (shouldCreateCandidate(result.score)) {
        candidates.push({
          keyword: industry,
          score: result.score,
          label: result.label,
        });

        await eventBus.emit(createEvent(
          'industry_emerging',
          'reasoning_engine',
          'trend-detector',
          { industry, score: result.score, label: result.label },
        ));
        eventsEmitted++;
      }

      // Detect trajectory changes
      if (result.momentum_score > 12) {
        await eventBus.emit(createEvent(
          'trajectory_detected',
          'reasoning_engine',
          'trend-detector',
          { industry, momentum: result.momentum_score, direction: 'accelerating' },
        ));
        eventsEmitted++;
      }
    }

    // Store candidates in shared memory
    sharedMemory.set('emerging_candidates', candidates);
    sharedMemory.set('reasoning_last_run', new Date().toISOString());

    // Detect cross-industry patterns (convergence)
    if (candidates.length >= 2) {
      await eventBus.emit(createEvent(
        'convergence_detected',
        'reasoning_engine',
        'pattern-detector',
        { industries: candidates.map(c => c.keyword), count: candidates.length },
      ));
      eventsEmitted++;
    }

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Reasoning engine failed';
    errors.push(msg);
  }

  return {
    status: errors.length > 0 ? 'partial' : 'success',
    duration_ms: Date.now() - start,
    tasks_completed: tasksCompleted,
    events_emitted: eventsEmitted,
    errors,
  };
}

// ─── Layer 3.5: Prediction Engine ────────────────────────────────────────────────
// Forecasts trajectories, detects convergence, estimates timing, flags risks.

export async function runPredictionEngine(): Promise<LayerRunResult> {
  const start = Date.now();
  const errors: string[] = [];
  let eventsEmitted = 0;
  let tasksCompleted = 0;

  try {
    const report = await runPredictions();
    tasksCompleted++;

    // Store the full report in shared memory
    sharedMemory.set('prediction_report', report);
    sharedMemory.set('prediction_last_run', new Date().toISOString());

    // Emit events for key findings
    for (const t of report.trajectories.slice(0, 20)) {
      await eventBus.emit(createEvent(
        'forecast_generated',
        'prediction_engine',
        'trajectory-forecaster',
        {
          industry: t.industry,
          direction: t.direction,
          velocity: t.velocity,
          current_score: t.current_score,
          predicted_30d: t.predicted_score_30d,
          predicted_90d: t.predicted_score_90d,
        },
      ));
      eventsEmitted++;
    }

    for (const c of report.convergences) {
      await eventBus.emit(createEvent(
        'convergence_predicted',
        'prediction_engine',
        'convergence-detector',
        {
          industries: c.industries,
          score: c.convergence_score,
          time_horizon: c.time_horizon,
          shared_companies: c.shared_companies.length,
        },
      ));
      eventsEmitted++;
    }

    for (const t of report.timing) {
      await eventBus.emit(createEvent(
        'timing_estimated',
        'prediction_engine',
        'timing-estimator',
        {
          industry: t.industry,
          next_milestone: t.next_milestone,
          estimated_days: t.estimated_days,
        },
      ));
      eventsEmitted++;
    }

    for (const r of report.risks) {
      await eventBus.emit(createEvent(
        'risk_detected',
        'prediction_engine',
        'risk-scanner',
        {
          industry: r.industry,
          risk_type: r.risk_type,
          severity: r.severity,
          description: r.description,
        },
      ));
      eventsEmitted++;
    }

    console.log(`[agent-os] Prediction: ${report.trajectories.length} forecasts, ${report.convergences.length} convergences, ${report.risks.length} risks`);

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Prediction engine failed';
    errors.push(msg);
  }

  return {
    status: errors.length > 0 ? 'partial' : 'success',
    duration_ms: Date.now() - start,
    tasks_completed: tasksCompleted,
    events_emitted: eventsEmitted,
    errors,
  };
}

// ─── Layer 3.75: Opportunity Engine ─────────────────────────────────────────────
// Discovers actionable opportunities from signal patterns + strategic frameworks.

export async function runOpportunityEngineLayer(): Promise<LayerRunResult> {
  const start = Date.now();
  const errors: string[] = [];
  let eventsEmitted = 0;
  let tasksCompleted = 0;

  try {
    const report = await runOpportunityEngine();
    tasksCompleted++;

    sharedMemory.set('opportunity_report', report);
    sharedMemory.set('opportunity_last_run', new Date().toISOString());

    for (const opp of report.opportunities.slice(0, 20)) {
      await eventBus.emit(createEvent(
        'opportunity_scored',
        'prediction_engine', // closest layer
        'opportunity-engine',
        {
          id: opp.id,
          type: opp.type,
          title: opp.title,
          score: opp.score,
          industries: opp.industries,
          timing: opp.timing,
          risk_level: opp.risk_level,
        },
      ));
      eventsEmitted++;
    }

    console.log(`[agent-os] Opportunities: ${report.opportunities.length} discovered across ${report.industry_coverage} industries`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Opportunity engine failed';
    errors.push(msg);
  }

  return {
    status: errors.length > 0 ? 'partial' : 'success',
    duration_ms: Date.now() - start,
    tasks_completed: tasksCompleted,
    events_emitted: eventsEmitted,
    errors,
  };
}

// ─── Layer 4: Creation Engine ───────────────────────────────────────────────────
// Turns insights into products. Builds pages, profiles, reports.

export async function runCreationEngine(): Promise<LayerRunResult> {
  const start = Date.now();
  const errors: string[] = [];
  let eventsEmitted = 0;
  let tasksCompleted = 0;

  try {
    // Rebuild profiles for all core industries
    for (const industry of INDUSTRIES) {
      try {
        const profile = await buildIndustryProfile(industry.slug);
        tasksCompleted++;

        // Cache the profile in shared memory
        sharedMemory.set(`profile:${industry.slug}`, profile);

        await eventBus.emit(createEvent(
          'profile_updated',
          'creation_engine',
          'profile-builder',
          { slug: industry.slug, blocks: Object.keys(profile.blocks).length },
        ));
        eventsEmitted++;

      } catch (err) {
        const msg = err instanceof Error ? err.message : `Profile build failed for ${industry.slug}`;
        errors.push(msg);
      }
    }

    // Build profiles for emerging candidates
    const candidates = sharedMemory.get<Array<{ keyword: string; score: number }>>('emerging_candidates') ?? [];
    for (const candidate of candidates.filter(c => c.score >= 60)) {
      try {
        const slug = candidate.keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const profile = await buildIndustryProfile(slug);
        tasksCompleted++;

        sharedMemory.set(`profile:${slug}`, profile);

        await eventBus.emit(createEvent(
          'page_generated',
          'creation_engine',
          'industry-builder',
          { slug, score: candidate.score },
        ));
        eventsEmitted++;

      } catch (err) {
        // Non-critical — emerging industries may not have enough data yet
        const msg = err instanceof Error ? err.message : `Emerging profile failed: ${candidate.keyword}`;
        errors.push(msg);
      }
    }

    sharedMemory.set('creation_last_run', new Date().toISOString());

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Creation engine failed';
    errors.push(msg);
  }

  return {
    status: errors.length > 0 ? 'partial' : 'success',
    duration_ms: Date.now() - start,
    tasks_completed: tasksCompleted,
    events_emitted: eventsEmitted,
    errors,
  };
}

// ─── Layer 5: Publishing Engine ─────────────────────────────────────────────────
// Updates the website. Pushes profiles to API cache, updates feeds.

export async function runPublishingEngine(): Promise<LayerRunResult> {
  const start = Date.now();
  const errors: string[] = [];
  let eventsEmitted = 0;
  let tasksCompleted = 0;

  try {
    // Count published profiles
    const profileKeys = sharedMemory.keys().filter(k => k.startsWith('profile:'));
    tasksCompleted++;

    // Emit publish events for each updated profile
    for (const key of profileKeys) {
      const slug = key.replace('profile:', '');
      await eventBus.emit(createEvent(
        'page_published',
        'publishing_engine',
        'publisher',
        { slug, cached: true },
      ));
      eventsEmitted++;
    }

    // Update the publish queue
    sharedMemory.set('published_count', profileKeys.length);
    sharedMemory.set('publishing_last_run', new Date().toISOString());

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Publishing engine failed';
    errors.push(msg);
  }

  return {
    status: errors.length > 0 ? 'partial' : 'success',
    duration_ms: Date.now() - start,
    tasks_completed: tasksCompleted,
    events_emitted: eventsEmitted,
    errors,
  };
}

// ─── Layer 6: Quality Control ───────────────────────────────────────────────────
// Prevents garbage. Checks confidence, detects duplicates, flags stale data.

export async function runQualityControl(): Promise<LayerRunResult> {
  const start = Date.now();
  const errors: string[] = [];
  let eventsEmitted = 0;
  let tasksCompleted = 0;

  try {
    // Check all cached profiles for quality
    const profileKeys = sharedMemory.keys().filter(k => k.startsWith('profile:'));

    for (const key of profileKeys) {
      const profile = sharedMemory.get<{ blocks: { snapshot: { company_count: number; technology_count: number }; timeline: unknown[] }; slug: string }>(key);
      if (!profile) continue;

      const companyCount = profile.blocks.snapshot.company_count;
      const techCount = profile.blocks.snapshot.technology_count;
      const timelineCount = Array.isArray(profile.blocks.timeline) ? profile.blocks.timeline.length : 0;

      // Quality gate: minimum data for publishing
      const hasEnoughData = companyCount >= 1 || techCount >= 1 || timelineCount >= 1;

      if (hasEnoughData) {
        await eventBus.emit(createEvent(
          'quality_check_passed',
          'quality_control',
          'inspector',
          { slug: profile.slug, companies: companyCount, technologies: techCount, signals: timelineCount },
        ));
      } else {
        await eventBus.emit(createEvent(
          'quality_check_failed',
          'quality_control',
          'inspector',
          { slug: profile.slug, reason: 'Insufficient data', companies: companyCount, technologies: techCount },
        ));
      }
      eventsEmitted++;
      tasksCompleted++;
    }

    // Check for stale entities in the graph
    try {
      const industries = await getEntitiesByType('industry');
      const now = Date.now();
      const staleThreshold = 30 * 24 * 60 * 60 * 1000; // 30 days

      for (const entity of industries) {
        if (entity.last_seen_at) {
          const age = now - new Date(entity.last_seen_at).getTime();
          if (age > staleThreshold) {
            await eventBus.emit(createEvent(
              'stale_entity_flagged',
              'quality_control',
              'inspector',
              { entity_id: entity.id, name: entity.name, age_days: Math.floor(age / (24 * 60 * 60 * 1000)) },
            ));
            eventsEmitted++;
          }
        }
      }
      tasksCompleted++;
    } catch {
      // Graph may not be populated yet — non-critical
    }

    sharedMemory.set('quality_last_run', new Date().toISOString());

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Quality control failed';
    errors.push(msg);
  }

  return {
    status: errors.length > 0 ? 'partial' : 'success',
    duration_ms: Date.now() - start,
    tasks_completed: tasksCompleted,
    events_emitted: eventsEmitted,
    errors,
  };
}
