import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PROTOCOL_PATH, readConfig, readProjectFile, removeProject, USER_CLAUDE } from '../helpers/delegated-world.js';
import { changedPaths, createLightProject, jsonReport, PLAIN_INIT, runCli, snapshotTree, USER_AGENTS } from '../helpers/light-world.js';

const OWNED_PATHS = ['.claude/hooks/context-brake-statusline.mjs', '.claude/hooks/context-brake.mjs', '.claude/settings.json', '.claude/settings.local.json', '.context-brake/manifest.json', '.context-brake/runtime/claude-statusline.json', 'context-brake.config.json'];
let root: string;
beforeEach(async () => { root = await createLightProject('cb-init-snapshot-'); });
afterEach(async () => { await removeProject(root); });

describe('init on a fresh repository (prd-12 FR-04, FR-08)', () => {
  it('writes only the config, manifest, hook asset, bridge state, and hook entries', async () => {
    const before = await snapshotTree(root);
    expect((await runCli(root, [...PLAIN_INIT])).code).toBe(0);
    const after = await snapshotTree(root);
    expect(changedPaths(before, after)).toEqual(OWNED_PATHS);
    expect([after['CLAUDE.md'], after['AGENTS.md']]).toEqual([USER_CLAUDE, USER_AGENTS]);
    expect([after[PROTOCOL_PATH], after['.gitignore']]).toEqual([undefined, undefined]);
    expect((await readConfig(root))['snapshot']).toEqual({ triggerZone: 'RED' });
  });
  it('previews the same paths with --dry-run', async () => {
    const run = await runCli(root, ['init', '--dry-run', '--json']);
    expect(run.code).toBe(0);
    expect(jsonReport(run).plan.changes.map((change) => change.path).sort()).toEqual(OWNED_PATHS);
  });
  it('changes nothing on a second run', async () => {
    await runCli(root, [...PLAIN_INIT]);
    const before = await snapshotTree(root);
    expect((await runCli(root, [...PLAIN_INIT])).code).toBe(0);
    expect(changedPaths(before, await snapshotTree(root))).toEqual([]);
  });
});

describe('snapshot flags (prd-12 FR-04, TC-05)', () => {
  it('writes the snapshot and resume commands', async () => {
    expect((await runCli(root, [...PLAIN_INIT, '--snapshot-command', '/sdd-snapshot', '--resume-command', '/sdd-resume'])).code).toBe(0);
    expect((await readConfig(root))['snapshot']).toEqual({ triggerZone: 'RED', command: '/sdd-snapshot', resumeCommand: '/sdd-resume' });
  });
  it('sets the trigger zone alone, without a command', async () => {
    expect((await runCli(root, [...PLAIN_INIT, '--snapshot-trigger', 'YELLOW'])).code).toBe(0);
    expect((await readConfig(root))['snapshot']).toEqual({ triggerZone: 'YELLOW' });
  });
  it('clears both commands and keeps the trigger zone with --no-snapshot-command', async () => {
    await runCli(root, [...PLAIN_INIT, '--snapshot-command', '/sdd-snapshot', '--resume-command', '/sdd-resume', '--snapshot-trigger', 'YELLOW']);
    expect((await runCli(root, [...PLAIN_INIT, '--no-snapshot-command'])).code).toBe(0);
    expect((await readConfig(root))['snapshot']).toEqual({ triggerZone: 'YELLOW' });
  });
  it.each([['--snapshot-command', '/x'], ['--resume-command', '/y']])('rejects --no-snapshot-command together with %s and writes nothing', async (...flag) => {
    const before = await snapshotTree(root);
    const run = await runCli(root, [...PLAIN_INIT, '--no-snapshot-command', ...flag]);
    expect(run.code).toBe(64);
    expect(run.stdout + run.stderr).toContain('--no-snapshot-command cannot be combined');
    expect(changedPaths(before, await snapshotTree(root))).toEqual([]);
  });
  it('rejects a resume command without a snapshot command and names the key', async () => {
    const run = await runCli(root, [...PLAIN_INIT, '--resume-command', '/resume']);
    expect(run.code).toBe(64);
    expect(run.stdout + run.stderr).toContain('snapshot.resumeCommand requires snapshot.command');
  });
});

describe('the status line bridge (FR-09, TC-13)', () => {
  it('installs the bridge by default', async () => {
    await runCli(root, [...PLAIN_INIT]);
    const local = JSON.parse(await readProjectFile(root, '.claude/settings.local.json')) as { statusLine: { command: string } };
    expect(local.statusLine.command).toBe(`node "${root.replace(/\\/g, '/')}/.claude/hooks/context-brake-statusline.mjs"`);
  });
  it('restores the previous status line with --no-statusline-bridge', async () => {
    await runCli(root, [...PLAIN_INIT]);
    expect((await runCli(root, [...PLAIN_INIT, '--no-statusline-bridge'])).code).toBe(0);
    const after = await snapshotTree(root);
    expect(after['.claude/settings.local.json']).toBeUndefined();
    expect(after['.context-brake/runtime/claude-statusline-opt-out.json']).toContain('"optedOut": true');
  });
});

describe('init next-step hint (codereview_01 CR-02, FR-01)', () => {
  it('does not suggest creating a plan', async () => {
    const run = await runCli(root, ['init', '--yes']);
    expect(run.code).toBe(0);
    expect(run.stdout + run.stderr).not.toContain('plan init');
  });
  it('says in the text output that only zone headers will be injected (prd-12 User experience)', async () => {
    const run = await runCli(root, ['init', '--yes']);
    expect(run.code).toBe(0);
    expect(run.stdout).toContain('no snapshot command, so only zone headers will be injected (trigger: RED)');
  });
});
