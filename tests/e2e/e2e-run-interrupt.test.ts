import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { assertCheckpointMatchesPlan, parseStateCheckpoint } from '../../src/core/validation/checkpoint-validator.js';
import { parseTaskPlan } from '../../src/core/validation/plan-validator.js';
import { prepareAcceptanceProject, readJournal, readRunRecord, readStateBytes, runAcceptance, workSteps } from '../helpers/run-acceptance.js';
import { createRunProject, readPlanStatuses, removeRunProject, runEnvironment, useScenario, type RunProject } from '../helpers/run-project.js';

const HARNESS = ['--harness', 'claude-code'];
const WINDOWS_SIGINT_REASON = 'Windows cannot deliver SIGINT to another process; tests/unit/shutdown.test.ts and tests/integration/run-command-interrupt.test.ts cover the controller (TechSpec "Platforms").';
const PID_WAIT_ATTEMPTS = 200;
const PID_WAIT_MILLISECONDS = 100;
const SIGINT_EXIT_CODE = 130;

let world: RunProject;
beforeEach(async () => { world = await createRunProject('cb-e2e-run-interrupt-'); });
afterEach(async () => { await removeRunProject(world); });

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error: unknown) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

async function waitForFile(path: string): Promise<void> {
  for (let attempt = 0; attempt < PID_WAIT_ATTEMPTS && !existsSync(path); attempt += 1) await delay(PID_WAIT_MILLISECONDS);
}

async function interruptDuringSecondSession(pidFile: string): Promise<number | null> {
  const child = spawn(process.execPath, [resolve('dist/src/cli/main.js'), 'run', ...HARNESS, '--approve-commands'], { cwd: world.project, env: { ...process.env, ...(await runEnvironment(world)) }, stdio: 'ignore' });
  const closed = new Promise<number | null>((resolveClose) => { child.on('close', (code) => resolveClose(code)); });
  await waitForFile(pidFile);
  child.kill('SIGINT');
  return closed;
}

async function expectValidState(): Promise<void> {
  const state = await readStateBytes(world);
  assertCheckpointMatchesPlan(parseStateCheckpoint(JSON.parse(state.checkpoint)), parseTaskPlan(JSON.parse(state.plan)));
}

describe('E2E run: Ctrl+C then resume (TC-22, CA-09, RF12, RF13)', () => {
  it.skipIf(process.platform === 'win32')(`exits 130 with no harness process left, then resumes at the pending step (${WINDOWS_SIGINT_REASON})`, async () => {
    const pidFile = join(world.root, 'pids.json');
    await prepareAcceptanceProject(world, { harness: 'claude-code', steps: workSteps(3) });
    await useScenario(world, { work: true, checkpoint: true, sessions: [{}, { work: false, hang: { pidFile } }] });
    expect(await interruptDuringSecondSession(pidFile)).toBe(SIGINT_EXIT_CODE);
    const { pids } = JSON.parse(await readFile(pidFile, 'utf8')) as { pids: number[] };
    expect(pids.filter(isAlive)).toEqual([]);
    await expectValidState();
    expect(await readPlanStatuses(world)).toEqual(['COMPLETED', 'IN_PROGRESS', 'PENDING']);
    await useScenario(world, { work: true, checkpoint: true });
    const resumed = await runAcceptance(world, HARNESS);
    expect(resumed.code).toBe(0);
    expect((await readJournal(world)).at(-2)?.stepId).toBe(2);
  });
});

describe('E2E run: resume after a stop (CA-09, RF13, DEC-12)', () => {
  it('starts the next run at the pending step with fresh limits and links the previous run', async () => {
    await prepareAcceptanceProject(world, { harness: 'claude-code', steps: workSteps(3) });
    await useScenario(world, { work: true, checkpoint: true });
    const first = await runAcceptance(world, [...HARNESS, '--max-sessions', '1']);
    expect(first.code).toBe(3);
    await expectValidState();
    await useScenario(world, { work: true, checkpoint: true });
    const second = await runAcceptance(world, [...HARNESS, '--max-sessions', '2']);
    expect(second.code).toBe(0);
    expect(second.summary.sessions.map((line) => line.stepId)).toEqual([2, 3]);
    expect(await readRunRecord(world, second.summary.runId ?? '')).toMatchObject({ resumedFrom: first.summary.runId });
  });
});
