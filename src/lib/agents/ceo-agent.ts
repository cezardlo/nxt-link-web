// src/lib/agents/ceo-agent.ts
// CEO Agent — top-level orchestrator for NXT LINK intelligence operations.
// Inspired by multi-agent company architecture.
//
// The CEO sets the agenda, delegates tasks to specialist agents,
// monitors progress via the event bus, and tracks strategic goals.

import { eventBus } from './os/event-bus';
import { taskBoard } from './os/task-board';
import { sharedMemory } from './os/shared-memory';

// ─── Types ───────────────────────────────────────────────────────────────────

export type StrategicPriority = 'critical' | 'high' | 'medium' | 'low';

export type AgentRoleName = 'ceo' | 'researcher' | 'analyst' | 'builder' | 'monitor' | 'scraper';

export type GoalStatus = 'pending' | 'active' | 'complete' | 'failed';

export type StrategicGoal = {
  id: string;
  objective: string;
  priority: StrategicPriority;
  assignedTo: AgentRoleName;
  status: GoalStatus;
  createdAt: string;
  completedAt?: string;
  result?: string;
};

export type AgentReport = {
  role: AgentRoleName;
  status: 'idle' | 'working' | 'complete' | 'error';
  lastAction: string;
  completedTasks: number;
  errors: string[];
  lastRunAt: string;
};

export type DailyBriefing = {
  runId: string;
  timestamp: string;
  goalsSet: number;
  goalsCompleted: number;
  agentReports: AgentReport[];
  topFindings: string[];
  platformHealthStatus: string;
  durationMs: number;
};

// ─── CEO Agent ───────────────────────────────────────────────────────────────

class CEOAgent {
  private goals: StrategicGoal[] = [];
  private agentReports = new Map<AgentRoleName, AgentReport>();

  constructor() {
    this.initReports();
    this.subscribeToEvents();
  }

  /** Initialize blank report cards for all specialist agents */
  private initReports(): void {
    const roles: AgentRoleName[] = ['researcher', 'analyst', 'builder', 'monitor', 'scraper'];
    for (const role of roles) {
      this.agentReports.set(role, {
        role,
        status: 'idle',
        lastAction: 'Awaiting instructions',
        completedTasks: 0,
        errors: [],
        lastRunAt: new Date().toISOString(),
      });
    }
  }

  /** Subscribe to OS event bus to track agent activity */
  private subscribeToEvents(): void {
    // Track when a profile is built (builder agent)
    eventBus.on('profile_updated', () => this.updateReport('builder', 'Updated industry profile'));
    eventBus.on('page_generated', () => this.updateReport('builder', 'Generated new industry page'));

    // Track signal intake (researcher / scraper)
    eventBus.on('signal_detected', () => this.updateReport('researcher', 'Signal detected from feed'));
    eventBus.on('source_added', () => this.updateReport('scraper', 'Source scan complete'));

    // Track analysis (analyst)
    eventBus.on('pattern_detected', () => this.updateReport('analyst', 'Pattern detected'));
    eventBus.on('industry_emerging', () => this.updateReport('analyst', 'Emerging industry scored'));
    eventBus.on('opportunity_scored', () => this.updateReport('analyst', 'Opportunity scored'));
    eventBus.on('risk_detected', () => this.updateReport('analyst', 'Risk alert generated'));

    // Track quality control (monitor)
    eventBus.on('quality_check_passed', () => this.updateReport('monitor', 'Quality check passed'));
    eventBus.on('quality_check_failed', () => this.updateReport('monitor', 'Quality check failed — flagged'));
    eventBus.on('stale_entity_flagged', () => this.updateReport('monitor', 'Stale entity flagged'));
  }

  /** Update a specialist agent's report card */
  private updateReport(role: AgentRoleName, lastAction: string): void {
    const existing = this.agentReports.get(role);
    if (!existing) return;
    this.agentReports.set(role, {
      ...existing,
      status: 'working',
      lastAction,
      completedTasks: existing.completedTasks + 1,
      lastRunAt: new Date().toISOString(),
    });
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * Sets the intelligence agenda — what topics to research next.
   * Each topic becomes a strategic goal delegated to the researcher.
   */
  setAgenda(topics: string[]): StrategicGoal[] {
    const newGoals: StrategicGoal[] = topics.map((topic, i) => ({
      id: `goal-${Date.now()}-${i}`,
      objective: `Research and profile: ${topic}`,
      priority: i === 0 ? 'high' : 'medium',
      assignedTo: 'researcher' as AgentRoleName,
      status: 'pending' as GoalStatus,
      createdAt: new Date().toISOString(),
    }));

    this.goals.push(...newGoals);

    // Store in shared memory so other agents can read the agenda
    sharedMemory.set('ceo_agenda', topics);
    sharedMemory.set('ceo_goals', this.goals);

    console.log(`[ceo-agent] Agenda set: ${topics.length} topics — ${topics.join(', ')}`);
    return newGoals;
  }

  /**
   * Delegates a single strategic goal to the appropriate specialist agent.
   * Routes based on goal priority and assignedTo role.
   */
  delegateTask(goal: StrategicGoal): void {
    // Mark as active
    const idx = this.goals.findIndex(g => g.id === goal.id);
    if (idx >= 0) {
      this.goals[idx] = { ...goal, status: 'active' };
    }

    // Push to the OS task board for the assigned agent to pick up
    const taskType = goal.assignedTo === 'builder' ? 'build_industry_page'
      : goal.assignedTo === 'analyst' ? 'detect_patterns'
      : goal.assignedTo === 'scraper' ? 'scan_source'
      : 'extract_signals'; // researcher + default

    taskBoard.add(
      taskType,
      {
        objective: goal.objective,
        goal_id: goal.id,
        assigned_to: goal.assignedTo,
      },
      goal.priority,
    );

    const report = this.agentReports.get(goal.assignedTo);
    if (report) {
      this.agentReports.set(goal.assignedTo, {
        ...report,
        status: 'working',
        lastAction: `Delegated: ${goal.objective.slice(0, 80)}`,
        lastRunAt: new Date().toISOString(),
      });
    }

    console.log(`[ceo-agent] Delegated to ${goal.assignedTo}: ${goal.objective}`);
  }

  /**
   * Returns the current status of all agents and active goals.
   */
  getStatus(): {
    goals: StrategicGoal[];
    agents: AgentReport[];
    agenda: string[];
    lastUpdated: string;
  } {
    return {
      goals: this.goals,
      agents: Array.from(this.agentReports.values()),
      agenda: sharedMemory.get<string[]>('ceo_agenda') ?? [],
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Runs the full daily intelligence cycle.
   * Sets an agenda based on trending industries, delegates all work,
   * checks platform health, and returns a briefing summary.
   */
  async runDailyBriefing(): Promise<DailyBriefing> {
    const start = Date.now();
    const runId = `briefing-${Date.now()}`;

    console.log(`[ceo-agent] Daily briefing ${runId} starting...`);

    // Step 1: Set agenda from emerging candidates detected by the reasoning engine
    const emergingCandidates = sharedMemory.get<Array<{ keyword: string; score: number }>>('emerging_candidates') ?? [];
    const topTopics = emergingCandidates.slice(0, 5).map(c => c.keyword);

    // Add always-on core topics if queue is thin
    const coreTopics = ['AI/ML', 'Cybersecurity', 'Defense', 'Energy', 'Logistics'];
    const agenda = [...new Set([...topTopics, ...coreTopics])].slice(0, 8);

    const goals = this.setAgenda(agenda);

    // Step 2: Delegate all goals to specialist agents
    for (const goal of goals) {
      this.delegateTask(goal);
    }

    // Step 3: Run platform health check via monitor agent
    let healthStatus = 'unknown';
    try {
      const { checkPlatformHealth } = await import('./monitor-agent');
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
      const health = await checkPlatformHealth(baseUrl);
      healthStatus = health.status;

      // Store monitor's findings in shared memory
      sharedMemory.set('monitor_health', health);

      // Update monitor report
      this.agentReports.set('monitor', {
        role: 'monitor',
        status: 'complete',
        lastAction: `Health check: ${health.status} (${health.apiResponseTime}ms)`,
        completedTasks: (this.agentReports.get('monitor')?.completedTasks ?? 0) + 1,
        errors: health.activeAlerts.map(a => a.title),
        lastRunAt: new Date().toISOString(),
      });

      // Step 4: Detect signal spikes
      const whatChangedData = sharedMemory.get('what_changed_cache');
      if (whatChangedData) {
        const { detectSignalSpikes } = await import('./monitor-agent');
        const spikes = await detectSignalSpikes(whatChangedData);
        if (spikes.length > 0) {
          sharedMemory.set('signal_spikes', spikes);
          console.log(`[ceo-agent] ${spikes.length} signal spike(s) detected`);
        }
      }
    } catch (err) {
      console.error('[ceo-agent] Health check failed:', err);
      healthStatus = 'degraded';
    }

    // Step 5: Mark all goals complete (delegated — specialist agents will execute)
    for (const goal of goals) {
      const idx = this.goals.findIndex(g => g.id === goal.id);
      if (idx >= 0) {
        this.goals[idx].status = 'complete';
        this.goals[idx].completedAt = new Date().toISOString();
        this.goals[idx].result = 'Delegated to specialist agents via task board';
      }
    }

    // Step 6: Collect top findings from shared memory
    const topFindings: string[] = [];
    const predictionReport = sharedMemory.get<{ trajectories: Array<{ industry: string; direction: string }> }>('prediction_report');
    if (predictionReport?.trajectories) {
      for (const t of predictionReport.trajectories.slice(0, 3)) {
        topFindings.push(`${t.industry}: ${t.direction} trajectory`);
      }
    }
    const opportunityReport = sharedMemory.get<{ opportunities: Array<{ title: string }> }>('opportunity_report');
    if (opportunityReport?.opportunities) {
      topFindings.push(`${opportunityReport.opportunities.length} opportunities detected`);
    }

    const briefing: DailyBriefing = {
      runId,
      timestamp: new Date().toISOString(),
      goalsSet: goals.length,
      goalsCompleted: goals.length,
      agentReports: Array.from(this.agentReports.values()),
      topFindings,
      platformHealthStatus: healthStatus,
      durationMs: Date.now() - start,
    };

    sharedMemory.set('last_daily_briefing', briefing);
    console.log(`[ceo-agent] Daily briefing ${runId} complete: ${goals.length} goals set, health=${healthStatus}, ${topFindings.length} findings`);

    return briefing;
  }

  /** Mark a goal complete with a result */
  completeGoal(goalId: string, result: string): void {
    const idx = this.goals.findIndex(g => g.id === goalId);
    if (idx >= 0) {
      this.goals[idx].status = 'complete';
      this.goals[idx].completedAt = new Date().toISOString();
      this.goals[idx].result = result;
      sharedMemory.set('ceo_goals', this.goals);
    }
  }

  /** Mark a goal failed */
  failGoal(goalId: string, reason: string): void {
    const idx = this.goals.findIndex(g => g.id === goalId);
    if (idx >= 0) {
      this.goals[idx].status = 'failed';
      this.goals[idx].result = reason;
      sharedMemory.set('ceo_goals', this.goals);
    }
  }
}

// Singleton
export const ceoAgent = new CEOAgent();
