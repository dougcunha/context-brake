import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runBuiltCli } from './cli-runner.js';

describe('E2E-05: Invalid adapter input yields partial installation (CA-06)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-e2e-05-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('yields partial installation on invalid adapter input', async () => {
    await mkdir(join(tempDir, '.claude'), { recursive: true });
    await mkdir(join(tempDir, '.cursor'), { recursive: true });
    await writeFile(join(tempDir, '.claude/settings.json'), '{\n  "hooks": {}\n}\n', 'utf8');
    await writeFile(join(tempDir, '.cursor/hooks.json'), '{ invalid json', 'utf8');
    const result = await runBuiltCli(['init', '--yes'], tempDir);
    expect(result.code).toBe(2);
    expect(result.stderr).toContain('.cursor/hooks.json');
    const claudeHookExists = await stat(join(tempDir, '.claude/hooks/context-brake.mjs')).then(() => true).catch(() => false);
    expect(claudeHookExists).toBe(true);
    const cursorContent = await readFile(join(tempDir, '.cursor/hooks.json'), 'utf8');
    expect(cursorContent).toBe('{ invalid json');
  });
});

describe('E2E-06: Dry-run then confirmed run match (CA-11)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-e2e-06-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('matches changes between dry-run and applied run', async () => {
    await mkdir(join(tempDir, '.claude'), { recursive: true });
    await writeFile(join(tempDir, '.claude/settings.json'), '{\n  "hooks": {}\n}\n', 'utf8');
    const dryResult = await runBuiltCli(['init', '--dry-run', '--json'], tempDir);
    expect(dryResult.code).toBe(0);
    const dryDoc = JSON.parse(dryResult.stdout) as { plan: { changes: Array<{ path: string }> } };
    expect(dryDoc.plan.changes.length).toBeGreaterThan(0);
    const configExists = await stat(join(tempDir, 'context-brake.config.json')).then(() => true).catch(() => false);
    expect(configExists).toBe(false);
    const applyResult = await runBuiltCli(['init', '--yes', '--json'], tempDir);
    expect(applyResult.code).toBe(0);
    const applyDoc = JSON.parse(applyResult.stdout) as { plan: { changes: Array<{ path: string }> } };
    expect(applyDoc.plan.changes.map((c) => c.path)).toEqual(dryDoc.plan.changes.map((c) => c.path));
    const configExistsNow = await stat(join(tempDir, 'context-brake.config.json')).then(() => true).catch(() => false);
    expect(configExistsNow).toBe(true);
  });
});
