import { describe, expect, it } from 'vitest';
import { CHECKPOINT_SCHEMA_VERSION, countWorkingMemory, hasRecordedGitState } from '../../src/core/contracts/state-checkpoint.js';
import { PLAN_SCHEMA_VERSION } from '../../src/core/contracts/task-plan.js';
import { assertCheckpointMatchesPlan, checkpointIssues, InvalidCheckpointError, parseStateCheckpoint } from '../../src/core/validation/checkpoint-validator.js';
import { parseTaskPlan } from '../../src/core/validation/plan-validator.js';

const TIMESTAMP = '2026-09-17T10:00:00.000Z';

function checkpoint(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: CHECKPOINT_SCHEMA_VERSION,
    taskId: 'refactor-auth',
    gitState: { branch: 'master', lastCommitHash: 'abc1234', cleanWorkingTree: true },
    workingMemory: {},
    timestamp: TIMESTAMP,
    ...extra,
  };
}
function planWithSteps(): ReturnType<typeof parseTaskPlan> {
  return parseTaskPlan({
    schemaVersion: PLAN_SCHEMA_VERSION, taskId: 'refactor-auth', title: 'Refactor auth',
    steps: [{ id: 1, title: 'one', status: 'COMPLETED' }, { id: 2, title: 'two', status: 'IN_PROGRESS' }],
  });
}

describe('state checkpoint contract (RF5, RF7)', () => {
  it('parses a checkpoint and defaults the working memory lists', () => {
    const parsed = parseStateCheckpoint(checkpoint({ activeStepId: 2 }));
    expect(parsed.workingMemory.discoveredConstraints).toEqual([]);
    expect(parsed.workingMemory.breakingChanges).toEqual([]);
    expect(parsed.modifiedFiles).toEqual([]);
    expect(parsed.activeStepId).toBe(2);
  });
  it('records constraints, decisions, blocks, and breaking changes (RF5)', () => {
    const parsed = parseStateCheckpoint(checkpoint({
      workingMemory: { discoveredConstraints: ['keep the public API'], decisionsMade: ['use zod'], blockedItems: ['waiting on review'], breakingChanges: ['renamed export'] },
    }));
    expect(countWorkingMemory(parsed.workingMemory)).toBe(4);
  });
  it('accepts absent git state so the file works without git (RF16, CA-12)', () => {
    const parsed = parseStateCheckpoint(checkpoint({ gitState: { branch: null, lastCommitHash: null, cleanWorkingTree: null } }));
    expect(hasRecordedGitState(parsed)).toBe(false);
  });
  it('rejects a non-ISO timestamp and unknown fields', () => {
    expect(checkpointIssues(checkpoint({ timestamp: 'yesterday' }))).not.toEqual([]);
    expect(checkpointIssues(checkpoint({ extra: true }))).not.toEqual([]);
  });
  it('rejects a missing git state block', () => {
    const invalid = checkpoint();
    delete invalid['gitState'];
    expect(checkpointIssues(invalid)).not.toEqual([]);
  });
});

describe('checkpoint against plan (RF7)', () => {
  it('accepts an active step present in the plan', () => {
    expect(() => assertCheckpointMatchesPlan(parseStateCheckpoint(checkpoint({ activeStepId: 2 })), planWithSteps())).not.toThrow();
  });
  it('rejects an active step absent from the plan', () => {
    const state = parseStateCheckpoint(checkpoint({ activeStepId: 99 }));
    try {
      assertCheckpointMatchesPlan(state, planWithSteps(), 'state_checkpoint.json');
      expect.unreachable('expected InvalidCheckpointError');
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidCheckpointError);
      expect((error as InvalidCheckpointError).issues).toContainEqual({ path: 'activeStepId', received: 99, rule: 'must reference a step present in the plan' });
    }
  });
  it('accepts a checkpoint with no active step', () => {
    expect(() => assertCheckpointMatchesPlan(parseStateCheckpoint(checkpoint()), planWithSteps())).not.toThrow();
  });
});

describe('state checkpoint schema version (RF8, CA-16, TC-16)', () => {
  it('names the required migration for another version', () => {
    const issues = checkpointIssues(checkpoint({ schemaVersion: 3 }));
    expect(issues).toHaveLength(1);
    expect(issues[0]?.rule).toContain('migrate the file to schema version 1');
  });
});
