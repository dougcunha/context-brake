import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { installReportSchema, type InstallReport } from '../../src/core/contracts/diagnostics.js';
import { runBuiltCli } from './cli-runner.js';

async function exists(p: string): Promise<boolean> {
  return stat(p).then(() => true).catch(() => false);
}

function assertFinding(report: InstallReport): void {
  expect(report.status).toBe('errors');
  expect(report.exitCode).toBe(2);
  const finding = report.findings.find((f) => f.code === 'INVALID_HARNESS_CONFIG');
  expect(finding).toBeDefined();
  expect(finding?.path).toBe('.codex/hooks.json');
  expect(finding?.impact).toBe('ContextBrake left this harness installed because its configuration could not be parsed.');
  expect(finding?.remediation).toBe('Fix or restore .codex/hooks.json, then run context-brake remove again.');
}

async function assertPreservedState(root: string, corruptContent: string): Promise<void> {
  expect(await readFile(join(root, '.codex/hooks.json'), 'utf8')).toBe(corruptContent);
  expect(await exists(join(root, '.codex/hooks/context-brake.mjs'))).toBe(true);
  expect(await readFile(join(root, '.cursor/hooks.json'), 'utf8')).not.toContain('context-brake.mjs');
  expect(await exists(join(root, '.cursor/hooks/context-brake.mjs'))).toBe(false);
  expect(await exists(join(root, '.context-brake/manifest.json'))).toBe(true);
  expect(await exists(join(root, 'context-brake.config.json'))).toBe(true);
}

async function assertCleanState(root: string): Promise<void> {
  expect(await exists(join(root, '.codex/hooks/context-brake.mjs'))).toBe(false);
  expect(await readFile(join(root, '.codex/hooks.json'), 'utf8')).not.toContain('context-brake.mjs');
  expect(await exists(join(root, '.context-brake/manifest.json'))).toBe(false);
  expect(await exists(join(root, 'context-brake.config.json'))).toBe(false);
}

describe('E2E: Remove with invalid harness config isolates conflict (CR-06)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-e2e-p3-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('preserves conflicted harness while removing valid harness, then succeeds on rerun', async () => {
    await mkdir(join(tempDir, '.codex'), { recursive: true });
    await mkdir(join(tempDir, '.cursor'), { recursive: true });
    await writeFile(join(tempDir, '.codex/hooks.json'), '{\n  "hooks": {}\n}\n', 'utf8');
    await writeFile(join(tempDir, '.cursor/hooks.json'), '{\n  "version": 1\n}\n', 'utf8');
    expect((await runBuiltCli(['init', '--yes'], tempDir)).code).toBe(0);

    const validCodex = await readFile(join(tempDir, '.codex/hooks.json'), 'utf8');
    const corruptCodex = '{\n  "corrupted": \n';
    await writeFile(join(tempDir, '.codex/hooks.json'), corruptCodex, 'utf8');

    const removeRes = await runBuiltCli(['remove', '--yes', '--json'], tempDir);
    expect(removeRes.code).toBe(2);
    assertFinding(installReportSchema.parse(JSON.parse(removeRes.stdout)));
    await assertPreservedState(tempDir, corruptCodex);

    await writeFile(join(tempDir, '.codex/hooks.json'), validCodex, 'utf8');
    expect((await runBuiltCli(['remove', '--yes'], tempDir)).code).toBe(0);
    await assertCleanState(tempDir);
  });
});
