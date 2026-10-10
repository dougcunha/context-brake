import { appendFile, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { installReportSchema, type InstallReport } from '../../src/core/contracts/diagnostics.js';
import { runInProcessCli } from '../helpers/in-process-cli.js';

const CODEX_HOOK = '.codex/hooks/context-brake.mjs';
const CODEX_CONFIG = '.codex/hooks.json';
const CONFIG_FILE = 'context-brake.config.json';
const BROKEN_HOOKS = '{\n  "broken": \n';

async function exists(path: string): Promise<boolean> {
  return stat(path).then(() => true).catch(() => false);
}

async function installBoth(root: string): Promise<void> {
  await mkdir(join(root, '.claude'), { recursive: true });
  await mkdir(join(root, '.codex'), { recursive: true });
  await writeFile(join(root, '.claude/settings.json'), '{\n}\n', 'utf8');
  await writeFile(join(root, CODEX_CONFIG), '{\n}\n', 'utf8');
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

  it('keeps the harness active and its unparsable file untouched, then removes it on retry (FR-05, TC-15)', async () => {
    const valid = await readFile(join(root, CODEX_CONFIG), 'utf8');
    await writeFile(join(root, CODEX_CONFIG), BROKEN_HOOKS, 'utf8');
    const report = await reportOf(root, ['init', '--yes', '--exclude-harness', 'codex-cli']);
    expect(report.findings.some((finding) => finding.code === 'INVALID_HARNESS_CONFIG')).toBe(true);
    expect(await readFile(join(root, CODEX_CONFIG), 'utf8')).toBe(BROKEN_HOOKS);
    expect(await configOf(root)).toMatchObject({ excludedHarnesses: ['codex-cli'], activeHarnesses: expect.arrayContaining(['codex-cli']) });
    await writeFile(join(root, CODEX_CONFIG), valid, 'utf8');
    await runInProcessCli(['init', '--yes'], root);
    expect((await configOf(root)).activeHarnesses).toEqual(['claude-code']);
    expect(await exists(join(root, CODEX_HOOK))).toBe(false);
  });
  it('does not delete a runtime asset the user modified and reports it (FR-05, TC-15)', async () => {
    await appendFile(join(root, CODEX_HOOK), '// user edit\n');
    const edited = await readFile(join(root, CODEX_HOOK), 'utf8');
    const report = await reportOf(root, ['init', '--yes', '--exclude-harness', 'codex-cli']);
    expect(report.findings.some((finding) => finding.code === 'MODIFIED_OWNED_ASSET')).toBe(true);
    expect(await readFile(join(root, CODEX_HOOK), 'utf8')).toBe(edited);
    expect((await configOf(root)).activeHarnesses).toContain('codex-cli');
  });
});
