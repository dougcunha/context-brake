import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import process from 'node:process';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runExitCode } from '../../src/cli/commands/run.js';
import { runSummarySchema } from '../../src/core/contracts/run-summary.js';
import { CHECKPOINT_FILE, createRunProject, PASSING_COMMAND, PLAN_FILE, readPlanStatuses, removeRunProject, writePlan, type RunProject } from '../helpers/run-project.js';
import { dispatchRun, restoreRunEnvironment, useRunEnvironment } from '../helpers/run-command-world.js';
import { sessionLineAt } from '../helpers/run-records.js';

let world: RunProject;
beforeEach(async () => {
  world = await createRunProject('cb-t08-run-');
  await writePlan(world, [{ title: 'First', validationCommand: PASSING_COMMAND }, { title: 'Second', validationCommand: PASSING_COMMAND }]);
  await useRunEnvironment(world);
});
afterEach(async () => {
  restoreRunEnvironment();
  await removeRunProject(world);
});

describe('run command composition (CMP-19, CMP-21, DEC-15)', () => {
  it('completes the plan through the composed ports and prints the JSON summary', async () => {
    const { code, output } = await dispatchRun(world, ['--approve-commands', '--json']);
    expect(code).toBe(0);
    expect(runSummarySchema.parse(JSON.parse(output.stdout.join('')))).toMatchObject({ stopReason: 'completed', sessionCount: 2 });
    expect(await readPlanStatuses(world)).toEqual(['COMPLETED', 'COMPLETED']);
  });

  it('stops after the first validated step when --approve-steps has no terminal (DEC-17)', async () => {
    const { code, output } = await dispatchRun(world, ['--approve-commands', '--approve-steps']);
    expect(code).toBe(4);
    expect(output.stderr.join('')).toContain("[STOP] Step 1 'First' passed validation. --approve-steps needs a terminal");
    expect(output.stdout.join('')).toContain('[STOP] ContextBrake run: stopped (step_not_approved)');
    expect(await readPlanStatuses(world)).toEqual(['COMPLETED', 'IN_PROGRESS']);
  });
});

describe('run command preflight errors (DEC-13, DEC-21, DEC-16)', () => {
  it('refuses a live lock with RUN_IN_PROGRESS and exit 2', async () => {
    const runner = join(world.project, '.context-brake', 'runtime', 'runner');
    await mkdir(runner, { recursive: true });
    await writeFile(join(runner, 'run.lock'), JSON.stringify({ pid: process.pid, runId: 'run-other' }), 'utf8');
    const { code, output } = await dispatchRun(world, ['--approve-commands']);
    expect(code).toBe(2);
    expect(output.stderr.join('')).toContain(`[ERROR] RUN_IN_PROGRESS: Another context-brake run (pid ${process.pid}, run run-other) is in progress`);
  });

  it('refuses an invalid checkpoint with INVALID_STATE_FILE and the PRD-03 rule', async () => {
    await writeFile(join(world.project, CHECKPOINT_FILE), '{"schemaVersion":1}', 'utf8');
    const { code, output } = await dispatchRun(world, ['--json']);
    expect(code).toBe(2);
    expect(JSON.parse(output.stdout.join(''))).toMatchObject({ command: 'run', error: { code: 'INVALID_STATE_FILE' } });
    expect(output.stdout.join('')).toContain('State file state_checkpoint.json is invalid');
  });

  it('refuses a missing plan with RUN_PLAN_NOT_RUNNABLE', async () => {
    await rm(join(world.project, PLAN_FILE));
    const { code, output } = await dispatchRun(world, []);
    expect(code).toBe(2);
    expect(output.stderr.join('')).toContain('[ERROR] RUN_PLAN_NOT_RUNNABLE: No plan exists at task_plan.json.');
  });

  it('rejects inconsistent limits with INVALID_ARGUMENTS and exit 64', async () => {
    const { code, output } = await dispatchRun(world, ['--max-minutes', '5']);
    expect(code).toBe(64);
    expect(output.stderr.join('')).toContain('[ERROR] INVALID_ARGUMENTS: The run limits are inconsistent');
  });
});

describe('run exit codes (DEC-16)', () => {
  it.each([
    ['completed', 0, 0], ['limit_reached', 1, 3], ['interrupted', 1, 130], ['confirmation_required', 0, 2],
    ['confirmation_required', 1, 4], ['repeated_failure', 2, 4], ['no_checkpoint', 1, 4], ['harness_error', 1, 4], ['step_not_approved', 1, 4],
  ] as const)('maps %s after %d sessions to %d', (stopReason, sessions, code) => {
    expect(runExitCode({ stopReason, sessions: Array.from({ length: sessions }, (_, index) => sessionLineAt(index + 1)) })).toBe(code);
  });
});
