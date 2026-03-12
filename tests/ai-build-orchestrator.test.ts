import assert from 'node:assert/strict';
import test from 'node:test';

import { deduplicateActions } from '@/lib/intelligence/ai-build-orchestrator';

test('deduplicateActions keeps highest priority entry by title', () => {
  const deduped = deduplicateActions([
    {
      title: 'Create source registry migration',
      owner: 'Team A',
      priority: 'P2',
      notes: null,
    },
    {
      title: 'create   source registry migration',
      owner: 'Team B',
      priority: 'P0',
      notes: 'urgent',
    },
    {
      title: 'Add trend momentum endpoint',
      owner: 'Team C',
      priority: 'P1',
      notes: null,
    },
  ]);

  assert.equal(deduped.length, 2);
  const sourceTask = deduped.find((item) => item.title.toLowerCase().includes('source registry'));
  assert.ok(sourceTask);
  assert.equal(sourceTask?.priority, 'P0');
});

