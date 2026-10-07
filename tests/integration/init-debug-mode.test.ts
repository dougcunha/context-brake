import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { configurationSchema } from '../../src/core/contracts/configuration.js';
import { installReportSchema } from '../../src/core/contracts/diagnostics.js';
import { readConfig, readProjectFile, removeProject } from '../helpers/delegated-world.js';
import { changedPaths, createLightProject, LIGHT_INIT, PLAIN_INIT, runCli, snapshotTree, USER_AGENTS } from '../helpers/light-world.js';

const DEBUG_INIT = [...LIGHT_INIT, '--debug'] as const;
const USAGE_EXIT = 64;
let root: string;
beforeEach(async () => { root = await createLightProject('cb-init-debug-'); });
afterEach(async () => { await removeProject(root); });

describe('init --debug (FR-06, DEC-07, TC-10)', () => {
  it('succeeds, leaves every instruction file untouched, and records the debug mode', async () => {
    const before = await snapshotTree(root);
    expect((await runCli(root, [...LIGHT_INIT, '--debug'])).code).toBe(0);
    expect(await readProjectFile(root, 'AGENTS.md')).toBe(USER_AGENTS);
    expect(configurationSchema.parse(await readConfig(root)).debug).toBe(true);
    expect(changedPaths(before, await snapshotTree(root)).filter((path) => path.endsWith('.md'))).toEqual([]);
  });
  it('keeps the snapshot settings and the debug mode already on', async () => {
    await runCli(root, [...DEBUG_INIT, '--snapshot-trigger', 'YELLOW']);
    expect((await runCli(root, [...LIGHT_INIT])).code).toBe(0);
    const config = await readConfig(root);
    expect(config['snapshot']).toEqual({ triggerZone: 'YELLOW' });
    expect(config['debug']).toBe(true);
    expect(await readProjectFile(root, 'AGENTS.md')).toBe(USER_AGENTS);
  });
  it('turns the debug mode off with --no-debug', async () => {
    await runCli(root, [...LIGHT_INIT, '--debug']);
    expect((await runCli(root, [...PLAIN_INIT, '--no-debug'])).code).toBe(0);
    expect('debug' in (await readConfig(root))).toBe(false);
  });
});

describe('init debug arguments and plan (FR-06, TC-10)', () => {
  it('rejects --debug with --no-debug and writes nothing', async () => {
    const before = await snapshotTree(root);
    const run = await runCli(root, [...LIGHT_INIT, '--debug', '--no-debug']);
    expect(run.code).toBe(USAGE_EXIT);
    expect(run.stdout + run.stderr).toContain('--debug cannot be combined with --no-debug.');
    expect(changedPaths(before, await snapshotTree(root))).toEqual([]);
  });
  it('previews the configuration change and no instruction change', async () => {
    const run = await runCli(root, ['init', '--dry-run', '--json', '--debug']);
    const report = installReportSchema.parse(JSON.parse(run.stdout));
    const config = report.plan.changes.find((change) => change.path === 'context-brake.config.json');
    expect(config?.preview.summary).toContain('set the debug mode (agent prints context usage)');
    expect(report.plan.changes.map((change) => change.path).filter((path) => path.endsWith('.md'))).toEqual([]);
  });
});
