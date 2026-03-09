// src/lib/agents/os/task-board.ts
// Task board — work queue for agents. Agents claim tasks, execute them, report results.

import type { Task, TaskType, TaskPriority, TaskStatus } from './types';

// ─── Task Board ─────────────────────────────────────────────────────────────────

class TaskBoard {
  private tasks: Task[] = [];
  private maxTasks = 1000;

  /** Add a task to the board */
  add(type: TaskType, input: Record<string, unknown>, priority: TaskPriority = 'medium'): Task {
    const task: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      priority,
      status: 'pending',
      input,
      created_at: new Date().toISOString(),
    };

    this.tasks.push(task);

    // Trim old completed/failed tasks
    if (this.tasks.length > this.maxTasks) {
      this.tasks = this.tasks.filter(t =>
        t.status === 'pending' || t.status === 'claimed' || t.status === 'running'
      ).concat(
        this.tasks
          .filter(t => t.status === 'completed' || t.status === 'failed')
          .slice(-200)
      );
    }

    return task;
  }

  /** Claim the highest-priority pending task of a given type */
  claim(taskTypes: TaskType[], agentId: string): Task | null {
    const priorityOrder: TaskPriority[] = ['critical', 'high', 'medium', 'low'];

    for (const priority of priorityOrder) {
      const task = this.tasks.find(t =>
        t.status === 'pending' &&
        t.priority === priority &&
        taskTypes.includes(t.type)
      );
      if (task) {
        task.status = 'claimed';
        task.claimed_by = agentId;
        return task;
      }
    }

    return null;
  }

  /** Mark task as running */
  start(taskId: string): void {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      task.status = 'running';
      task.started_at = new Date().toISOString();
    }
  }

  /** Mark task as completed with output */
  complete(taskId: string, output: Record<string, unknown> = {}): void {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      task.status = 'completed';
      task.output = output;
      task.completed_at = new Date().toISOString();
    }
  }

  /** Mark task as failed */
  fail(taskId: string, error: string): void {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      task.status = 'failed';
      task.error = error;
      task.completed_at = new Date().toISOString();
    }
  }

  /** Get all pending tasks */
  getPending(type?: TaskType): Task[] {
    return this.tasks.filter(t =>
      t.status === 'pending' && (type ? t.type === type : true)
    );
  }

  /** Get task counts by status */
  getStats(): Record<TaskStatus, number> {
    const stats: Record<TaskStatus, number> = {
      pending: 0, claimed: 0, running: 0, completed: 0, failed: 0,
    };
    for (const task of this.tasks) {
      stats[task.status]++;
    }
    return stats;
  }

  /** Get recent completed tasks */
  getCompleted(limit = 20): Task[] {
    return this.tasks
      .filter(t => t.status === 'completed')
      .slice(-limit);
  }

  /** Clear all tasks (for testing) */
  reset(): void {
    this.tasks = [];
  }
}

// Singleton
export const taskBoard = new TaskBoard();
