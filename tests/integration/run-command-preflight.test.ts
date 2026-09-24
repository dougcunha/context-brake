import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRunProject, PASSING_COMMAND, readFakeRecord, removeRunProject, writePlan, type RunProject } from '../helpers/run-project.js';
import { dispatchRun, restoreRunEnvironment, runArgs, useRunEnvironment } from '../helpers/run-command-world.js';
import { dispatchCommand } from '../../src/cli/composition-root.js';
import { captureOutput } from '../helpers/wrap-world.js';

let world: RunProject;
beforeEach(async () => {
  world = await createRunProject('cb-t08-preflight-');
  await writePlan(world, [{ title: 'Only', validationCommand: PASSING_COMMAND }]);
});
afterEach(async () => {
  restoreRunEnvironment();
  await removeRunProject(world);
});

describe('run command harness preflight (DEC-02, DEC-21, CMP-21)', () => {
  it('refuses an unsupported harness before looking for executables', async () => {
    await useRunEnvironment(world);
    const output = captureOutput();
    const code = await dispatchCommand({ ...runArgs([]), harness: 'opencode' }, { projectRoot: world.project });
    expect(code).toBe(2);
    expect(output.stderr.join('')).toContain('[ERROR] RUN_HARNESS_UNSUPPORTED: context-brake run does not support opencode: OpenCode documents');
  });

  it('refuses a harness whose executable is not on PATH', async () => {
    await useRunEnvironment(world, false);
    const { code, output } = await dispatchRun(world, []);
    expect(code).toBe(2);
    expect(output.stderr.join('')).toContain('[ERROR] RUN_HARNESS_MISSING: The claude-code executable (claude) was not found on PATH.');
  });
});

describe('run command plan preflight (DEC-21)', () => {
  beforeEach(async () => { await useRunEnvironment(world); });

  it('lists the open steps that lack a validation command', async () => {
    await writePlan(world, [{ title: 'A', validationCommand: null }, { title: 'B', validationCommand: ' ' }]);
    const { code, output } = await dispatchRun(world, ['--approve-commands']);
    expect(code).toBe(2);
    expect(output.stderr.join('')).toContain('[ERROR] RUN_PLAN_NOT_RUNNABLE: Steps 1, 2 in task_plan.json have no validationCommand.');
  });

  it('exits 0 with a zero-session summary when the plan is complete', async () => {
    await writePlan(world, [{ title: 'Done', validationCommand: PASSING_COMMAND, status: 'COMPLETED' }]);
    const { code, output } = await dispatchRun(world, ['--json']);
    expect(code).toBe(0);
    expect(JSON.parse(output.stdout.join(''))).toMatchObject({ runId: null, status: 'completed', sessionCount: 0, stepsCompleted: 1, stepsTotal: 1 });
    expect(await readFakeRecord(world)).toBeNull();
  });
});
