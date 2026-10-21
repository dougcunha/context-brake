import { readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cliErrorSchema } from '../../src/core/contracts/diagnostics.js';
import type { FixReport } from '../../src/core/contracts/fix-report.js';
import { runInProcessCli } from '../helpers/in-process-cli.js';
import { addRuntimeError, BRIDGE_SCRIPT, CLAUDE_HOOK, CONFIG_FILE, createFixWorld, fileHashes, fixJson as fixJsonAt, installClaude, makeAssetModified, makeAssetOutdated, outcomeOf, readText, removeFixWorld, STALE_HOOK_CONTENT } from '../helpers/fix-world.js';

const WATCHED = [CLAUDE_HOOK, BRIDGE_SCRIPT, CONFIG_FILE, '.context-brake/manifest.json', '.claude/settings.json'];
let root: string;

function fixJson(args: readonly string[]): Promise<FixReport> {
  return fixJsonAt(root, args);
}

beforeEach(async () => { root = await createFixWorld('cb-fix-stop-'); });
afterEach(async () => { await removeFixWorld(root); });

describe('fix that writes nothing (FR-07, FR-08, TC-14, TC-15)', () => {
  it('stops with CONFIRMATION_REQUIRED without a terminal and without --yes', async () => {
    await installClaude(root);
    await makeAssetOutdated(root);
    const hashes = await fileHashes(root, WATCHED);
    const run = await runInProcessCli(['fix'], root);
    expect([run.code, run.stderr]).toEqual([2, expect.stringContaining('CONFIRMATION_REQUIRED')]);
    expect(await fileHashes(root, WATCHED)).toEqual(hashes);
  });

  it('shows planned and skipped outcomes in a dry run and changes no file', async () => {
    await installClaude(root);
    await makeAssetOutdated(root);
    await makeAssetModified(root, BRIDGE_SCRIPT);
    const hashes = await fileHashes(root, WATCHED);
    const report = await fixJson(['--dry-run']);
    expect([report.mode, outcomeOf(report, 'ASSET_OUTDATED')?.[0], outcomeOf(report, 'ASSET_MODIFIED')?.[0]]).toEqual(['dry_run', 'planned', 'skipped']);
    expect(report.plan.changes.map((change) => change.path)).toContain(CLAUDE_HOOK);
    expect(await fileHashes(root, WATCHED)).toEqual(hashes);
  });

});

describe('fix stops (FR-11, FR-12, TC-18, TC-19, TC-25)', () => {
  it('tells the user to run init when ContextBrake is not installed', async () => {
    const report = await fixJson(['--yes']);
    expect([report.stopped, report.plan.changes]).toEqual(['not_installed', []]);
    expect((await runInProcessCli(['fix', '--yes'], root)).stdout).toContain('Run context-brake init first.');
    expect(await readdir(root)).toEqual([]);
  });

  it('lists the manual findings when nothing can be fixed', async () => {
    await installClaude(root);
    await addRuntimeError(root);
    const report = await fixJson(['--yes']);
    expect([report.stopped, report.exitCode, report.outcomes.map((item) => item.outcome)]).toEqual(['nothing_to_fix', 1, ['manual']]);
  });

  it('changes nothing when the configuration cannot be read', async () => {
    await installClaude(root);
    await makeAssetOutdated(root);
    await writeFile(join(root, CONFIG_FILE), '{', 'utf8');
    const report = await fixJson(['--yes']);
    expect([report.exitCode, outcomeOf(report, 'ASSET_OUTDATED')]).toEqual([2, ['skipped', 'context-brake.config.json cannot be read. Fix it first.']]);
    expect(await readText(root, CLAUDE_HOOK)).toBe(STALE_HOOK_CONTENT);
  });
});

describe('fix exit codes (FR-13, TC-20)', () => {
  it('exits 2 when a planned change fails', async () => {
    await installClaude(root);
    await rm(join(root, '.claude/hooks'), { recursive: true, force: true });
    await writeFile(join(root, '.claude/hooks'), 'not a directory', 'utf8');
    const report = await fixJson(['--yes']);
    expect([report.exitCode, outcomeOf(report, 'ASSET_MISSING')?.[0]]).toEqual([2, 'failed']);
  });

  it('exits 64 with a fix error document for --json without --yes', async () => {
    const run = await runInProcessCli(['fix', '--json'], root);
    expect([run.code, cliErrorSchema.parse(JSON.parse(run.stdout)).command]).toEqual([64, 'fix']);
  });
});
