import { lstat, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { configurationSchema } from '../../src/core/contracts/configuration.js';
import { installReportSchema } from '../../src/core/contracts/diagnostics.js';
import { readConfig, readProjectFile, removeProject } from '../helpers/delegated-world.js';
import { attemptLink, requireLink } from '../helpers/link-capability.js';
import { changedPaths, createLightProject, FULL_INIT, LEGACY_DEBUG_MODE_LINE, LIGHT_INIT, PLAIN_INIT, runCli, snapshotTree, USER_AGENTS } from '../helpers/light-world.js';

const DEBUG_INIT = [...FULL_INIT, '--debug'] as const;
const USAGE_EXIT = 64;
let root: string;
beforeEach(async () => { root = await createLightProject('cb-init-debug-'); });
afterEach(async () => { await removeProject(root); });

describe('init --debug in light mode (FR-06, DEC-07, TC-10)', () => {
  it('succeeds, leaves every instruction file untouched, and records the debug mode', async () => {
    const before = await snapshotTree(root);
    expect((await runCli(root, [...LIGHT_INIT, '--debug'])).code).toBe(0);
    expect(await readProjectFile(root, 'AGENTS.md')).toBe(USER_AGENTS);
    expect(configurationSchema.parse(await readConfig(root)).debug).toBe(true);
    expect(changedPaths(before, await snapshotTree(root)).filter((path) => path.endsWith('.md'))).toEqual([]);
  });
  it('keeps both choices with --light and the debug mode already on', async () => {
    await runCli(root, [...DEBUG_INIT]);
    expect((await runCli(root, [...LIGHT_INIT])).code).toBe(0);
    const config = await readConfig(root);
    expect(config['lightMode']).toEqual({ triggerZone: 'RED' });
    expect(config['debug']).toBe(true);
    expect(await readProjectFile(root, 'AGENTS.md')).toBe(USER_AGENTS);
  });
  it('turns the debug mode off with --no-debug in light mode', async () => {
    await runCli(root, [...LIGHT_INIT, '--debug']);
    expect((await runCli(root, [...PLAIN_INIT, '--no-debug'])).code).toBe(0);
    expect('debug' in (await readConfig(root))).toBe(false);
  });
});

describe('init --debug in full mode (FR-06, TC-10)', () => {
  it('records the debug mode without writing any debug line into an instruction file', async () => {
    expect((await runCli(root, [...DEBUG_INIT])).code).toBe(0);
    const agents = await readProjectFile(root, 'AGENTS.md');
    expect(agents).toContain('<!-- CONTEXTBRAKE:START -->');
    expect(agents).not.toContain('Debug mode');
    expect(configurationSchema.parse(await readConfig(root)).debug).toBe(true);
  });
  it('drops the debug line an older version left behind and keeps the debug mode on', async () => {
    await runCli(root, [...FULL_INIT]);
    const drifted = (await readProjectFile(root, 'AGENTS.md')).replace('<!-- CONTEXTBRAKE:END -->', `${LEGACY_DEBUG_MODE_LINE}\n<!-- CONTEXTBRAKE:END -->`);
    await writeFile(join(root, 'AGENTS.md'), drifted, 'utf8');
    expect((await runCli(root, [...DEBUG_INIT])).code).toBe(0);
    const agents = await readProjectFile(root, 'AGENTS.md');
    expect(agents).not.toContain(LEGACY_DEBUG_MODE_LINE);
    expect(agents).toContain('<!-- CONTEXTBRAKE:END -->');
    expect(configurationSchema.parse(await readConfig(root)).debug).toBe(true);
  });
  it('writes the reference block through a symlinked instruction file and keeps the link', async (ctx) => {
    const target = join(root, 'shared-agents.md');
    const link = join(root, 'AGENTS.md');
    await writeFile(target, USER_AGENTS, 'utf8');
    await rm(link, { force: true });
    await requireLink(ctx, await attemptLink(target, link, 'file'), link);
    await runCli(root, [...DEBUG_INIT]);
    expect((await lstat(link)).isSymbolicLink()).toBe(true);
    expect(await readFile(target, 'utf8')).toContain('<!-- CONTEXTBRAKE:START -->');
  });
});

describe('init debug arguments and plan (FR-06, TC-10)', () => {
  it('rejects --debug with --no-debug and writes nothing', async () => {
    const before = await snapshotTree(root);
    const run = await runCli(root, [...FULL_INIT, '--debug', '--no-debug']);
    expect(run.code).toBe(USAGE_EXIT);
    expect(run.stdout + run.stderr).toContain('--debug cannot be combined with --no-debug.');
    expect(changedPaths(before, await snapshotTree(root))).toEqual([]);
  });
  it('previews the configuration change and no instruction change in light mode', async () => {
    const run = await runCli(root, ['init', '--dry-run', '--json', '--debug']);
    const report = installReportSchema.parse(JSON.parse(run.stdout));
    const config = report.plan.changes.find((change) => change.path === 'context-brake.config.json');
    expect(config?.preview.summary).toContain('set the debug mode (agent prints context usage)');
    expect(report.plan.changes.map((change) => change.path).filter((path) => path.endsWith('.md'))).toEqual([]);
  });
  it('previews the instruction change in full mode', async () => {
    const run = await runCli(root, ['init', '--dry-run', '--json', '--debug', '--no-light']);
    const report = installReportSchema.parse(JSON.parse(run.stdout));
    expect(report.plan.changes.map((change) => change.path)).toEqual(expect.arrayContaining(['AGENTS.md', 'CLAUDE.md']));
  });
});
