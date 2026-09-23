import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runPlanStatus } from '../../src/cli/commands/plan.js';
import { planStatusReportSchema } from '../../src/core/contracts/diagnostics.js';

const samplePlan = {
  schemaVersion: 1, taskId: 'auth-flow', title: 'Auth Flow', currentStepId: 'step-3',
  steps: [
    { id: 'step-1', title: 'Init', status: 'COMPLETED' },
    { id: 'step-2', title: 'DB', status: 'COMPLETED' },
    { id: 'step-3', title: 'API', status: 'IN_PROGRESS' },
    { id: 'step-4', title: 'UI', status: 'PENDING' },
    { id: 'step-5', title: 'Deploy', status: 'PENDING' },
  ],
};
const sampleCheckpoint = {
  schemaVersion: 1, taskId: 'auth-flow', activeStepId: 'step-3',
  gitState: { branch: 'main', lastCommitHash: 'c0ffee1', cleanWorkingTree: true },
  workingMemory: { discoveredConstraints: ['c1'], decisionsMade: ['d1', 'd2'], blockedItems: [], breakingChanges: [] },
  modifiedFiles: [], timestamp: '2026-09-21T16:00:00.000Z',
};
const singleStepPlan = {
  schemaVersion: 1, taskId: 'auth-flow', title: 'Auth Flow', currentStepId: 'step-1',
  steps: [{ id: 'step-1', title: 'Init', status: 'IN_PROGRESS' }],
};

describe('plan status in process: basic and text (RF19)', () => {
  let tempDir: string;
  let stdoutChunks: string[];

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'cb-plan-status-'));
    stdoutChunks = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => { stdoutChunks.push(String(chunk)); return true; });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  it('explains when no plan exists and exits with healthy code 0', async () => {
    const code = await runPlanStatus({ command: 'plan', subcommand: 'status', json: false }, { projectRoot: tempDir });
    expect(code).toBe(0);
    expect(stdoutChunks.join('')).toContain('No plan exists at task_plan.json');
  });

  it('prints status with text labels when plan has 5 steps and 2 completed', async () => {
    await writeFile(join(tempDir, 'task_plan.json'), JSON.stringify(samplePlan), 'utf8');
    await writeFile(join(tempDir, 'state_checkpoint.json'), JSON.stringify(sampleCheckpoint), 'utf8');
    const code = await runPlanStatus({ command: 'plan', subcommand: 'status', json: false }, { projectRoot: tempDir });
    expect(code).toBe(0);
    const out = stdoutChunks.join('');
    expect(out).toContain('[OK] Task: Auth Flow');
    expect(out).toContain('[COMPLETED]');
    expect(out).toContain('[IN_PROGRESS]');
    expect(out).toContain('[PENDING]');
  });
});

describe('plan status in process: json and errors (RF20)', () => {
  let tempDir: string;
  let stdoutChunks: string[];
  let stderrChunks: string[];

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'cb-plan-status-err-'));
    stdoutChunks = [];
    stderrChunks = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((c) => { stdoutChunks.push(String(c)); return true; });
    vi.spyOn(process.stderr, 'write').mockImplementation((c) => { stderrChunks.push(String(c)); return true; });
  });

  afterEach(async () => { vi.restoreAllMocks(); await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });


  it('emits schema-valid JSON output when asked with --json flag', async () => {
    await writeFile(join(tempDir, 'task_plan.json'), JSON.stringify(singleStepPlan), 'utf8');
    const code = await runPlanStatus({ command: 'plan', subcommand: 'status', json: true }, { projectRoot: tempDir });
    expect(code).toBe(0);
    const parsed = JSON.parse(stdoutChunks.join(''));
    expect(planStatusReportSchema.safeParse(parsed).success).toBe(true);
    expect(parsed.plan?.steps).toHaveLength(1);
    expect(parsed.files.plan.valid).toBe(true);
  });

  it('exits with error code 2 when plan contains invalid JSON', async () => {
    await writeFile(join(tempDir, 'task_plan.json'), '{invalid json', 'utf8');
    const code = await runPlanStatus({ command: 'plan', subcommand: 'status', json: false }, { projectRoot: tempDir });
    expect(code).toBe(2);
    expect(stderrChunks.join('')).toContain('INVALID_STATE_FILE');
  });
});


