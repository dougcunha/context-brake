import { lstat, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PROTOCOL_PATH, readProjectFile, removeProject, USER_CLAUDE } from '../helpers/delegated-world.js';
import { attemptLink, requireLink } from '../helpers/link-capability.js';
import { createLightProject, FULL_INIT, jsonReport, LIGHT_INIT, runCli, snapshotTree, USER_AGENTS } from '../helpers/light-world.js';

const PLAN = '{"keep":true}\n';
const NO_EOL = '# Project\nrules';
let root: string;
beforeEach(async () => { root = await createLightProject('cb-light-switch-'); });
afterEach(async () => { await removeProject(root); });

describe('full install to light mode (TC-08, FR-09)', () => {
  it('removes the managed protocol, blocks, and .gitignore block when no state file exists', async () => {
    await runCli(root, [...FULL_INIT]);
    expect((await runCli(root, [...LIGHT_INIT])).code).toBe(0);
    const tree = await snapshotTree(root);
    expect([tree['CLAUDE.md'], tree['AGENTS.md']]).toEqual([USER_CLAUDE, USER_AGENTS]);
    expect([tree[PROTOCOL_PATH], tree['.gitignore']]).toEqual([undefined, undefined]);
  });
  it('keeps the .gitignore block and the state files while a plan exists', async () => {
    await runCli(root, [...FULL_INIT]);
    const ignore = await readProjectFile(root, '.gitignore');
    await writeFile(join(root, 'task_plan.json'), PLAN, 'utf8');
    expect((await runCli(root, [...LIGHT_INIT])).code).toBe(0);
    expect([await readProjectFile(root, '.gitignore'), await readProjectFile(root, 'task_plan.json')]).toEqual([ignore, PLAN]);
  });
  it('keeps a modified managed protocol and reports it', async () => {
    await runCli(root, [...FULL_INIT]);
    await writeFile(join(root, PROTOCOL_PATH), '# edited\n', 'utf8');
    const run = await runCli(root, [...LIGHT_INIT]);
    expect(await readProjectFile(root, PROTOCOL_PATH)).toBe('# edited\n');
    const kept = jsonReport(run).findings.find((finding) => finding.code === 'LIGHT_MODE_ASSET_KEPT');
    expect(kept).toMatchObject({ path: PROTOCOL_PATH, remediation: expect.stringContaining(`move ${PROTOCOL_PATH} before running context-brake init --no-light`) });
  });
  it('leaves an unmanaged protocol file untouched', async () => {
    await mkdir(join(root, 'docs'), { recursive: true });
    await writeFile(join(root, PROTOCOL_PATH), '# mine\n', 'utf8');
    expect((await runCli(root, [...LIGHT_INIT])).code).toBe(0);
    expect(await readProjectFile(root, PROTOCOL_PATH)).toBe('# mine\n');
  });
});

describe('light mode back to the full install (TC-08, FR-09)', () => {
  it('restores the same managed files as a fresh full install', async () => {
    const fresh = await createLightProject('cb-light-fresh-');
    try {
      await runCli(fresh, [...FULL_INIT]);
      await runCli(root, [...LIGHT_INIT]);
      expect((await runCli(root, ['init', '--yes', '--json', '--no-light'])).code).toBe(0);
      const [restored, expected] = [await snapshotTree(root), await snapshotTree(fresh)];
      for (const path of ['CLAUDE.md', 'AGENTS.md', PROTOCOL_PATH, '.gitignore', 'context-brake.config.json']) expect(restored[path]).toBe(expected[path]);
    } finally {
      await removeProject(fresh);
    }
  });
});

describe('instruction file without a trailing newline (TC-08, FR-09, codereview_01 CR-01)', () => {
  it('keeps the user bytes through full, light, and full again', async () => {
    const fresh = await createLightProject('cb-light-no-eol-');
    try {
      for (const project of [root, fresh]) await writeFile(join(project, 'CLAUDE.md'), NO_EOL, 'utf8');
      await runCli(fresh, [...FULL_INIT]);
      await runCli(root, [...FULL_INIT]);
      await runCli(root, [...LIGHT_INIT]);
      expect(await readProjectFile(root, 'CLAUDE.md')).toBe(NO_EOL);
      await runCli(root, ['init', '--yes', '--json', '--no-light']);
      expect(await readProjectFile(root, 'CLAUDE.md')).toBe(await readProjectFile(fresh, 'CLAUDE.md'));
    } finally {
      await removeProject(fresh);
    }
  });
});

describe('symlinked instruction file (TC-08, NFR-03)', () => {
  it('removes the block through the link and keeps the link', async (ctx) => {
    const target = join(root, 'shared-agents.md');
    const link = join(root, 'AGENTS.md');
    await writeFile(target, USER_AGENTS, 'utf8');
    await rm(link, { force: true });
    await requireLink(ctx, await attemptLink(target, link, 'file'), link);
    await runCli(root, [...FULL_INIT]);
    expect(await readFile(target, 'utf8')).not.toBe(USER_AGENTS);
    await runCli(root, [...LIGHT_INIT]);
    expect((await lstat(link)).isSymbolicLink()).toBe(true);
    expect(await readFile(target, 'utf8')).toBe(USER_AGENTS);
  });
});
