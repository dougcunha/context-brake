import { lstat, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { configurationSchema } from '../../src/core/contracts/configuration.js';
import { installReportSchema } from '../../src/core/contracts/diagnostics.js';
import { DEBUG_MODE_LINE } from '../../src/core/services/instruction-markers.js';
import { readConfig, readProjectFile, removeProject } from '../helpers/delegated-world.js';
import { attemptLink, requireLink } from '../helpers/link-capability.js';
import { changedPaths, createLightProject, FULL_INIT, LIGHT_INIT, runCli, snapshotTree, USER_AGENTS } from '../helpers/light-world.js';

const DEBUG_INIT = [...FULL_INIT, '--debug'] as const;
const CRLF_CLAUDE = '# Project rules\r\n\r\nKeep this line.\r\n';
const USAGE_EXIT = 64;
type ConflictCase = { readonly name: string; readonly setup: readonly (readonly string[])[]; readonly argv: readonly string[]; readonly message: string };
let root: string;
beforeEach(async () => { root = await createLightProject('cb-init-debug-'); await writeFile(join(root, 'CLAUDE.md'), CRLF_CLAUDE, 'utf8'); });
afterEach(async () => { await removeProject(root); });

describe('init --debug lifecycle (TC-06, FR-01, FR-02, FR-04, NFR-02)', () => {
  it('adds the debug line with each file line ending and keeps user content', async () => {
    expect((await runCli(root, [...DEBUG_INIT])).code).toBe(0);
    const claude = await readProjectFile(root, 'CLAUDE.md');
    const agents = await readProjectFile(root, 'AGENTS.md');
    expect(claude.startsWith(CRLF_CLAUDE)).toBe(true);
    expect(claude).toContain(`\r\n${DEBUG_MODE_LINE}\r\n`);
    expect(agents.startsWith(USER_AGENTS)).toBe(true);
    expect(agents).toContain(`\n${DEBUG_MODE_LINE}\n`);
    expect(configurationSchema.parse(await readConfig(root)).debug).toBe(true);
  });
  it('keeps the debug mode on a later init and changes nothing', async () => {
    await runCli(root, [...DEBUG_INIT]);
    const before = await snapshotTree(root);
    expect((await runCli(root, [...FULL_INIT])).code).toBe(0);
    expect(changedPaths(before, await snapshotTree(root))).toEqual([]);
  });
  it('restores the install without debug byte for byte with --no-debug', async () => {
    await runCli(root, [...FULL_INIT]);
    const plain = await snapshotTree(root);
    await runCli(root, [...DEBUG_INIT]);
    expect((await runCli(root, [...FULL_INIT, '--no-debug'])).code).toBe(0);
    expect(changedPaths(plain, await snapshotTree(root))).toEqual([]);
    expect('debug' in (await readConfig(root))).toBe(false);
  });
});

describe('init --debug through a symlink (TC-06, FR-02, NFR-02)', () => {
  it('writes the debug line through a symlinked instruction file and keeps the link', async (ctx) => {
    const target = join(root, 'shared-agents.md');
    const link = join(root, 'AGENTS.md');
    await writeFile(target, USER_AGENTS, 'utf8');
    await rm(link, { force: true });
    await requireLink(ctx, await attemptLink(target, link, 'file'), link);
    await runCli(root, [...DEBUG_INIT]);
    expect((await lstat(link)).isSymbolicLink()).toBe(true);
    expect(await readFile(target, 'utf8')).toContain(DEBUG_MODE_LINE);
  });
});

describe('init debug conflicts (TC-02, TC-07, FR-04, FR-05, DEC-05)', () => {
  it.each<ConflictCase>([
    { name: '--debug with --no-debug', setup: [], argv: [...FULL_INIT, '--debug', '--no-debug'], message: '--debug cannot be combined with --no-debug.' },
    { name: '--light with --debug', setup: [], argv: [...LIGHT_INIT, '--debug'], message: '--debug is not available in the light mode.' },
    { name: '--debug with light mode configured', setup: [[...LIGHT_INIT]], argv: [...FULL_INIT, '--debug'], message: '--debug is not available in the light mode.' },
    { name: '--light with the debug mode on', setup: [[...DEBUG_INIT]], argv: [...LIGHT_INIT], message: 'Add --no-debug to turn it off.' },
  ])('rejects $name with a usage error and writes nothing', async ({ setup, argv, message }) => {
    for (const step of setup) await runCli(root, step);
    const before = await snapshotTree(root);
    const run = await runCli(root, argv);
    expect(run.code).toBe(USAGE_EXIT);
    expect(run.stdout + run.stderr).toContain(message);
    expect(changedPaths(before, await snapshotTree(root))).toEqual([]);
  });
  it('switches from the debug mode to light mode with --light --no-debug', async () => {
    await runCli(root, [...DEBUG_INIT]);
    expect((await runCli(root, [...LIGHT_INIT, '--no-debug'])).code).toBe(0);
    const config = await readConfig(root);
    expect(config['lightMode']).toEqual({ triggerZone: 'RED' });
    expect('debug' in config).toBe(false);
    expect(await readProjectFile(root, 'AGENTS.md')).toBe(USER_AGENTS);
  });
});

describe('init debug plan and drift (TC-08, TC-09, FR-06, DEC-06)', () => {
  it('previews the config and instruction changes with --dry-run --json', async () => {
    const run = await runCli(root, ['init', '--dry-run', '--json', '--debug']);
    const report = installReportSchema.parse(JSON.parse(run.stdout));
    const config = report.plan.changes.find((change) => change.path === 'context-brake.config.json');
    expect(config?.preview.summary).toContain('set the debug mode (agent prints context usage)');
    expect(report.plan.changes.map((change) => change.path)).toEqual(expect.arrayContaining(['AGENTS.md', 'CLAUDE.md']));
  });
  it('rewrites a block that lost the debug line on the next init', async () => {
    await runCli(root, [...DEBUG_INIT]);
    const drifted = (await readProjectFile(root, 'AGENTS.md')).replace(`${DEBUG_MODE_LINE}\n`, '');
    await writeFile(join(root, 'AGENTS.md'), drifted, 'utf8');
    await runCli(root, [...FULL_INIT]);
    expect(await readProjectFile(root, 'AGENTS.md')).toContain(`\n${DEBUG_MODE_LINE}\n`);
  });
});
