import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { installReportSchema, type InstallReport } from '../../src/core/contracts/diagnostics.js';
import { runInProcessCli } from '../helpers/in-process-cli.js';

const CODEX_HOOK = '.codex/hooks/context-brake.mjs';
const CLAUDE_HOOK = '.claude/hooks/context-brake.mjs';

async function exists(path: string): Promise<boolean> {
  return stat(path).then(() => true).catch(() => false);
}

async function installBoth(root: string): Promise<void> {
  await mkdir(join(root, '.claude'), { recursive: true });
  await mkdir(join(root, '.codex'), { recursive: true });
  await writeFile(join(root, '.claude/settings.json'), '{\n}\n', 'utf8');
  await writeFile(join(root, '.codex/hooks.json'), '{\n}\n', 'utf8');
  expect((await runInProcessCli(['init', '--yes'], root)).code).toBeLessThanOrEqual(1);
}

async function jsonReport(root: string, args: readonly string[]): Promise<InstallReport> {
  return installReportSchema.parse(JSON.parse((await runInProcessCli([...args, '--json'], root)).stdout));
}

describe('FR-05 excluding an installed harness deletes its artifacts (prd-15, TC-11)', () => {
  let root: string;
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-t06-')); await installBoth(root); });
  afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('lists the deletions in a dry run and writes nothing (FR-05, TC-11)', async () => {
    const report = await jsonReport(root, ['init', '--dry-run', '--exclude-harness', 'codex-cli']);
    const paths = report.plan.changes.map((change) => `${change.kind}:${change.path}`);
    expect(paths).toEqual(expect.arrayContaining([`delete:${CODEX_HOOK}`, 'update:.codex/hooks.json', 'update:context-brake.config.json']));
    expect(await exists(join(root, CODEX_HOOK))).toBe(true);
  });
  it('applies the deletions, updates the manifest, and leaves other harnesses alone (FR-05, TC-11)', async () => {
    const claudeBefore = await readFile(join(root, '.claude/settings.json'), 'utf8');
    expect((await runInProcessCli(['init', '--yes', '--exclude-harness', 'codex-cli'], root)).code).toBeLessThanOrEqual(1);
    expect(await exists(join(root, CODEX_HOOK))).toBe(false);
    expect(await readFile(join(root, '.codex/hooks.json'), 'utf8')).not.toContain('context-brake');
    const manifest = await readFile(join(root, '.context-brake/manifest.json'), 'utf8');
    expect(manifest).not.toContain('codex');
    expect(await readFile(join(root, '.claude/settings.json'), 'utf8')).toBe(claudeBefore);
    expect(await exists(join(root, CLAUDE_HOOK))).toBe(true);
  });
  it('plans nothing for the harness on later runs (FR-06, NFR-01, TC-11)', async () => {
    await runInProcessCli(['init', '--yes', '--exclude-harness', 'codex-cli'], root);
    expect((await jsonReport(root, ['init', '--dry-run'])).plan.changes).toEqual([]);
  });
  it('a plain init with no exclusion plans no harness deletion (TC-11)', async () => {
    const report = await jsonReport(root, ['init', '--dry-run']);
    expect(report.plan.changes.filter((change) => change.kind === 'delete')).toEqual([]);
  });
});
