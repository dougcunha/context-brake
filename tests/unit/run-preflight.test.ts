import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { Hasher } from '../../src/core/contracts/run-ports.js';
import type { ApprovalsFile } from '../../src/core/contracts/run-records.js';
import type { PlanStepStatus, TaskPlan } from '../../src/core/contracts/task-plan.js';
import { approvalHash, assessPlan, listValidationCommands, unapprovedCommands } from '../../src/core/services/run-preflight.js';
import { InvalidPlanError } from '../../src/core/validation/plan-validator.js';
import { planWithStatuses } from '../helpers/run-plans.js';

const hasher: Hasher = { sha256: (text) => createHash('sha256').update(text).digest('hex') };
const planFile = 'task_plan.json';

function withCommands(commands: readonly (string | null)[], statuses: readonly PlanStepStatus[] = commands.map(() => 'PENDING')): TaskPlan {
  const plan = planWithStatuses(statuses, null);
  return { ...plan, steps: plan.steps.map((step, index) => ({ ...step, validationCommand: commands[index] ?? null })) };
}

describe('runnable-plan preflight (DEC-21, TC-08)', () => {
  it('lists every open step that lacks a validation command', () => {
    expect(assessPlan(withCommands(['npm test', null, '  ']), planFile)).toMatchObject({ kind: 'missing_commands', stepIds: [2, 3] });
  });
  it('ignores a completed step without a command', () => {
    expect(assessPlan(withCommands([null, 'npm test'], ['COMPLETED', 'PENDING']), planFile).kind).toBe('runnable');
  });
  it('reports a complete plan as nothing to run', () => {
    expect(assessPlan(planWithStatuses(['COMPLETED', 'COMPLETED'], null), planFile).kind).toBe('complete');
  });
  it('reports an empty plan as nothing to run', () => expect(assessPlan({ ...planWithStatuses([], null) }, planFile).kind).toBe('complete'));
  it('delegates an invalid plan to the PRD-03 validator with the file and rule', () => {
    const invalid = planWithStatuses(['IN_PROGRESS', 'IN_PROGRESS'], null);
    expect(() => assessPlan(invalid, planFile)).toThrow(InvalidPlanError);
    try { assessPlan(invalid, planFile); } catch (error) {
      expect((error as InvalidPlanError).filePath).toBe(planFile);
      expect((error as InvalidPlanError).issues[0]?.rule).toBe('must not contain more than one IN_PROGRESS step');
    }
  });
});

describe('approval hashes (RF14, DEC-10)', () => {
  const subject = { taskId: 'task', stepId: 1, command: 'npm test' };
  it('is stable for the same task, step, and command', () => expect(approvalHash(subject, hasher)).toBe(approvalHash({ ...subject }, hasher)));
  it('is a 64-character lowercase hex digest', () => expect(approvalHash(subject, hasher)).toMatch(/^[0-9a-f]{64}$/));
  it.each([
    ['one changed character', { ...subject, command: 'npm tesT' }],
    ['a trailing space', { ...subject, command: 'npm test ' }],
    ['another step', { ...subject, stepId: 2 }],
    ['a string step identifier', { ...subject, stepId: '1' }],
    ['another task', { ...subject, taskId: 'other' }],
  ])('changes with %s', (_label, changed) => expect(approvalHash(changed, hasher)).not.toBe(approvalHash(subject, hasher)));
  it('cannot collide by moving text between fields', () => {
    expect(approvalHash({ taskId: 'a', stepId: 'b c', command: 'd' }, hasher)).not.toBe(approvalHash({ taskId: 'a', stepId: 'b', command: 'c d' }, hasher));
  });
});

describe('command listing and unapproved commands (RF14, CA-10, TC-07)', () => {
  const plan = withCommands(['npm run build', 'npm test', 'npm run lint'], ['COMPLETED', 'IN_PROGRESS', 'PENDING']);
  const commands = listValidationCommands(plan, hasher);
  it('lists the command of each open step with its hash', () => {
    expect(commands).toEqual([
      { stepId: 2, command: 'npm test', hash: approvalHash({ taskId: 'task', stepId: 2, command: 'npm test' }, hasher) },
      { stepId: 3, command: 'npm run lint', hash: approvalHash({ taskId: 'task', stepId: 3, command: 'npm run lint' }, hasher) },
    ]);
  });
  it('skips an open step without a command', () => {
    expect(listValidationCommands(withCommands([null, 'npm test']), hasher).map((command) => command.stepId)).toEqual([2]);
  });
  it('reports every command when nothing is approved', () => {
    expect(unapprovedCommands(commands, { v: 1, approved: [] })).toEqual(commands);
  });
  it('omits approved hashes', () => {
    const approvals: ApprovalsFile = { v: 1, approved: [{ hash: commands[0]?.hash ?? '', stepId: 2, approvedAt: '2026-09-23T10:00:00.000Z' }] };
    expect(unapprovedCommands(commands, approvals)).toEqual([commands[1]]);
  });
  it('re-lists a command whose text changed after approval', () => {
    const approvals: ApprovalsFile = { v: 1, approved: commands.map((command) => ({ hash: command.hash, stepId: command.stepId, approvedAt: '2026-09-23T10:00:00.000Z' })) };
    const edited = { ...plan, steps: plan.steps.map((step) => step.id === 3 ? { ...step, validationCommand: 'npm run lint -- --fix' } : step) };
    expect(unapprovedCommands(listValidationCommands(edited, hasher), approvals)).toEqual([{ stepId: 3, command: 'npm run lint -- --fix', hash: approvalHash({ taskId: 'task', stepId: 3, command: 'npm run lint -- --fix' }, hasher) }]);
  });
});
