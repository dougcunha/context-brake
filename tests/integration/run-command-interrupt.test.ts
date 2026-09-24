import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { signalRouter } from '../../src/cli/shutdown.js';
import { isProcessAlive } from '../../src/infrastructure/runner/node-run-lock.js';
import { createRunProject, PASSING_COMMAND, readPlanStatuses, removeRunProject, useScenario, writePlan, type RunProject } from '../helpers/run-project.js';
import { dispatchRun, restoreRunEnvironment, useRunEnvironment } from '../helpers/run-command-world.js';

const WAIT_STEP_MILLISECONDS = 50;
const WAIT_LIMIT_MILLISECONDS = 10_000;

let world: RunProject;
let pidFile: string;
beforeEach(async () => {
  world = await createRunProject('cb-t08-interrupt-');
  pidFile = join(world.root, 'harness.pids');
  await writePlan(world, [{ title: 'Hang', validationCommand: PASSING_COMMAND }]);
  await useScenario(world, { hang: { pidFile } });
  await useRunEnvironment(world);
});
afterEach(async () => {
  restoreRunEnvironment();
  await removeRunProject(world);
});

async function waitFor<T>(read: () => Promise<T | null>): Promise<T> {
  for (let waited = 0; waited < WAIT_LIMIT_MILLISECONDS; waited += WAIT_STEP_MILLISECONDS) {
    const value = await read();
    if (value !== null) return value;
    await delay(WAIT_STEP_MILLISECONDS);
  }
  return expect.unreachable('Timed out waiting for the fake harness.');
}

async function harnessPids(): Promise<number[] | null> {
  const source = await readFile(pidFile, 'utf8').catch(() => null);
  return source === null ? null : (JSON.parse(source) as { pids: number[] }).pids;
}

describe('run command interrupt (DEC-12, RF12, CA-09)', () => {
  it('delegates repeated signals once, stops the harness tree, and exits 130 with the plan intact', async () => {
    const running = dispatchRun(world, ['--approve-commands', '--json']);
    const pids = await waitFor(harnessPids);
    signalRouter.handle('SIGINT');
    signalRouter.handle('SIGINT');
    signalRouter.handle('SIGTERM');
    const { code, output } = await running;
    expect(code).toBe(130);
    expect(output.stderr.join('').match(/\[STOP\] SIG\w+ received/g)).toEqual(['[STOP] SIGINT received']);
    expect(JSON.parse(output.stdout.join(''))).toMatchObject({ status: 'interrupted', stopReason: 'interrupted', exitCode: 130, sessionCount: 1 });
    expect(await waitFor(async () => (pids.some(isProcessAlive) ? null : true))).toBe(true);
    expect(await readPlanStatuses(world)).toEqual(['PENDING']);
  });
});
