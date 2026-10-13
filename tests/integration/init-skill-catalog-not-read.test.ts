import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildAssistantContext } from '../../src/cli/assistant/assistant-context.js';
import { loadInitConfigState } from '../../src/cli/init-config-state.js';
import { removeProject } from '../helpers/delegated-world.js';
import { createLightProject, PLAIN_INIT, runCli } from '../helpers/light-world.js';

const created = vi.hoisted(() => ({ count: 0 }));

vi.mock('../../src/infrastructure/skills/skill-catalog.js', () => ({
  createSkillCatalogReader: (): never => {
    created.count += 1;
    throw new Error('the skill catalog must not be created without the wizard');
  },
}));

let root: string;
beforeEach(async () => {
  created.count = 0;
  root = await createLightProject('cb-init-no-catalog-');
});
afterEach(async () => {
  await removeProject(root);
});

describe('init does not scan skill folders without the wizard (prd-20 FR-07, TC-07)', () => {
  it.each([
    [[...PLAIN_INIT]],
    [[...PLAIN_INIT, '--snapshot-command', 'sdd-snapshot', '--resume-command', 'sdd-orchestrate-flow']],
    [['init', '--dry-run', '--json']],
  ])('%j', async (argv) => {
    const run = await runCli(root, argv);
    expect(run.code).toBe(0);
    expect(created.count).toBe(0);
  });
});

describe('the tripwire is connected to the wizard (prd-20 FR-07, TC-07)', () => {
  it('creates the catalog reader when the wizard context is built', async () => {
    const state = await loadInitConfigState(root, { include: [], exclude: [] });
    await expect(buildAssistantContext({ projectRoot: root }, state)).rejects.toThrow('must not be created');
    expect(created.count).toBe(1);
  });
});
