import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { installReportSchema, type InstallReport } from '../../src/core/contracts/diagnostics.js';
import { runInProcessCli } from '../helpers/in-process-cli.js';

const CODEX_HOOK = '.codex/hooks/context-brake.mjs';
const CODEX_CONFIG = '.codex/hooks.json';
const CLAUDE_HOOK = '.claude/hooks/context-brake.mjs';
const CLAUDE_SETTINGS = '.claude/settings.json';
const USER_HOOKS_FIXTURE = join(import.meta.dirname, '../fixtures/harnesses/codex-cli/user-hooks.json');

async function exists(path: string): Promise<boolean> {
  return stat(path).then(() => true).catch(() => false);
}

async function read(root: string, path: string): Promise<string> {
  return readFile(join(root, path), 'utf8');
}

async function installBoth(root: string): Promise<void> {
  await mkdir(join(root, '.claude'), { recursive: true });
  await mkdir(join(root, '.codex'), { recursive: true });
  await writeFile(join(root, CLAUDE_SETTINGS), '{\n}\n', 'utf8');
  await writeFile(join(root, CODEX_CONFIG), await readFile(USER_HOOKS_FIXTURE, 'utf8'), 'utf8');
  expect((await runInProcessCli(['init', '--yes'], root)).code).toBeLessThanOrEqual(1);
}

async function jsonReport(root: string, args: readonly string[]): Promise<InstallReport> {
  return installReportSchema.parse(JSON.parse((await runInProcessCli([...args, '--json'], root)).stdout));
}

describe('FR-05 excluding an installed harness deletes its artifacts (prd-15, TC-11)', () => {
  let root: string;
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-t06-')); await installBoth(root); });
  afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('previews the deletions, applies them keeping the user hooks and other harnesses byte-for-byte, and plans nothing on a later run (FR-05, FR-06, NFR-01, TC-11)', async () => {
    const claudeBefore = await read(root, CLAUDE_SETTINGS);
    const preview = await jsonReport(root, ['init', '--dry-run', '--exclude-harness', 'codex-cli']);
    const previewed = preview.plan.changes.map((change) => `${change.kind}:${change.path}`);
    const hookAfterPreview = await exists(join(root, CODEX_HOOK));
    expect((await runInProcessCli(['init', '--yes', '--exclude-harness', 'codex-cli'], root)).code).toBeLessThanOrEqual(1);
    const later = await jsonReport(root, ['init', '--dry-run']);
    expect(previewed).toEqual(expect.arrayContaining([`delete:${CODEX_HOOK}`, `update:${CODEX_CONFIG}`, 'update:context-brake.config.json']));
    expect(hookAfterPreview).toBe(true);
    expect(await exists(join(root, CODEX_HOOK))).toBe(false);
    expect(await read(root, CODEX_CONFIG)).toBe(await readFile(USER_HOOKS_FIXTURE, 'utf8'));
    expect(JSON.parse(await read(root, 'context-brake.config.json'))).toMatchObject({ activeHarnesses: ['claude-code'], excludedHarnesses: ['codex-cli'] });
    expect(await read(root, '.context-brake/manifest.json')).not.toContain('codex');
    expect(await read(root, CLAUDE_SETTINGS)).toBe(claudeBefore);
    expect(await exists(join(root, CLAUDE_HOOK))).toBe(true);
    expect(later.plan.changes).toEqual([]);
  });
});
