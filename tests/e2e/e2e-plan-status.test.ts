import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { planStatusReportSchema } from '../../src/core/contracts/diagnostics.js';
import { runBuiltCli } from './cli-runner.js';

const fiveStepPlan = {
  schemaVersion: 1, taskId: 'auth-flow', title: 'Auth Flow', currentStepId: 'step-3',
  steps: [
    { id: 'step-1', title: 'Setup', status: 'COMPLETED' },
    { id: 'step-2', title: 'Database', status: 'COMPLETED' },
    { id: 'step-3', title: 'Endpoints', status: 'IN_PROGRESS' },
    { id: 'step-4', title: 'UI Pages', status: 'PENDING' },
    { id: 'step-5', title: 'Deployment', status: 'PENDING' },
  ],
};

const checkpointRecord = {
  schemaVersion: 1, taskId: 'auth-flow', activeStepId: 'step-3',
  gitState: { branch: 'feat/auth', lastCommitHash: 'a1b2c3d', cleanWorkingTree: true },
  workingMemory: { discoveredConstraints: ['Token limit 2048', 'HTTPS only'], decisionsMade: ['Use JWT'], blockedItems: [], breakingChanges: [] },
  modifiedFiles: ['src/auth.ts'], timestamp: '2026-09-21T18:00:00.000Z',
};

const twoInProgressPlan = {
  schemaVersion: 1, taskId: 'bad-plan', title: 'Bad Plan', currentStepId: 1,
  steps: [{ id: 1, title: 'One', status: 'IN_PROGRESS' }, { id: 2, title: 'Two', status: 'IN_PROGRESS' }],
};

describe('E2E plan status: empty and healthy states (RF19, RF20, CA-15)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-e2e-status-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('explains when no plan exists and exits cleanly without stack trace', async () => {
    const res = await runBuiltCli(['plan', 'status'], tempDir);
    expect(res.code).toBe(0);
    expect(res.stdout).toContain('No plan exists at task_plan.json');
    expect(res.stderr).toBe('');
  });

  it('emits schema-valid JSON for 5 steps with 2 completed (CA-15)', async () => {
    await writeFile(join(tempDir, 'task_plan.json'), JSON.stringify(fiveStepPlan), 'utf8');
    await writeFile(join(tempDir, 'state_checkpoint.json'), JSON.stringify(checkpointRecord), 'utf8');
    const res = await runBuiltCli(['plan', 'status', '--json'], tempDir);
    expect(res.code).toBe(0);
    const parsed = JSON.parse(res.stdout);
    const validated = planStatusReportSchema.safeParse(parsed);
    expect(validated.success).toBe(true);
    expect(parsed.plan?.steps).toHaveLength(5);
    expect(parsed.plan?.activeStep?.id).toBe('step-3');
    expect(parsed.checkpoint?.lastCommitHash).toBe('a1b2c3d');
    expect(parsed.checkpoint?.constraintsCount).toBe(2);
    expect(parsed.checkpoint?.decisionsCount).toBe(1);
    expect(parsed.files.plan.valid).toBe(true);
    expect(parsed.files.checkpoint.valid).toBe(true);
  });
});

describe('E2E plan status: text formatting and invalid states', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-e2e-status-fmt-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('labels every status in words and includes checkpoint info and counts', async () => {
    await writeFile(join(tempDir, 'task_plan.json'), JSON.stringify(fiveStepPlan), 'utf8');
    await writeFile(join(tempDir, 'state_checkpoint.json'), JSON.stringify(checkpointRecord), 'utf8');
    const res = await runBuiltCli(['plan', 'status'], tempDir);
    expect(res.code).toBe(0);
    expect(res.stdout).toContain('[COMPLETED]');
    expect(res.stdout).toContain('[IN_PROGRESS]');
    expect(res.stdout).toContain('[PENDING]');
    expect(res.stdout).toContain('[VALID]');
    expect(res.stdout).toContain('step-3: Endpoints');
    expect(res.stdout).toContain('commit: a1b2c3d');
    expect(res.stdout).toContain('2 constraints, 1 decisions');
  });

  it('exits with error code 2 and reports file, field path, and rule when invalid', async () => {
    await writeFile(join(tempDir, 'task_plan.json'), JSON.stringify({ schemaVersion: 1, taskId: 'bad' }), 'utf8');
    const res = await runBuiltCli(['plan', 'status'], tempDir);
    expect(res.code).toBe(2);
    expect(res.stderr).toContain('task_plan.json is invalid: title');
  });
});

it('does not report an existing invalid plan as missing (CA-03)', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'cb-e2e-status-invalid-'));
  try {
    await writeFile(join(tempDir, 'task_plan.json'), JSON.stringify(twoInProgressPlan), 'utf8');
    const res = await runBuiltCli(['plan', 'status'], tempDir);
    expect(res.code).toBe(2);
    expect(res.stdout).toBe('');
    expect(res.stderr).toMatch(/INVALID_STATE_FILE:[\s\S]*steps must not contain more than one IN_PROGRESS step/);
    expect(res.stderr).not.toMatch(/No plan exists|plan init/);
  } finally {
    await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
