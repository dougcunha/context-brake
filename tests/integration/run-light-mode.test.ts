import { rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import { createRunProject, PASSING_COMMAND, PLAN_FILE, removeRunProject, writePlan, type RunProject } from '../helpers/run-project.js';
import { dispatchRun, restoreRunEnvironment, useRunEnvironment } from '../helpers/run-command-world.js';

const REFUSAL = '[ERROR] RUN_PLAN_NOT_RUNNABLE: context-brake run needs the full mode, but this repository uses the light mode. Run context-brake init --no-light, then create a plan with context-brake plan init --task="<name>", then rerun context-brake run.';
let world: RunProject;
beforeEach(async () => {
  world = await createRunProject('cb-light-run-');
  await writePlan(world, [{ title: 'Only', validationCommand: PASSING_COMMAND }]);
  await writeFile(join(world.project, 'context-brake.config.json'), JSON.stringify({ ...DEFAULT_CONFIG, lightMode: { triggerZone: 'RED' } }), 'utf8');
  await useRunEnvironment(world);
});
afterEach(async () => {
  restoreRunEnvironment();
  await removeRunProject(world);
});

describe('run refuses light mode (TC-11, FR-13, DEC-11)', () => {
  it('refuses with a runnable plan present', async () => {
    const { code, output } = await dispatchRun(world, []);
    expect(code).toBe(2);
    expect(output.stderr.join('')).toContain(REFUSAL);
  });
  it('refuses without a plan', async () => {
    await rm(join(world.project, PLAN_FILE));
    const { code, output } = await dispatchRun(world, []);
    expect(code).toBe(2);
    expect(output.stderr.join('')).toContain(REFUSAL);
  });
});
