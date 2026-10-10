import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PROTOCOL_PATH, readConfig, removeProject, USER_CLAUDE } from '../helpers/delegated-world.js';
import { changedPaths, createLightProject, jsonReport, PLAIN_INIT, runCli, snapshotTree, USER_AGENTS } from '../helpers/light-world.js';

const OWNED_PATHS = ['.claude/hooks/context-brake-statusline.mjs', '.claude/hooks/context-brake.mjs', '.claude/settings.json', '.claude/settings.local.json', '.context-brake/manifest.json', '.context-brake/runtime/claude-statusline.json', 'context-brake.config.json'];
const COMMANDS = ['--snapshot-command', '/sdd-snapshot', '--resume-command', '/sdd-resume'];
const CLEAR_CONFLICT = '--no-snapshot-command cannot be combined';
let root: string;
beforeEach(async () => { root = await createLightProject('cb-init-snapshot-'); });
afterEach(async () => { await removeProject(root); });

describe('init on a fresh repository (prd-12 FR-04, FR-08)', () => {
  it('previews and writes only the owned paths with the default trigger zone, then changes nothing on a second run', async () => {
    const before = await snapshotTree(root);
    expect(jsonReport(await runCli(root, ['init', '--dry-run', '--json'])).plan.changes.map((change) => change.path).sort()).toEqual(OWNED_PATHS);
    expect((await runCli(root, [...PLAIN_INIT])).code).toBe(0);
    const after = await snapshotTree(root);
    expect(changedPaths(before, after)).toEqual(OWNED_PATHS);
    expect([after['CLAUDE.md'], after['AGENTS.md'], after[PROTOCOL_PATH], after['.gitignore']]).toEqual([USER_CLAUDE, USER_AGENTS, undefined, undefined]);
    expect((await readConfig(root))['snapshot']).toEqual({ triggerZone: 'RED' });
    expect((await runCli(root, [...PLAIN_INIT])).code).toBe(0);
    expect(changedPaths(after, await snapshotTree(root))).toEqual([]);
  });
});

describe('snapshot flags (prd-12 FR-04, TC-05)', () => {
  it('writes both commands, moves the trigger zone alone keeping them, and clears them keeping the trigger zone', async () => {
    expect((await runCli(root, [...PLAIN_INIT, ...COMMANDS])).code).toBe(0);
    expect((await readConfig(root))['snapshot']).toEqual({ triggerZone: 'RED', command: '/sdd-snapshot', resumeCommand: '/sdd-resume' });
    expect((await runCli(root, [...PLAIN_INIT, '--snapshot-trigger', 'YELLOW'])).code).toBe(0);
    expect((await readConfig(root))['snapshot']).toEqual({ triggerZone: 'YELLOW', command: '/sdd-snapshot', resumeCommand: '/sdd-resume' });
    expect((await runCli(root, [...PLAIN_INIT, '--no-snapshot-command'])).code).toBe(0);
    expect((await readConfig(root))['snapshot']).toEqual({ triggerZone: 'YELLOW' });
  });
  it.each([
    [['--no-snapshot-command', '--snapshot-command', '/x'], CLEAR_CONFLICT],
    [['--no-snapshot-command', '--resume-command', '/y'], CLEAR_CONFLICT],
    [['--resume-command', '/resume'], 'snapshot.resumeCommand requires snapshot.command'],
  ])('rejects %j with exit 64 and writes nothing', async (flags, message) => {
    const before = await snapshotTree(root);
    const run = await runCli(root, [...PLAIN_INIT, ...flags]);
    expect(run.code).toBe(64);
    expect(run.stdout + run.stderr).toContain(message);
    expect(changedPaths(before, await snapshotTree(root))).toEqual([]);
  });
});
