import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PROTOCOL_PATH, readConfig, readProjectFile, removeProject, USER_CLAUDE } from '../helpers/delegated-world.js';
import { changedPaths, createLightProject, jsonReport, LIGHT_INIT, runCli, snapshotTree, USER_AGENTS } from '../helpers/light-world.js';

const OWNED_PATHS = ['.claude/hooks/context-brake-statusline.mjs', '.claude/hooks/context-brake.mjs', '.claude/settings.json', '.claude/settings.local.json', '.context-brake/manifest.json', '.context-brake/runtime/claude-statusline.json', 'context-brake.config.json'];
let root: string;
beforeEach(async () => { root = await createLightProject('cb-init-light-'); });
afterEach(async () => { await removeProject(root); });

describe('init --light on a fresh repository (TC-08, FR-08, OBJ-01)', () => {
  it('writes only the config, manifest, hook asset, bridge state, and hook entries', async () => {
    const before = await snapshotTree(root);
    expect((await runCli(root, [...LIGHT_INIT])).code).toBe(0);
    const after = await snapshotTree(root);
    expect(changedPaths(before, after)).toEqual(OWNED_PATHS);
    expect([after['CLAUDE.md'], after['AGENTS.md']]).toEqual([USER_CLAUDE, USER_AGENTS]);
    expect(after[PROTOCOL_PATH]).toBeUndefined();
    expect(after['.gitignore']).toBeUndefined();
    expect((await readConfig(root))['lightMode']).toEqual({ triggerZone: 'RED' });
    expect(await readProjectFile(root, '.context-brake/manifest.json')).not.toContain('"kind": "protocol"');
  });
  it('previews the same paths with --dry-run', async () => {
    const run = await runCli(root, ['init', '--dry-run', '--json', '--light']);
    expect(run.code).toBe(0);
    expect(jsonReport(run).plan.changes.map((change) => change.path).sort()).toEqual(OWNED_PATHS);
  });
  it('changes nothing on a second run', async () => {
    await runCli(root, [...LIGHT_INIT]);
    const before = await snapshotTree(root);
    expect((await runCli(root, ['init', '--yes', '--json'])).code).toBe(0);
    expect(changedPaths(before, await snapshotTree(root))).toEqual([]);
  });
  it('stores a YELLOW trigger', async () => {
    await runCli(root, [...LIGHT_INIT, '--snapshot-trigger', 'YELLOW']);
    expect((await readConfig(root))['lightMode']).toEqual({ triggerZone: 'YELLOW' });
  });
});

describe('the status line bridge in light mode (FR-09, TC-13)', () => {
  it('installs the bridge by default', async () => {
    await runCli(root, [...LIGHT_INIT]);
    const local = JSON.parse(await readProjectFile(root, '.claude/settings.local.json')) as { statusLine: { command: string } };
    expect(local.statusLine.command).toBe(`node "${root.replace(/\\/g, '/')}/.claude/hooks/context-brake-statusline.mjs"`);
  });
  it('restores the previous status line with --no-statusline-bridge', async () => {
    await runCli(root, [...LIGHT_INIT]);
    expect((await runCli(root, ['init', '--yes', '--json', '--light', '--no-statusline-bridge'])).code).toBe(0);
    const after = await snapshotTree(root);
    expect(after['.claude/settings.local.json']).toBeUndefined();
    expect(after['.context-brake/runtime/claude-statusline-opt-out.json']).toContain('"optedOut": true');
  });
});

describe('init --light rejects options of the other modes (TC-08, FR-10)', () => {
  it.each(['--snapshot-command', '--resume-command'])('exits 64 for %s and writes nothing', async (option) => {
    const before = await snapshotTree(root);
    const run = await runCli(root, [...LIGHT_INIT, option, '/sdd-snapshot']);
    expect(run.code).toBe(64);
    expect(run.stdout).toContain(`${option} is not available in the light mode.`);
    expect(changedPaths(before, await snapshotTree(root))).toEqual([]);
  });
});

describe('init next-step hint (codereview_01 CR-02, FR-01, FR-07)', () => {
  it('does not suggest creating a plan in light mode', async () => {
    const run = await runCli(root, ['init', '--yes', '--light']);
    expect(run.code).toBe(0);
    expect(run.stdout + run.stderr).not.toContain('plan init');
  });
  it('keeps the plan hint for a full install', async () => {
    const run = await runCli(root, ['init', '--yes', '--no-light']);
    expect(run.stdout).toContain('\nNext step: run context-brake plan init to create task plan.\n');
  });
  it('drops the plan hint when a plain run lands in light mode (FR-07)', async () => {
    const run = await runCli(root, ['init', '--yes']);
    expect(run.stdout + run.stderr).not.toContain('plan init');
  });
});
