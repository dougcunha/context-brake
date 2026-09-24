import { access, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runBuiltCli } from './cli-runner.js';
import { createRunProject, MARKER_COMMAND, MARKER_FILE, PASSING_COMMAND, readFakeRecord, removeRunProject, runEnvironment, writePlan, type RunProject } from '../helpers/run-project.js';

let world: RunProject;
beforeEach(async () => {
  world = await createRunProject('cb-e2e-run-preflight-');
  await writePlan(world, [{ title: 'Validate', validationCommand: MARKER_COMMAND }]);
});
afterEach(async () => { await removeRunProject(world); });

async function exists(path: string): Promise<boolean> {
  return access(path).then(() => true, () => false);
}

describe('E2E run: unsupported and missing harnesses (TC-19, DEC-02, DEC-16, DEC-21)', () => {
  it('refuses cursor with RUN_HARNESS_UNSUPPORTED, the reason, and exit 2', async () => {
    const result = await runBuiltCli(['run', '--harness', 'cursor'], world.project, await runEnvironment(world));
    expect(result.code).toBe(2);
    expect(result.stderr).toContain('[ERROR] RUN_HARNESS_UNSUPPORTED: context-brake run does not support cursor: Cursor documents a non-interactive mode, but not whether project hooks');
  });

  it('refuses a harness missing from PATH with RUN_HARNESS_MISSING and exit 2, also as JSON', async () => {
    const result = await runBuiltCli(['run', '--harness', 'codex-cli', '--json'], world.project, await runEnvironment(world, { withHarness: false }));
    expect(result.code).toBe(2);
    expect(JSON.parse(result.stdout)).toMatchObject({ command: 'run', exitCode: 2, error: { code: 'RUN_HARNESS_MISSING' } });
  });
});

describe('E2E run: command confirmation without a terminal (TC-19, RF14, CA-10, DEC-10)', () => {
  it('lists the commands, executes none, starts no session, and exits 2', async () => {
    const result = await runBuiltCli(['run', '--harness', 'claude-code'], world.project, await runEnvironment(world));
    expect(result.code).toBe(2);
    expect(result.stderr).toContain(`  - step 1: ${MARKER_COMMAND}`);
    expect(result.stderr).toContain('[STOP] CONFIRMATION_REQUIRED');
    expect(await exists(join(world.project, MARKER_FILE))).toBe(false);
    expect(await readFakeRecord(world)).toBeNull();
  });

  it('reports the stop as a JSON summary with the decision options', async () => {
    const result = await runBuiltCli(['run', '--harness', 'claude-code', '--json'], world.project, await runEnvironment(world));
    expect(result.code).toBe(2);
    expect(JSON.parse(result.stdout)).toMatchObject({ runId: null, stopReason: 'confirmation_required', exitCode: 2, sessionCount: 0, decision: { reason: 'confirmation_required' } });
    const runner = join(world.project, '.context-brake', 'runtime', 'runner');
    expect(await readdir(join(runner, 'runs'))).toEqual([]);
    expect(await exists(join(runner, 'run.lock'))).toBe(false);
  });
});

describe('E2E run: plans that cannot run (DEC-21)', () => {
  it('refuses an open step without a validation command with RUN_PLAN_NOT_RUNNABLE', async () => {
    await writePlan(world, [{ title: 'Done', validationCommand: null, status: 'COMPLETED' }, { title: 'Manual', validationCommand: null }]);
    const result = await runBuiltCli(['run', '--harness', 'claude-code', '--approve-commands'], world.project, await runEnvironment(world));
    expect(result.code).toBe(2);
    expect(result.stderr).toContain('[ERROR] RUN_PLAN_NOT_RUNNABLE: Steps 2 in task_plan.json have no validationCommand.');
  });

  it('exits 0 with nothing to run when every step is complete', async () => {
    await writePlan(world, [{ title: 'Done', validationCommand: PASSING_COMMAND, status: 'COMPLETED' }]);
    const result = await runBuiltCli(['run', '--harness', 'claude-code'], world.project, await runEnvironment(world));
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Nothing to run: every step is already COMPLETED.');
    expect(await readFakeRecord(world)).toBeNull();
  });
});
