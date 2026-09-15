import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AntigravityAdapter } from '../../src/infrastructure/harnesses/antigravity-cli/adapter.js';
import { ANTIGRAVITY_CONFIG_FILE, planAntigravityInstall, planAntigravityRemove } from '../../src/infrastructure/harnesses/antigravity-cli/planner.js';

describe('Antigravity install and removal (CR-02)', () => {
  let root: string;
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-agy-reg-')); });
  afterEach(async () => { await rm(root, { recursive: true, force: true }); });

  it('installs documented structure and preserves user hooks', async () => {
    const file = join(root, ANTIGRAVITY_CONFIG_FILE);
    await mkdir(join(root, '.agents'), { recursive: true });
    await copyFile('tests/fixtures/harnesses/antigravity-cli/user-hooks.json', file);
    const p1 = await planAntigravityInstall(root);
    await writeFile(file, p1.changes.find((c) => c.path === ANTIGRAVITY_CONFIG_FILE)!.content!, 'utf8');
    const s1 = await readFile(file, 'utf8');
    expect(s1).toContain('user-hook');
    expect(s1).toContain('context-brake');
    expect(s1).toContain('PreInvocation');
    expect(s1).not.toContain('PreToolUse');

    const p2 = await planAntigravityInstall(root);
    expect(p2.changes.find((c) => c.path === ANTIGRAVITY_CONFIG_FILE)?.content ?? s1).toBe(s1);

    const pr = await planAntigravityRemove(root);
    await writeFile(file, pr.changes.find((c) => c.path === ANTIGRAVITY_CONFIG_FILE)!.content!, 'utf8');
    const s2 = await readFile(file, 'utf8');
    expect(s2).toContain('user-hook');
    expect(s2).not.toContain('context-brake');
  });
});

describe('Antigravity legacy migration (CR-02)', () => {
  let root: string;
  const adapter = new AntigravityAdapter();
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-agy-reg-')); });
  afterEach(async () => { await rm(root, { recursive: true, force: true }); });

  it('migrates legacy entries and diagnoses missing or present states', async () => {
    const file = join(root, ANTIGRAVITY_CONFIG_FILE);
    await mkdir(join(root, '.agents'), { recursive: true });
    await copyFile('tests/fixtures/harnesses/antigravity-cli/legacy-hooks.json', file);
    const findingsBefore = await adapter.diagnose({ projectRoot: root });
    expect(findingsBefore.some((f) => f.code === 'INTEGRATION_MISSING')).toBe(true);

    const p1 = await planAntigravityInstall(root);
    await writeFile(file, p1.changes.find((c) => c.path === ANTIGRAVITY_CONFIG_FILE)!.content!, 'utf8');
    const s1 = await readFile(file, 'utf8');
    expect(s1).not.toContain('"hooks":');
    expect(s1).toContain('context-brake');

    await mkdir(join(root, '.agents/hooks'), { recursive: true });
    await writeFile(join(root, '.agents/hooks/context-brake.mjs'), '', 'utf8');
    const findingsAfter = await adapter.diagnose({ projectRoot: root });
    expect(findingsAfter.filter((f) => f.code === 'INTEGRATION_MISSING')).toHaveLength(0);
  });
});
