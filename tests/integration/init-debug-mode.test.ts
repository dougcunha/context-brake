import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { configurationSchema } from '../../src/core/contracts/configuration.js';
import { installReportSchema } from '../../src/core/contracts/diagnostics.js';
import { readConfig, readProjectFile, removeProject } from '../helpers/delegated-world.js';
import { changedPaths, createLightProject, PLAIN_INIT, runCli, snapshotTree, USER_AGENTS } from '../helpers/light-world.js';

const USAGE_EXIT = 64;
let root: string;
beforeEach(async () => { root = await createLightProject('cb-init-debug-'); });
afterEach(async () => { await removeProject(root); });

async function previewSummary(flag: string): Promise<{ summary: string | undefined; paths: string[] }> {
  const run = await runCli(root, ['init', '--dry-run', '--json', flag]);
  const changes = installReportSchema.parse(JSON.parse(run.stdout)).plan.changes;
  return { summary: changes.find((change) => change.path === 'context-brake.config.json')?.preview.summary, paths: changes.map((change) => change.path) };
}

describe('init --debug (FR-06, DEC-07, TC-10)', () => {
  it('records the debug mode, keeps it and the snapshot settings on a plain run, and removes it with --no-debug, never touching an instruction file', async () => {
    const before = await snapshotTree(root);
    expect((await runCli(root, [...PLAIN_INIT, '--debug', '--snapshot-trigger', 'YELLOW'])).code).toBe(0);
    expect(configurationSchema.parse(await readConfig(root)).debug).toBe(true);
    expect((await runCli(root, [...PLAIN_INIT])).code).toBe(0);
    const kept = await readConfig(root);
    expect([kept['snapshot'], kept['debug']]).toEqual([{ triggerZone: 'YELLOW' }, true]);
    expect((await runCli(root, [...PLAIN_INIT, '--no-debug'])).code).toBe(0);
    expect('debug' in (await readConfig(root))).toBe(false);
    expect(await readProjectFile(root, 'AGENTS.md')).toBe(USER_AGENTS);
    expect(changedPaths(before, await snapshotTree(root)).filter((path) => path.endsWith('.md'))).toEqual([]);
  });
});

describe('init debug arguments and plan (FR-06, TC-10, codereview_01/CR-01)', () => {
  it('rejects --debug with --no-debug and writes nothing', async () => {
    const before = await snapshotTree(root);
    const run = await runCli(root, [...PLAIN_INIT, '--debug', '--no-debug']);
    expect(run.code).toBe(USAGE_EXIT);
    expect(run.stdout + run.stderr).toContain('--debug cannot be combined with --no-debug.');
    expect(changedPaths(before, await snapshotTree(root))).toEqual([]);
  });
  it('previews setting and removing the debug mode only in the configuration and writes nothing', async () => {
    const enable = await previewSummary('--debug');
    expect(enable.summary).toContain('set the debug mode (agent prints context usage)');
    expect(enable.paths.filter((path) => path.endsWith('.md'))).toEqual([]);
    await runCli(root, [...PLAIN_INIT, '--debug']);
    const before = await snapshotTree(root);
    const disable = await previewSummary('--no-debug');
    expect(disable.summary).toContain('remove the debug mode');
    expect(disable.paths.filter((path) => path.endsWith('.md'))).toEqual([]);
    expect(changedPaths(before, await snapshotTree(root))).toEqual([]);
  });
});
