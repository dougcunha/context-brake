import { describe, expect, it } from 'vitest';
import type { GitComparison } from '../../src/core/contracts/git.js';
import { decideBoot, type BootPolicyInput } from '../../src/core/services/boot-policy.js';
import { invalidCheckpointSyntaxError } from '../../src/core/validation/checkpoint-validator.js';

const git: GitComparison = { checkedAt: '2026-09-17T12:00:00.000Z', divergences: [] };
const steps = [
  { id: 1, title: 'Prepare', status: 'COMPLETED', validationCommand: 'npm run lint' },
  { id: 2, title: 'Design', status: 'COMPLETED', validationCommand: 'npm run typecheck' },
  { id: 3, title: 'Implement', status: 'IN_PROGRESS', validationCommand: 'npm test' },
  { id: 4, title: 'Review', status: 'PENDING', validationCommand: 'npm run coverage' },
];
function input(): BootPolicyInput {
  return {
    plan: { kind: 'value', value: { schemaVersion: 1, taskId: 'feature-1', title: 'Feature one', currentStepId: 3, steps } },
    checkpoint: { kind: 'value', value: {
      schemaVersion: 1, taskId: 'feature-1', activeStepId: 3,
      gitState: { branch: 'main', lastCommitHash: null, cleanWorkingTree: true },
      workingMemory: { discoveredConstraints: ['Keep API stable', 'Preserve user files'], decisionsMade: ['Use a port'], blockedItems: ['Waiting for review'], breakingChanges: [] },
      modifiedFiles: ['src/example.ts'], timestamp: '2026-09-17T12:00:00.000Z',
    } },
    planFile: 'task_plan.json', checkpointFile: 'state_checkpoint.json', git, maxTokens: 2000,
  };
}
describe('boot summary (RF9, RF15, CA-05)', () => {
  it('names the task, current and next steps, constraints, and first validation command', () => {
    const decision = decideBoot(input());
    expect(decision.kind).toBe('boot');
    if (decision.kind !== 'boot') return;
    expect(decision.text).toContain('Task: Feature one (feature-1)');
    expect(decision.text).toContain('Current step: 3: Implement (IN_PROGRESS)');
    expect(decision.text).toContain('Next step: 4: Review (PENDING)');
    expect(decision.text).toContain('- Keep API stable\n- Preserve user files');
    expect(decision.text).toContain('Before any edit, run `npm test` to validate step 3.');
    expect(decision.text).toContain('- Waiting for review');
  });
  it('uses the last completed step validation command when none is active', () => {
    const base = input();
    const plan = { schemaVersion: 1, taskId: 'feature-1', title: 'Feature one', steps: steps.map((step) => ({ ...step, status: step.id === 3 ? 'PENDING' : step.status })) };
    const decision = decideBoot({ ...base, plan: { kind: 'value', value: plan } });
    expect(decision.kind).toBe('boot');
    if (decision.kind === 'boot') {
      expect(decision.text).toContain('run `npm run typecheck` to validate step 2');
      expect(decision.text).toContain('Current step: 3: Implement (PENDING)\nNext step: 4: Review (PENDING)');
    }
  });
});
describe('boot repository state (RF14, RF16, CA-09, CA-10, CA-12)', () => {
  it('reports omitted repository checks without a repository comparison (RF16, CA-12)', () => {
    const decision = decideBoot({ ...input(), git: { ...git, divergences: [{ kind: 'checks_omitted', reason: 'git_missing' }] } });
    expect(decision.kind).toBe('boot');
    if (decision.kind === 'boot') {
      expect(decision.text).toContain('Repository checks omitted: git_missing.');
      expect(decision.text).not.toContain('Checkpoint commit');
    }
  });
  it('names both commits and uncommitted changes when git diverges (CA-09, CA-10)', () => {
    const divergences = [{ kind: 'outside_history' as const, recordedCommit: 'old', currentCommit: 'new' }, { kind: 'pending_changes' as const }];
    const decision = decideBoot({ ...input(), git: { ...git, divergences } });
    expect(decision.kind).toBe('boot');
    if (decision.kind === 'boot') expect(decision.text).toContain('old is outside current history at new.\n- Working tree has uncommitted changes.');
  });
});
describe('versioned boot text contract (RF9, TC-05)', () => {
  it('renders the exact Markdown sent to adapters', () => {
    const expected = [
      '[ContextBrake boot v1]',
      'Task: Feature one (feature-1)',
      'Current step: 3: Implement (IN_PROGRESS)',
      'Next step: 4: Review (PENDING)',
      '', '## Constraints', '- Keep API stable', '- Preserve user files',
      '', '## Decisions', '- Use a port',
      '', '## Blocked items', '- Waiting for review',
      '', '## Breaking changes', '- None',
      '', '## Modified files', '- src/example.ts',
      '', '## Repository state', '- None',
      '', '## Validate first', 'Before any edit, run `npm test` to validate step 3. If it fails, correct the inherited state first.',
    ].join('\n');
    expect(decideBoot(input())).toEqual({ kind: 'boot', text: expected });
  });
});
describe('boot policy (RF10, RF11, CA-04, CA-06)', () => {
  it('suppresses boot without a plan or after all steps complete', () => {
    expect(decideBoot({ ...input(), plan: { kind: 'missing' } })).toEqual({ kind: 'none' });
    const plan = { schemaVersion: 1, taskId: 'feature-1', title: 'Feature one', steps: steps.map((step) => ({ ...step, status: 'COMPLETED' })) };
    expect(decideBoot({ ...input(), plan: { kind: 'value', value: plan } })).toEqual({ kind: 'none' });
  });
  it('returns only a file and syntax error for malformed checkpoint JSON', () => {
    const error = invalidCheckpointSyntaxError('state_checkpoint.json', 'SECRET SENTINEL', new SyntaxError('bad JSON'));
    const decision = decideBoot({ ...input(), checkpoint: { kind: 'invalid', error } });
    expect(decision).toEqual({ kind: 'invalid_state', text: '[ContextBrake boot v1] Repair state_checkpoint.json: (syntax): must be valid JSON. Validate the file before continuing.' });
    expect(JSON.stringify(decision)).not.toContain('SECRET SENTINEL');
  });
  it('names a schema error and rejects a checkpoint for another task', () => {
    const base = input();
    expect(decideBoot({ ...base, checkpoint: { kind: 'value', value: { schemaVersion: 2 } } })).toMatchObject({ kind: 'invalid_state', text: expect.stringContaining('migrate the file to schema version 1') });
    const value = base.checkpoint.kind === 'value' ? { ...base.checkpoint.value as Record<string, unknown>, taskId: 'other' } : {};
    expect(decideBoot({ ...base, checkpoint: { kind: 'value', value } })).toMatchObject({ kind: 'invalid_state', text: expect.stringContaining('taskId must match task_plan.json') });
  });
});
