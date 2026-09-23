import { getEncoding } from 'js-tiktoken';
import { describe, expect, it } from 'vitest';
import type { GitComparison } from '../../src/core/contracts/git.js';
import { renderBootSummary } from '../../src/core/services/boot-summary.js';
import { parseStateCheckpoint } from '../../src/core/validation/checkpoint-validator.js';
import { parseTaskPlan } from '../../src/core/validation/plan-validator.js';

const encoding = getEncoding('o200k_base');
const git: GitComparison = { checkedAt: '2026-09-17T12:00:00.000Z', divergences: [] };
const checkpointFile = 'state_checkpoint.json';
const plan = parseTaskPlan({
  schemaVersion: 1, taskId: 'long-task', title: 'Long task', currentStepId: 3,
  steps: Array.from({ length: 20 }, (_, index) => ({
    id: index + 1, title: `Step ${index + 1}`, status: index < 2 ? 'COMPLETED' : index === 2 ? 'IN_PROGRESS' : 'PENDING',
    validationCommand: `npm run check:${index + 1}`,
  })),
});

function checkpoint(constraints: string[], decisions: string[], modifiedFiles: string[]) {
  return parseStateCheckpoint({
    schemaVersion: 1, taskId: 'long-task', activeStepId: 3,
    gitState: { branch: 'main', lastCommitHash: null, cleanWorkingTree: true },
    workingMemory: { discoveredConstraints: constraints, decisionsMade: decisions, blockedItems: [], breakingChanges: [] },
    modifiedFiles, timestamp: '2026-09-17T12:00:00.000Z',
  });
}

describe('boot budget (RF12, CA-07, CA-08, TC-07, TC-08)', () => {
  it('keeps a 20-step, 20-constraint, 20-decision fixture within 1,000 tokens', () => {
    const constraints = Array.from({ length: 20 }, (_, index) => `Constraint ${index + 1}`);
    const decisions = Array.from({ length: 20 }, (_, index) => `Decision ${index + 1}`);
    const text = renderBootSummary({ plan, checkpoint: checkpoint(constraints, decisions, []), git, checkpointFile, maxTokens: 1000 });
    expect(encoding.encode(text).length).toBeLessThanOrEqual(1000);
    expect(text.length).toBeLessThanOrEqual(4000);
    for (const constraint of constraints) expect(text).toContain(`- ${constraint}\n`);
  });
});

describe('boot reduction order (RF12, CA-07, TC-07)', () => {
  it('removes modified files before the oldest decision and points to the checkpoint', () => {
    const longFile = `${'very-long-'.repeat(15)}modified-file-name.ts`;
    const memory = checkpoint(['Keep this exact constraint'], ['Old decision', 'New decision'], [longFile]);
    const full = renderBootSummary({ plan, checkpoint: memory, git, checkpointFile, maxTokens: 3000 });
    const budget = new TextEncoder().encode(full).length - 1;
    const trimmed = renderBootSummary({ plan, checkpoint: memory, git, checkpointFile, maxTokens: budget });
    expect(trimmed).not.toContain(longFile);
    expect(trimmed).toContain('- Old decision');
    expect(trimmed).toContain('- New decision');
    expect(trimmed).toContain(`Full checkpoint: ${checkpointFile}`);
    expect(encoding.encode(trimmed).length).toBeLessThanOrEqual(budget);
  });
  it('drops older decisions before newer decisions while retaining every constraint', () => {
    const memory = checkpoint(['Keep this exact constraint'], [`Old decision ${'x'.repeat(100)}`, 'New decision'], []);
    const full = renderBootSummary({ plan, checkpoint: memory, git, checkpointFile, maxTokens: 3000 });
    const budget = new TextEncoder().encode(full).length - 1;
    const trimmed = renderBootSummary({ plan, checkpoint: memory, git, checkpointFile, maxTokens: budget });
    expect(trimmed).not.toContain('Old decision');
    expect(trimmed).toContain('- New decision');
    expect(trimmed).toContain('- Keep this exact constraint');
    expect(trimmed).toContain(`Full checkpoint: ${checkpointFile}`);
  });
});
