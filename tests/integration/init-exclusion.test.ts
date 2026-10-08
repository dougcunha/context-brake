import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { installReportSchema } from '../../src/core/contracts/diagnostics.js';
import { runInProcessCli } from '../helpers/in-process-cli.js';

const CONFIG_FILE = 'context-brake.config.json';
const CODEX_HOOK = '.codex/hooks/context-brake.mjs';

async function exists(path: string): Promise<boolean> {
  return stat(path).then(() => true).catch(() => false);
}

async function seedClaudeAndCodex(root: string): Promise<void> {
  await mkdir(join(root, '.claude'), { recursive: true });
  await mkdir(join(root, '.codex'), { recursive: true });
  await writeFile(join(root, '.claude/settings.json'), '{\n}\n', 'utf8');
  await writeFile(join(root, '.codex/hooks.json'), '{\n}\n', 'utf8');
}

async function readConfig(root: string): Promise<{ activeHarnesses: string[]; excludedHarnesses?: string[] }> {
  return JSON.parse(await readFile(join(root, CONFIG_FILE), 'utf8')) as { activeHarnesses: string[]; excludedHarnesses?: string[] };
}

describe('FR-05, FR-06, FR-07 persistent harness exclusion (prd-15)', () => {
  let root: string;
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-t05-')); await seedClaudeAndCodex(root); });
  afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('persists the exclusion and does not install the harness (FR-05, TC-13)', async () => {
    expect((await runInProcessCli(['init', '--yes', '--exclude-harness', 'codex-cli'], root)).code).toBeLessThanOrEqual(1);
    const config = await readConfig(root);
    expect(config.activeHarnesses).toEqual(['claude-code']);
    expect(config.excludedHarnesses).toEqual(['codex-cli']);
    expect(await exists(join(root, CODEX_HOOK))).toBe(false);
  });
  it('a plain init keeps the harness off and plans nothing, twice (FR-06, NFR-01, TC-13)', async () => {
    await runInProcessCli(['init', '--yes', '--exclude-harness', 'codex-cli'], root);
    const before = await readFile(join(root, CONFIG_FILE), 'utf8');
    expect((await runInProcessCli(['init', '--yes'], root)).code).toBeLessThanOrEqual(1);
    const report = installReportSchema.parse(JSON.parse((await runInProcessCli(['init', '--dry-run', '--json'], root)).stdout));
    expect(await readFile(join(root, CONFIG_FILE), 'utf8')).toBe(before);
    expect(report.plan.changes).toEqual([]);
    expect(report.detections.find((item) => item.harness === 'codex-cli')?.state).toBe('excluded');
    expect(await exists(join(root, CODEX_HOOK))).toBe(false);
  });
});

describe('FR-07 including an excluded harness again (prd-15)', () => {
  let root: string;
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-t05-inc-')); await seedClaudeAndCodex(root); });
  afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('--harness clears the exclusion and installs the harness (FR-07, TC-14)', async () => {
    await runInProcessCli(['init', '--yes', '--exclude-harness', 'codex-cli'], root);
    expect((await runInProcessCli(['init', '--yes', '--harness', 'codex-cli'], root)).code).toBeLessThanOrEqual(1);
    const config = await readConfig(root);
    expect(config.activeHarnesses).toEqual(['claude-code', 'codex-cli']);
    expect('excludedHarnesses' in config).toBe(false);
    expect(await exists(join(root, CODEX_HOOK))).toBe(true);
  });
  it('rejects the same harness in both flags as an argument error (FR-07, TC-14)', async () => {
    const result = await runInProcessCli(['init', '--yes', '--harness', 'codex-cli', '--exclude-harness', 'codex-cli'], root);
    expect(result.code).toBe(64);
    expect(await exists(join(root, CONFIG_FILE))).toBe(false);
  });
});
