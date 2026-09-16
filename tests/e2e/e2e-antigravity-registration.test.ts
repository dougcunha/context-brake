import { copyFile, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runBuiltCli } from './cli-runner.js';

describe('E2E Antigravity lifecycle (CR-02)', () => {
  let root: string;
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-e2e-agy-')); });
  afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('installs documented hook, diagnoses healthy, and removes cleanly', async () => {
    const file = join(root, '.agents/hooks.json');
    await mkdir(join(root, '.agents'), { recursive: true });
    await copyFile('tests/fixtures/harnesses/antigravity-cli/user-hooks.json', file);
    const r1 = await runBuiltCli(['init', '--yes'], root);
    expect(r1.code).toBe(0);

    const installed = await readFile(file, 'utf8');
    expect(installed).toContain('echo \'user antigravity hook\'');
    expect(installed).toContain('context-brake');
    expect(installed).toContain('PreToolUse');
    expect(installed).toContain('PostToolUse');

    const doc = await runBuiltCli(['doctor', '--json'], root);
    expect(doc.stdout).not.toContain('INTEGRATION_MISSING');

    const r2 = await runBuiltCli(['remove', '--yes'], root);
    expect(r2.code).toBe(0);
    const removed = await readFile(file, 'utf8');
    expect(removed).toContain('user-hook');
    expect(removed).not.toContain('context-brake');
  });
});

describe('E2E Antigravity migration (CR-02)', () => {
  let root: string;
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-e2e-agy-')); });
  afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('migrates legacy installation via init', async () => {
    const file = join(root, '.agents/hooks.json');
    await mkdir(join(root, '.agents'), { recursive: true });
    await copyFile('tests/fixtures/harnesses/antigravity-cli/legacy-hooks.json', file);
    const r1 = await runBuiltCli(['init', '--yes'], root);
    expect(r1.code).toBe(0);

    const migrated = await readFile(file, 'utf8');
    expect(migrated).toContain('context-brake');
    expect(migrated).toContain('PreToolUse');
  });
});
