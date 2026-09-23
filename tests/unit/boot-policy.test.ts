import { describe, expect, it } from 'vitest';
import { decideBoot, type BootPolicyInput } from '../../src/core/services/boot-policy.js';
import { invalidPlanSyntaxError } from '../../src/core/validation/plan-validator.js';

function input(): BootPolicyInput {
  return {
    plan: { kind: 'value', value: {
      schemaVersion: 1, taskId: 'task-1', title: 'Task one', currentStepId: 1,
      steps: [{ id: 1, title: 'Prepare', status: 'IN_PROGRESS', validationCommand: null }],
    } },
    checkpoint: { kind: 'value', value: {
      schemaVersion: 1, taskId: 'task-1', activeStepId: 1,
      gitState: { branch: null, lastCommitHash: null, cleanWorkingTree: null },
      workingMemory: { discoveredConstraints: [], decisionsMade: [], blockedItems: [], breakingChanges: [] },
      modifiedFiles: [], timestamp: '2026-09-17T12:00:00.000Z',
    } },
    planFile: 'task_plan.json', checkpointFile: 'state_checkpoint.json',
    git: { checkedAt: '2026-09-17T12:00:00.000Z', divergences: [] }, maxTokens: 1000,
  };
}

describe('boot policy invalid state (RF7, RF11, CA-04)', () => {
  it('names a malformed plan without revealing its content', () => {
    const error = invalidPlanSyntaxError('task_plan.json', 'SECRET PLAN', new SyntaxError('bad JSON'));
    const decision = decideBoot({ ...input(), plan: { kind: 'invalid', error } });
    expect(decision).toEqual({ kind: 'invalid_state', text: '[ContextBrake boot v1] Repair task_plan.json: (syntax): must be valid JSON. Validate the file before continuing.' });
    expect(JSON.stringify(decision)).not.toContain('SECRET PLAN');
  });
  it('names an invalid plan schema and missing checkpoint', () => {
    expect(decideBoot({ ...input(), plan: { kind: 'value', value: { schemaVersion: 2 } } })).toMatchObject({ kind: 'invalid_state', text: expect.stringContaining('migrate the file to schema version 1') });
    expect(decideBoot({ ...input(), checkpoint: { kind: 'missing' } })).toMatchObject({ kind: 'invalid_state', text: expect.stringContaining('state_checkpoint.json: file is missing') });
  });
  it('rejects an active checkpoint step absent from the plan', () => {
    const base = input();
    const value = base.checkpoint.kind === 'value' ? { ...base.checkpoint.value as Record<string, unknown>, activeStepId: 99 } : {};
    expect(decideBoot({ ...base, checkpoint: { kind: 'value', value } })).toMatchObject({ kind: 'invalid_state', text: expect.stringContaining('activeStepId: must reference a step present in the plan') });
  });
  it('instructs validation before editing when the active step has no command', () => {
    const decision = decideBoot(input());
    expect(decision.kind).toBe('boot');
    if (decision.kind === 'boot') expect(decision.text).toContain('Before any edit, record and run a validation command');
  });
});
