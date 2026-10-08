import { appendFile, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { installReportSchema, type InstallReport } from '../../src/core/contracts/diagnostics.js';
import { runInProcessCli } from '../helpers/in-process-cli.js';

const CODEX_HOOK = '.codex/hooks/context-brake.mjs';
const CONFIG_FILE = 'context-brake.config.json';

async function exists(path: string): Promise<boolean> {
  return stat(path).then(() => true).catch(() => false);
}

async function installBoth(root: string): Promise<void> {
  await mkdir(join(root, '.claude'), { recursive: true });
  await mkdir(join(root, '.codex'), { recursive: true });
  await writeFile(join(root, '.claude/settings.json'), '{\n}\n', 'utf8');
  await writeFile(join(root, '.codex/hooks.json'), '{\n}\n', 'utf8');
  await runInProcessCli(['init', '--yes'], root);
}

async function configOf(root: string): Promise<{ activeHarnesses: string[]; excludedHarnesses?: string[] }> {
  return JSON.parse(await readFile(join(root, CONFIG_FILE), 'utf8')) as { activeHarnesses: string[]; excludedHarnesses?: string[] };
}

async function reportOf(root: string, args: readonly string[]): Promise<InstallReport> {
  return installReportSchema.parse(JSON.parse((await runInProcessCli([...args, '--json'], root)).stdout));
}

describe('FR-05 exclusion conflicts and edges (prd-15, TC-15)', () => {
  let root: string;
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-t06-edge-')); await installBoth(root); });
  afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('keeps the harness active when its file cannot be parsed, then removes it on retry (FR-05, TC-15)', async () => {
    const valid = await readFile(join(root, '.codex/hooks.json'), 'utf8');
    await writeFile(join(root, '.codex/hooks.json'), '{\n  "broken": \n', 'utf8');
    const report = await reportOf(root, ['init', '--yes', '--exclude-harness', 'codex-cli']);
    expect(report.findings.some((finding) => finding.code === 'INVALID_HARNESS_CONFIG')).toBe(true);
    expect(await configOf(root)).toMatchObject({ excludedHarnesses: ['codex-cli'], activeHarnesses: expect.arrayContaining(['codex-cli']) });
    await writeFile(join(root, '.codex/hooks.json'), valid, 'utf8');
    await runInProcessCli(['init', '--yes'], root);
    expect((await configOf(root)).activeHarnesses).toEqual(['claude-code']);
    expect(await exists(join(root, CODEX_HOOK))).toBe(false);
  });
  it('does not delete a runtime asset the user modified and reports it (FR-05, TC-15)', async () => {
    await appendFile(join(root, CODEX_HOOK), '// user edit\n');
    const report = await reportOf(root, ['init', '--yes', '--exclude-harness', 'codex-cli']);
    expect(report.findings.some((finding) => finding.code === 'MODIFIED_OWNED_ASSET')).toBe(true);
    expect(await exists(join(root, CODEX_HOOK))).toBe(true);
    expect((await configOf(root)).activeHarnesses).toContain('codex-cli');
  });
  it('warns that every detected harness is excluded when nothing else changes (FR-06, TC-15)', async () => {
    await runInProcessCli(['init', '--yes', '--exclude-harness', 'codex-cli', '--exclude-harness', 'claude-code'], root);
    const report = await reportOf(root, ['init']);
    const finding = report.findings.find((item) => item.code === 'NO_PROJECT_HARNESS');
    expect(finding?.message).toBe('All detected harnesses are excluded by configuration.');
    expect(report.exitCode).toBe(1);
  });
});
